# Stable Diffusion XL — reference

> This was previously a verbatim copy of the HuggingFace diffusers SDXL guide.
> Read the upstream docs instead: https://huggingface.co/docs/diffusers/using-diffusers/sdxl

## What Wesleygram actually uses

The "Wesley-ify" step is **SDXL inpainting** (base + refiner) with our LoRA, run from
`wesleygram_inference.ipynb`. The project's chosen parameters:

| Parameter | Value |
|-----------|-------|
| Base model | `stabilityai/stable-diffusion-xl-base-1.0` |
| Refiner | `stabilityai/stable-diffusion-xl-refiner-1.0` |
| LoRA trigger | `wesley_kamau` |
| LoRA scale | 0.95 |
| Strength | 0.65 (headshot) / 0.70 (full-body) |
| Guidance | 8.0 |
| High-noise frac | 0.95 |
| Steps | 40 |
| Resolution | 1024×1024 |
| Person mask | segment-anything (SAM `vit_h`) |
| Pose detection | BLIP-VQA (`Salesforce/blip-vqa-base`) |

See `README.md` for the full pipeline and `loratraining.md` for training settings.
