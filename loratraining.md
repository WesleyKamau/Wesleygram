## Plan: SDXL LoRA Fine-Tuning for Face Replacement

Train a LoRA on your photos to enable realistic face swapping in Instagram-style profile pictures, using SDXL as the base model.

### TL;DR
Use **Google Colab Pro** (A100/L4 GPU) with **kohya_ss** for SDXL LoRA training overnight. Your RTX 3070's 8GB VRAM is too constrained for SDXL—Colab's 40GB+ A100 allows larger batch sizes, faster iterations, and no risk of OOM crashes. With 70 images, train for ~2800-3200 steps (hard stop at 3500) with a trigger token like `wesley_kamau`.

---

### Quick Start Checklist

- [x] **69 subject images** prepared (`LoRA Photos/train/wesley/`)
- [x] **100 regularization images** prepared (`LoRA Photos/train/person/`)
- [x] **Caption files** created for all subject images
- [x] **Colab notebook** ready: `train_lora_colab.ipynb`
- [ ] Upload `LoRA Photos/train/` folder to Google Drive
- [ ] Open notebook in Colab Pro, select A100 runtime
- [ ] Run all cells, wait ~6-8 hours
- [ ] Download trained LoRA from `output/` folder

---

### Steps

1. **Preprocess Dataset** — Your 70 photos at 2kx2k resolution are ideal (higher detail than 1024px minimum). Ensure consistent cropping centered on face—kohya_ss will auto-bucket to 1024x1024 during training while preserving quality. Verify varied lighting/angles/expressions across the set.

2. **Prepare Regularization Images** — Collect 100-200 generic person images (diverse races, ages, genders) to prevent the model from associating *all* people with your face ("prior preservation"). Caption all regularization images as `person` only — **never include your trigger token**. This improves flexibility across different lighting/poses/backgrounds.

3. **Set Up Colab Environment** — Clone [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts), install dependencies, mount Google Drive for dataset and output checkpoints.

4. **Configure Training Parameters** — Use these recommended SDXL LoRA settings:
   - **Base model**: `stabilityai/stable-diffusion-xl-base-1.0`
   - **Network rank (dim)**: 32-64 (higher = more capacity, 32 is usually enough for faces)
   - **Network alpha**: 16-32 (half of rank is common)
   - **Learning rate**: `1e-4` (with cosine scheduler)
   - **Batch size**: 4-6 (A100 can handle this)
   - **Steps**: 2800-3200 (target), hard stop at ~3500 (diminishing returns and overfitting risk beyond this)
   - **Resolution**: 1024x1024 (auto-bucketed from your 2k images)
   - **Repeats**: 4-6 per image (70 images × 5 repeats = 350 effective samples, sufficient for strong generalization)
   - **Mixed precision**: fp16 (reduces memory, improves stability)
   - **Min-SNR gamma**: 5 (prevents overfitting, improves lighting robustness)
   - **Noise offset**: 0.05-0.1 (prevents "plastic" or fried faces at higher steps)
   - **Gradient checkpointing**: Optional but recommended for stability

5. **Captioning Strategy** — Use format: `wesley_kamau, person, male, [description of scene/lighting/expression]`. The trigger token `wesley_kamau` becomes your identity anchor. Consider using BLIP or WD14 tagger for base captions, then prepend your trigger.

6. **Run Overnight Training** — Launch training before bed (~6-8 hours, enough for 2800-3200 steps at batch size 4-6). Save checkpoints every 500 steps to evaluate intermediate results. With 70 images, you'll see convergence around 2500-3000 steps. Stop at 3500 max to avoid overfitting (faces become too sharp/uncanny, lose flexibility).

7. **Evaluate & Iterate** — Test with prompts like `wesley_kamau, person, male, professional headshot, soft lighting, instagram profile photo style` and compare against reference photos for likeness accuracy.

---

### Further Considerations

1. **Colab vs Local?** Colab Pro is strongly recommended—RTX 3070 (8GB) requires aggressive memory optimizations (gradient checkpointing, batch size 1, fp16) that slow training 3-4x and risk OOM. A100 (40GB) trains comfortably at full speed.

2. **Face-swap workflow?** After LoRA training, consider pairing with **IP-Adapter Face ID** or **ReActor** for the actual replacement step—LoRA captures your likeness, these tools handle the compositing onto target images. Want me to include this in the plan?

---

### Files

| File | Purpose |
|------|---------|
| `train_lora_colab.ipynb` | Google Colab notebook for training |
| `LoRA Photos/train/wesley/` | 69 subject images + captions |
| `LoRA Photos/train/person/` | 100 regularization images |
| `convert_lora_photos.py` | HEIC → JPG conversion script |
| `organize_lora_photos.ps1` | Photo organization script |
