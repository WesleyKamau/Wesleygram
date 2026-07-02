# Wesleygram — Web

The public Next.js app at [wesleygram.com](https://wesleygram.com): search the ~3,300
scraped profiles and flip each between the original photo and its "Wesley-ified" version.
This is the `web/` package of the [Wesleygram monorepo](../README.md) — see the root README
for the full pipeline (scrape → SDXL+LoRA → R2 → here).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
Embla Carousel · Framer Motion · `sharp` · `@aws-sdk` (Cloudflare R2 via the S3 API) ·
next-themes · sonner · @vercel/analytics. Package manager: **pnpm**. Deployed on Vercel.

## Getting started

```bash
cd web
pnpm install
pnpm dev            # http://localhost:3000
```

### Environment

Create `web/.env.local` with the Cloudflare R2 credentials used to sign and fetch images:

```bash
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=images-original

# Optional: absolute base URL for metadata / Open Graph tags (defaults to wesleygram.com)
NEXT_PUBLIC_SITE_URL=https://wesleygram.com
```

`.env*` is gitignored — never commit real keys. Without R2 credentials the app still runs,
but profile images won't load.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server (Turbopack). |
| `pnpm build` | Production build. |
| `pnpm start` | Serve the production build. |
| `pnpm lint` | Run ESLint. |
| `pnpm test` | Run the vitest unit suite (lib/search, images, homepage, profiles). |
| `pnpm cache-og-images` | Pre-cache the Open Graph collage images into `public/og-cache`. Run manually after changing featured profiles — there is no build hook. |
| `pnpm generate-blur` | Precompute base64 blur-up placeholders into the metadata (needs R2 creds). Idempotent; only fills missing ones. |

## Data

All profile data comes from a single bundled `src/data/profiles_metadata.json` — a keyed
object (`{ profiles: { <instagram_id>: {...} } }`) of ~3,300 records with usernames, names,
bios, counts, curation flags, R2 image keys (`original`, `v1`, `v2`; the app prefers `v2`),
and blur-up placeholders. There is no database.

The dataset is deliberately slim: scraper internals (local file paths, image hashes,
processing status/errors, timestamps) and the long-expired Instagram CDN
`profile_pic_url`s were stripped — the unit tests assert they never come back. The slim
search payload served by `/api/profiles` drops the server-only fields (bios ship, blur
strings don't).

## How images are served

Images are private in R2 and served through `/api/image?key=…`. Both image routes validate
`key` against the set of R2 keys known from the metadata — arbitrary bucket paths are
rejected with 404.

- **Thumbnails** (`&w=320`, from a whitelist of widths) — fetched from R2 and resized to a
  small square WebP with `sharp`, then cached. Keeps the ~120-card homepage carousel light.
- **Full resolution** (no `w`) — a short-lived presigned redirect to R2. Profile pages
  resolve these server-side so the hero image paints without an extra round-trip.

`/api/download` proxies the full-res bytes for the share/download button.

Fallback order per profile: processed (`v2` → `v1`) → R2 original → an inline silhouette
avatar. Profile pages show **blur-up placeholders** (tiny base64 previews precomputed into
the metadata by `pnpm generate-blur`) while the full image loads.

## The wordmark

The header logo is `src/components/WesleygramWordmark.tsx` — exact vector outlines of
"Wesleygram" set in Billabong (the typeface the Instagram logo is based on), shaped with
HarfBuzz and extracted from the font by `scripts/generate-wordmark.py`. It ships as inline
SVG (themeable via `currentColor`, no client font download). The OG images render the same
font from `src/app/fonts/Billabong.ttf` server-side. Billabong is freeware for personal
use (Type Associates / Russell Bean).

## Routes

| Route | Rendering | Purpose |
|-------|-----------|---------|
| `/` | static | Home: search box + auto-scrolling preview carousels. |
| `/[id]` | dynamic | Profile page by Instagram ID (username fallback → redirect). |
| `/profile/[id]` | dynamic | Redirect to `/[id]`. |
| `/search` | static shell | Full search page (`?q=`), client-ranked results + infinite scroll. |
| `/[id]/opengraph-image` | dynamic | Branded per-profile share card (photo + wordmark + username). |
| `/opengraph-image` | static (1h revalidate) | Seeded collage card used by the homepage/search metadata. |
| `/sitemap.xml` | static | Homepage, search, and every visible profile. |
| `/api/image`, `/api/download`, `/api/profiles` | dynamic | Image proxy/resize, download, slim profile list for search (CDN-cached). |
| `/api/profile/metadata` | dynamic | Dev-only metadata editor (gated to non-production). |

Unknown routes get an Instagram-style 404 (`app/not-found.tsx`); unknown profile IDs
redirect home with a toast.

## Native-app feel

A PWA manifest + theme-color (the status bar blends into the app), safe-area insets for
notch/home-bar devices, no tap-highlight flash, contained overscroll, an instant loading
skeleton on navigation, and a route-level slide transition.
