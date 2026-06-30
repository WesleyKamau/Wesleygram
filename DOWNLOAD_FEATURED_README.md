# Featured Images Downloader

This script downloads all featured processed images from the profiles metadata in source quality.

## Features

- Downloads v2 processed images (highest quality) for all featured profiles
- Falls back to v1 or original images if v2 is not available
- Names files with zero-padded sequential numbers (`0001.png`, `0002.png`, …) in randomized order, and writes a `username_mapping.json` mapping each number back to its username
- Skips already downloaded files
- Saves to a gitignored `featured_images/` folder
- Provides detailed progress output

## Usage

```bash
python download_featured_images.py
```

## Requirements

- Python 3.7+
- boto3 (already in requirements.txt)
- R2 credentials configured in `instagram_downloader/.env`:
  - `R2_ENDPOINT_URL` or `R2_ENDPOINT`
  - `R2_ACCESS_KEY_ID` or `R2_ACCESS_KEY`
  - `R2_SECRET_ACCESS_KEY` or `R2_SECRET_KEY`
  - `R2_BUCKET_NAME` or `R2_BUCKET` (defaults to 'instagram-profiles')

## Output

Images are saved to `featured_images/` with zero-padded sequential filenames (e.g., `0001.png`, `0002.png`) in randomized order. The number→username map is written to `featured_images/username_mapping.json`.

The folder is automatically gitignored to prevent committing large binary files.
