from pathlib import Path
import os
import argparse

from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler
import torch

# LoRA path can be overridden with env var LORA_PATH
# Default to your relative path
LORA_PATH = "test/wesleygram-10.safetensors"

parser = argparse.ArgumentParser(description="SDXL LoRA inference")
parser.add_argument("--prompt", type=str, default="wesley_kamau, person, male, professional headshot, soft lighting, instagram profile photo")
parser.add_argument("--neg", type=str, default="blurry, distorted, bad anatomy, extra limbs, ugly")
parser.add_argument("--width", type=int, default=None)
parser.add_argument("--height", type=int, default=None)
parser.add_argument("--steps", type=int, default=None)
parser.add_argument("--guidance", type=float, default=7.0)
parser.add_argument("--seed", type=int, default=42)
args = parser.parse_args()

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32

pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=dtype,
    use_safetensors=True,
    resume_download=True,
)

if device == "cuda":
    pipe.to("cuda")
    torch.backends.cudnn.benchmark = True
    # Try to enable xformers for faster attention if available
    try:
        pipe.enable_xformers_memory_efficient_attention()
        print("xFormers attention: enabled")
    except Exception as e:
        print(f"xFormers not enabled: {e}")
    # Try to compile UNet for speed (PyTorch 2.x)
    try:
        pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead", fullgraph=False)
        print("torch.compile on UNet: enabled")
    except Exception as e:
        print(f"torch.compile not enabled: {e}")
else:
    pipe.enable_attention_slicing()  # reduce RAM on CPU
    # Deprecated wrapper replaced with direct VAE slicing
    pipe.vae.enable_slicing()        # further reduce RAM on CPU

pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

lora_path = Path(LORA_PATH)
if not lora_path.exists():
    raise FileNotFoundError(f"LoRA not found at {lora_path}")

# SDXL requires directory + weight name
pipe.load_lora_weights(lora_path.parent, weight_name=lora_path.name)

prompt = args.prompt
neg = args.neg

# Prefer smaller resolution to fit in 8GB GPUs and CPU
default_w = 512 if device == "cuda" else 512
default_h = 512 if device == "cuda" else 512
default_steps = 16 if device == "cuda" else 15
width = args.width or default_w
height = args.height or default_h
steps = args.steps or default_steps
print(f"Running on {device} with {width}x{height}, steps={steps}, guidance={args.guidance}")

generator = torch.Generator(device=device).manual_seed(args.seed)
with torch.inference_mode():
    image = pipe(
        prompt=prompt,
        negative_prompt=neg,
        num_inference_steps=steps,
        guidance_scale=args.guidance,
        width=width,
        height=height,
        generator=generator,
    ).images[0]

out_path = "inference_output.png"
image.save(out_path)
print(f"Saved {out_path}")
