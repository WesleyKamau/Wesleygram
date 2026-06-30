# Instagram Profile Collector

A modular, anonymous Python CLI that collects Instagram profile metadata and HD
profile pictures (no authentication, no Playwright) and optionally uploads the
originals to Cloudflare R2. This is the data-collection stage of the Wesleygram
pipeline.

**Entry point:** `main_refactored.py`. (The old Playwright `main.py` has been removed.)

## Install

```bash
python -m venv ../.venv
../.venv/Scripts/activate      # Windows;  source ../.venv/bin/activate on Linux/Mac
pip install -r requirements.txt
```

## Input: `data/ids.json`

The tool reads a consolidated `data/ids.json` (override with `--ids-file`) containing the
followers and following lists with Instagram IDs:

```json
{
  "followers": [{ "username": "someone", "id": "123456789" }],
  "following": [{ "username": "another", "id": "987654321" }]
}
```

> Note: no script in this repo currently generates `ids.json` — it is produced externally
> (e.g. a browser-console export). Documenting/automating that step is tracked in the root
> `TODO.md`.

## Download methods

- **`instascraper`** (default) — via Instaloader. Stable, anonymous, 1–2 requests/profile.
- **`graphql`** (experimental) — direct calls to Instagram's GraphQL endpoint. Faster (HD,
  single request) but rate-limited more aggressively.

## Usage

```bash
# Process 50 followers (Instascraper), save images locally
python main_refactored.py --mode followers --limit 50

# Process following via GraphQL, larger delays
python main_refactored.py --mode following --method graphql --delay 5 10

# Metadata only (no image download)
python main_refactored.py --mode followers --no-images

# Download AND upload originals to Cloudflare R2
python main_refactored.py --mode both --upload-r2

# Dry run (no writes/uploads) + HTML per-profile reports
python main_refactored.py --mode followers --limit 10 --dry-run --test-html
```

### CLI options

| Flag | Description |
|------|-------------|
| `--mode {followers,following,both}` | Which list to process (default: followers) |
| `--method {instascraper,graphql}` | Download method (default: instascraper) |
| `--limit N` | Max profiles to process (default: all) |
| `--skip-existing` / `--no-skip-existing` | Skip / reprocess profiles already in metadata (default: skip) |
| `--no-images` | Metadata only, don't download pictures |
| `--delay MIN MAX` | Per-request delay range, seconds (default: 2 5) |
| `--intra-delay S` | Extra delay between API fetch and image download |
| `--username U` | Target account whose lists are processed (default: wesleykamau) |
| `--output-dir DIR` | Where to save photos (default: ./profile_photos) |
| `--upload-r2` | Upload originals to Cloudflare R2 (needs `.env`) |
| `--ids-file PATH` | Path to ids.json (default: ./data/ids.json) |
| `--test-html` / `--html-output-dir DIR` | Emit HTML per-profile reports |
| `--dry-run` | Simulate; no writes, uploads, or metadata changes |
| `--clear-metadata` | Clear profiles_metadata.json (prompts) |

## Cloudflare R2 (for `--upload-r2`)

Copy `.env.example` → `.env` and fill in your R2 credentials (the file is gitignored —
never commit real keys). Both long (`R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, …) and short
(`R2_ENDPOINT`, `R2_ACCESS_KEY`, …) variable names are accepted.

## Output: `data/profiles_metadata.json`

Profiles are keyed by Instagram ID; each record holds username, full name, bio,
verification/private flags, follower/following/post counts, the local image path, a
SHA-256 image hash, R2 keys (when uploaded), and processing status. Writes are atomic
(temp + backup → `os.replace`).

## Rate limiting & safety

Anonymous requests are throttled with a random `--delay` between profiles. GraphQL hits
Instagram's limits harder — use longer delays and small `--limit`s. Scraping Instagram may
violate their Terms of Service; use responsibly and only on your own data.

## License

See [LICENSE](../LICENSE) in the repo root (MIT).
