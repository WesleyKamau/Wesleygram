# Wesleygram

> *"What if everyone's profile photo was about me?"*

Wesleygram takes every account that followed (or was followed by)
[@wesleykamau](https://www.instagram.com/wesleykamau) on Instagram and
re-imagines their profile picture as… Wesley. Search for anyone, and see them
"Wesley-ified."

Built in 5 days right before my birthday. It started as a shower thought and
turned into a full pipeline: scrape the photos, run them through a custom
image model, store them, and serve them from a fast little Instagram-style web
app.

🔗 **Live:** [wesleygram.com](https://wesleygram.com)

For the story behind it, see [`DETAILS.md`](./DETAILS.md). For the gory
technical play-by-play of the scraping saga, see
[`TECHNICAL.md`](./TECHNICAL.md).

---

## How it works

```
 Instagram          Inference            Storage              Web
 ┌─────────┐        ┌──────────┐         ┌─────────┐         ┌──────────┐
 │ profile │  ───▶  │ "Wesley- │  ───▶   │ Cloud-  │  ───▶   │ Next.js  │
 │ photos  │        │  ify" w/ │         │ flare   │         │ app on   │
 │ (scrape)│        │  SDXL +  │         │ R2      │         │ Vercel   │
 └─────────┘        │  LoRA    │         └─────────┘         └──────────┘
                    └──────────┘
```

1. **Download** — Collect follower/following profile photos in source quality
   via Instagram's GraphQL endpoint (no friendly API exists — see the
   write-up). Metadata lands in `profiles_metadata.json`.
2. **Wesley-ify** — Run each photo through an SDXL + LoRA pipeline fine-tuned
   on Wesley. Two model versions exist per profile (`v1`, `v2`); the app
   prefers `v2`.
3. **Store** — Originals and processed images are uploaded to Cloudflare R2.
4. **Serve** — A Next.js app lets you search profiles and flip between the
   original and Wesley-ified photo.

---

## Repository layout

| Path | What's inside |
|------|---------------|
| [`web/`](./web) | The Next.js web app (the thing at wesleygram.com). |
| [`inference/`](./inference) | ML notebooks & scripts — LoRA training, SDXL config, local inference. |
| [`instagram_downloader/`](./instagram_downloader) | Python tooling to scrape profile data/photos and sync to R2. |
| [`web/src/data/profiles_metadata.json`](./web/src/data/profiles_metadata.json) | The dataset the site reads: every profile + its image keys and flags. |
| `download_featured_images.py` | Pull source-quality processed images for featured profiles. |
| `generate_collage_frames.py` | Generate collage frames from the processed set. |

---

## The web app

A mobile-first, Instagram-styled SPA built to feel like a native app you
installed rather than a web page.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Framer Motion · Embla Carousel · `sharp` · Cloudflare R2 (S3 API) · deployed on
Vercel.

### Getting started

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000
```

Create `web/.env.local` with the Cloudflare R2 credentials used to sign and
fetch images:

```bash
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=...

# Optional: absolute base URL used for metadata / Open Graph tags
NEXT_PUBLIC_SITE_URL=https://wesleygram.com
```

Without R2 credentials the app still runs, but profile images won't load.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server. |
| `pnpm build` | Production build. |
| `pnpm start` | Serve the production build. |
| `pnpm lint` | Run ESLint. |
| `pnpm cache-og-images` | Pre-cache Open Graph images. |
| `pnpm generate-blur` | Precompute base64 blur-up placeholders into the metadata (needs R2 creds). |

### How images are served

Profiles live in a single bundled `profiles_metadata.json`, looked up by
Instagram ID (with username fallback). Images themselves are private in R2 and
served through `/api/image`:

- **Thumbnails** (`?key=…&w=320`) — fetched from R2 and resized to a small
  square WebP with `sharp`, then cached. A full-res source becomes a couple of
  KB, which keeps the homepage's ~120 carousel cards light.
- **Full resolution** (`?key=…`) — a short-lived presigned redirect to R2. The
  profile page resolves these on the server so the hero image paints without an
  extra round-trip.

The app is also wired for **blur-up placeholders**: `pnpm generate-blur`
precomputes a tiny base64 preview of each image into the metadata, shown blurred
while the full image loads. *These aren't currently populated* — until
`generate-blur` is run, images fall back to a loading skeleton.

### Notes on the "native" feel

A few deliberate touches make it read like an installed app: a PWA manifest +
theme-color so the status bar blends in, safe-area insets for notch/home-bar
devices, no tap-highlight flash, contained overscroll, an instant loading
skeleton on navigation, and a route-level slide transition that animates the
*skeleton* in immediately rather than waiting for content.

---

## Credits

- **Wesley Kamau** ([@wesleykamau](https://www.instagram.com/wesleykamau)) —
  idea, code, model, late nights.
- **[@dehliaferrante](https://www.instagram.com/dehliaferrante)** — logo.

This was a fun, personal project. The scraping was done with a throwaway
account on a one-time basis against my own follow graph; please don't use it as
a blueprint for scraping Instagram at scale.
