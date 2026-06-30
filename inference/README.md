# Wesleygram — Inference (SDXL + LoRA "Wesley-ify")

The ML pipeline that turns a scraped Instagram profile photo into a "Wesley-ified"
version: a face/body swap onto the original image using an SDXL LoRA fine-tuned on
photos of Wesley, applied via SDXL inpainting.

## Components

| File | What it is |
|------|------------|
| `Lora_Trainer_XL.ipynb` | Colab notebook that trains the SDXL LoRA (kohya / Hollowstrawberry XL trainer). Output: `wesleygram-NN.safetensors`. |
| `wesleygram_inference.ipynb` | **Canonical** Colab pipeline: fetch from R2 → SAM segment → BLIP pose-detect → SDXL inpaint+refine → upload back to R2. Batch-processes the follower list. |
| `loratraining.md` | Training plan and hyperparameters. |
| `local_inference.py` | Lightweight **local smoke test** only — plain text→image SDXL+LoRA. Does **not** reproduce site images (no segmentation/inpainting). |
| `requirements.txt` | Python dependencies. |
| `.env.example` | Template for the R2 credentials the notebook needs. |

## End-to-end run

1. **Train the LoRA** — `Lora_Trainer_XL.ipynb` on Colab (A100/L4). Trigger token: `wesley_kamau`. See `loratraining.md`. Result: `wesleygram-NN.safetensors` on Google Drive.
2. **Provide the weight** — the inference notebook expects it on Drive (e.g. `…/Loras/wesleygram/output/wesleygram-25.safetensors`); `local_inference.py` takes a local path via `--lora <path>` or `$LORA_PATH` (default `test/wesleygram-10.safetensors`). **The `.safetensors` weights are not committed** — supply your own.
3. **Set R2 secrets** — copy `.env.example` → `.env` (local) or set them via Colab `userdata`. Never commit real keys.
4. **Run `wesleygram_inference.ipynb`** — pulls originals from R2, segments the person (SAM `vit_h`), detects pose (BLIP-VQA), inpaints with SDXL base+refiner+LoRA (strength 0.65 headshot / 0.70 full-body, guidance 8.0, LoRA scale 0.95, high-noise-frac 0.95, 40 steps, 1024px), and uploads results back to R2.

## Local smoke test

```bash
pip install -r requirements.txt
python local_inference.py --lora path/to/wesleygram.safetensors \
  --prompt "wesley_kamau, person, male, instagram profile photo"
```

## ⚠️ Secrets

Keep `.env` out of git (it is gitignored) and never print credentials into notebook
output. The notebooks in this repo are kept output-free; if keys ever land in a
committed cell output, rotate them and strip the notebook.
