# Wesleygram — Master TODO

> A single, consolidated, **truthful** backlog for the whole Wesleygram monorepo, organized by sub-project.
> Generated from a deep, verified audit of every branch, file, and doc on `main` (commit `a65d882`).
> Every item below was confirmed against the actual code — no speculative work.

**The monorepo contains 4 distinct projects:**

| # | Project | Path | What it is |
|---|---------|------|------------|
| 1 | **Web** | [`web/`](web/) | Next.js 16 / React 19 public site (Vercel) that displays the "Wesley-ified" profiles |
| 2 | **Instagram Downloader** | [`instagram_downloader/`](instagram_downloader/) | Python CLI that scrapes HD profile photos + metadata → Cloudflare R2 |
| 3 | **ML Inference / LoRA** | [`inference/`](inference/) (+ root notebook, `LoRA Photos/`) | SDXL + LoRA pipeline that generates the "Wesley-ified" images |
| 4 | **Repo / root tooling** | repo root | Featured-image + collage scripts, narrative docs, repo hygiene |

**Legend:** `🔴 high` · `🟡 medium` · `🟢 low` · type tags: `bug` `incomplete` `tech-debt` `cleanup` `docs` `security` `enhancement` `infra` · effort: `S`/`M`/`L`

---

## 🚨 CRITICAL — cross-cutting, do these first

These span multiple projects and are the highest-stakes items in the repo.

- [ ] **🔴 Rotate the leaked Cloudflare R2 keys — they are in git history.** `security` `M`
  Both inference notebooks (`Copy_of_wesleygram_inference_v1 (3).ipynb` at root and `inference/Copy_of_wesleygram_inference_v1 (1).ipynb`) contain the live R2 access key + secret key **in plaintext output cells**, and both are git-tracked → recoverable from history. Rotate the R2 keys in Cloudflare, then **scrub history** with `git filter-repo` / BFG after the notebooks are output-stripped (see Inference §). Reset the new keys as Vercel + local env vars.
- [ ] **🔴 Rotate/revoke the on-disk `.env` secrets.** `security` `S`
  `web/.env`, `instagram_downloader/.env`, and `inference/.env` all hold live R2 + Scrapfly keys in cleartext. They are gitignored and **never committed** (verified), so this is lower urgency than the notebooks — but the same R2 keys are exposed, and the **Scrapfly key (`scp-live-…`) is referenced nowhere in any code** (dead credential) → revoke it outright.
- [ ] **🔴 Decide the PII policy for the committed datasets.** `security` `L` · _central legal/ethical decision_
  **Three** git-tracked copies of `profiles_metadata.json` publish data for ~3,300 real Instagram users (usernames, full names, biographies, follower/following counts, ~645 private accounts), plus `instagram_downloader/data/ids.json` (971 followers + 3,107 following with IDs). **Every** record also leaks the dev's absolute Windows path via `local_path` (`C:\GitHub\Wesleygram\instagram_downloader\profile_photos\…`). Decide: keep the repo private forever, or strip to display-only fields + remove `local_path` + scrub history before any public release. This decision gates several items below.
- [ ] **🟡 Set up Git LFS / a binary-asset policy.** `infra` `M`
  `.gitattributes` only does LF normalization. The repo tracks multiple multi-MB binaries (3× ~5 MB metadata JSONs, a 27.9 MB notebook, a 4.3 MB notebook, a 951 KB PNG). After the obsolete duplicates are deleted (below), move the remaining intentional large assets to Git LFS so clones stay small.

---

## ✅ Repo state (cleaned during this audit)

- `main` fast-forwarded to `origin/main` (`a65d882`). Working tree clean.
- Deleted merged local branches `fix` (PR #3) and `disable-mobile-zoom` (PR #1) — work preserved in `origin/main`.
- Pruned the stale `origin/vercel/…` remote-tracking ref (deleted upstream after PR #5).
- **Open PRs: 0. Open issues: 0.** (PRs #1–6 all closed; #2 was an unmerged revert.)
- [ ] **🟢 Delete the remote branch `origin/disable-mobile-zoom`** — it is fully merged into `origin/main`. `cleanup` `S`
  (Left in place because only *local* branch deletion was authorized.) Run: `git push origin --delete disable-mobile-zoom`.

---

## 1. Web — Next.js public site

**Path:** [`web/`](web/) · **Stack:** Next.js 16.1, React 19.2, TypeScript 5, Tailwind v4, `@aws-sdk` (R2), sharp, embla-carousel, framer-motion, next-themes, sonner, @vercel/analytics; pnpm; Vercel.

**Current state:** Working site. Home carousel (auto-scroll Embla, separate mobile/desktop variants), client-side fuzzy search w/ ranking, per-profile pages (`/[id]` with username fallback; `/profile/[id]` redirects to `/[id]`; `/search` full page), R2 presigned URLs with in-memory cache, sharp `/api/image` resizer (whitelisted widths), Web-Share download, dynamic OG collage, PWA manifest, dark/light theme, safe-area/native CSS polish, loading skeletons, toast errors. All data from one 5.7 MB committed JSON (3,298 profiles, keyed object). Build + lint run. Main risks: secrets, PII, a never-populated blur pipeline, a ~2.6 MB client/search payload, unvalidated R2 key access, 7 lint errors.

### 🔴 High priority
- [ ] **Rotate the R2 + Scrapfly secrets in `web/.env`.** Correctly gitignored & untracked, but values are exposed; R2 keys grant whole-bucket read. Reset as Vercel env vars. — `security` `S` (`web/.env`, `web/src/lib/r2.ts`)
- [ ] **Strip internal/PII fields from `web/src/data/profiles_metadata.json`.** 5.7 MB, git-tracked; 3,297 records leak `local_path` (the dev's Windows path) plus `image_hash`, `status/error`, `r2_*` internals — none used by the site. Strip to display-only fields. — `security` `M` (`web/src/data/profiles_metadata.json`, `web/src/types/index.ts`, `web/src/lib/profiles.ts`)

### 🟡 Medium priority
- [ ] **Fix the 7 `react-hooks/set-state-in-effect` ESLint errors.** `HomePreview.tsx:45`, `HomePreviewDesktop.tsx:39`, `Search.tsx:48,91`, `SearchPageClient.tsx:42,48,83`. Derive during render / memoize instead of setting state in effects (cascading re-renders). — `bug` `M`
- [ ] **Populate or delete the never-populated LQIP blur-up pipeline.** Fully wired (types `*_blur`, `[id]/page.tsx` blur prop, `placeholder='blur'`) but **0 of 3,298** records have blur strings, so every path falls back to the skeleton. Either run `pnpm generate-blur` (needs R2 creds) or rip out the plumbing. — `incomplete` `M` (`web/scripts/generate-blur.ts`, `web/src/app/[id]/page.tsx`, `web/src/components/ProfileView.tsx`)
- [ ] **Reduce the ~2.6 MB profile dataset shipped to every search user.** `getHomeProfiles()` returns all 3,287 profiles incl. `profile_pic_url` (1.53 MB of the 2.57 MB). Served on homepage search focus **and** server-rendered into `/search` props. Drop `profile_pic_url` from `HomeProfile` or move to a paginated server endpoint. — `tech-debt` `M` (`web/src/app/api/profiles/route.ts`, `web/src/lib/profiles.ts`, `web/src/app/search/page.tsx`, `web/src/components/Search.tsx`)
- [ ] **Validate the `key` param in `/api/image` and `/api/download` against known R2 keys.** Both presign/proxy *any* `key` → anyone can enumerate the whole `images-original` bucket. Whitelist against metadata keys. (`w` resize widths are already whitelisted — fine.) — `security` `M` (`web/src/app/api/image/route.ts`, `web/src/app/api/download/route.ts`)
- [ ] **Delete `web/package-lock.json` — pnpm is canonical.** Two tracked lockfiles drift / cause non-deterministic Vercel installs. Keep `pnpm-lock.yaml`. — `tech-debt` `S`

### 🟢 Low priority / polish
- [ ] **Add `app/sitemap.ts` or drop the dangling `robots.txt` Sitemap line.** `robots.txt` points to a non-existent `sitemap.xml`. — `docs` `S` (`web/public/robots.txt`)
- [ ] **Replace the create-next-app boilerplate `web/README.md`** with real docs (R2 setup, the `cache-og-images`/`generate-blur` scripts, env vars, metadata pipeline, pnpm, Vercel). — `docs` `S`
- [ ] **Delete unused create-next-app starter SVGs** (`next.svg`, `vercel.svg`, `globe.svg`, `file.svg`, `window.svg`) — zero references. — `cleanup` `S`
- [ ] **Harden or extract the dev-only metadata editor (`/api/profile/metadata`).** Edits the JSON by fragile string surgery (`indexOf("\"<id>\": {")` + `"    },"` heuristic) that can corrupt the file; driven by `window.alert()`. Rewrite with `JSON.parse/stringify` or move out of the deployed app. — `tech-debt` `M` (`web/src/app/api/profile/metadata/route.ts`, `web/src/components/ProfileView.tsx`)
- [ ] **Narrow `next.config.ts` image `remotePatterns` from `hostname: '**'`** (currently an open image proxy). — `security` `S`
- [ ] **Cache the OG collage image** instead of `dynamic = 'force-dynamic'` + `Math.random()` — it regenerates the 1200×630 PNG (font + 16 base64 JPGs) on every request and every page references it. Use `revalidate`/seeded shuffle. — `tech-debt` `M` (`web/src/app/opengraph-image.tsx`, `web/src/app/layout.tsx`)
- [ ] **Wire `cache-og-images` into the build (or document the manual refresh).** `public/og-cache` (178 JPGs + manifest, `cachedAt 2025-12-23`) has no prebuild hook → can go stale. — `infra` `S`
- [ ] **Silence the 2 `<img>` ESLint warnings** in `opengraph-image.tsx:96,136` with an `eslint-disable-next-line` + comment (unavoidable in the Satori/next-og context). — `cleanup` `S`
- [ ] **Replace the placeholder lucide Instagram glyph logo** with a real brand mark (`Header.tsx` still has `{/* Placeholder for Instagram-style logo/header */}`). — `enhancement` `S` (`web/src/components/Header.tsx`, `web/src/components/ProfileHeader.tsx`)
- [ ] **Fix `showProfileStats`:** desktop-only (`hidden sm:grid`), gated by an always-true flag, and shows mostly zeros. Populate real counts, show on mobile, or drop the one-flag config module. — `incomplete` `S` (`web/src/lib/config.ts`, `web/src/components/ProfileView.tsx`)
- [ ] **Per-profile OG/Twitter image uses a `/api/image` 302 redirect** — some crawlers don't follow redirects for OG images, so share cards may render blank. Emit the presigned URL directly (already resolved server-side) or add a per-profile `opengraph-image` route. — `bug` `M` (`web/src/app/[id]/page.tsx`)
- [ ] **Move carousel shuffling server-side (seeded).** `HomePreview*` shuffle in `useEffect` via `Math.random`, returning null until the effect runs → hydration flash + it's the root cause of the set-state-in-effect errors. — `tech-debt` `M` (`web/src/components/HomePreview.tsx`, `web/src/components/HomePreviewDesktop.tsx`, `web/src/lib/homepage.ts`)
- [ ] **Remove duplicate/unused fonts.** `Instagram Sans.ttf` and `Instagram-Sans.ttf` are byte-identical (consolidate); `Instagram Sans Headline.otf` (479 KB) is referenced nowhere. — `cleanup` `S` (`web/src/app/fonts/`)
- [ ] **Remove the tracked `web/.vade-report`** (stray Vercel-Analytics install artifact, not part of the app); gitignore it. — `cleanup` `S`
- [ ] **Add a unit-test setup (e.g. vitest)** for the core pure functions — `searchRankProfiles`, `selectProcessedKey`/`getImageUrl`, `getHomeProfiles`/`getCarouselProfiles`, `filterHomepageProfiles`/`splitIntoRows`. Zero tests today. — `tech-debt` `M` (`web/src/lib/`)

### ❓ Open questions
- Is committing ~3,298 real users' PII to a repo + live public site acceptable, or should profiles be opt-in / anonymized? *(the project's central decision)*
- Complete the blur-up feature (run `generate-blur`, commit placeholders) or remove it?
- Confirm pnpm is the sole package manager so `package-lock.json` can be deleted.
- Should the dev-only metadata editor stay in the deployed codebase or become a separate tool?
- Is `wesleygram.com` the final production domain (hardcoded fallback in `layout.tsx` + `robots.txt`)?

### [Plaud] Brainstorms
None. No Plaud recording pertains to this project — all 65 in the library were checked by content (not title). See [[Plaud] Brainstorm Review](#plaud-brainstorm-review). _Capture future Wesleygram voice notes here._

---

## 2. Instagram Downloader — Python scraper + R2 uploader

**Path:** [`instagram_downloader/`](instagram_downloader/) · **Stack:** Python 3.12, instaloader, requests, boto3 (R2), python-dotenv; argparse CLI; atomic JSON writes; hashlib hashing.

**Current state:** Canonical entrypoint is `main_refactored.py` (~1,450-line CLI: atomic metadata writes, rate-limit delays, dry-run, HTML reports, R2 upload). `main.py` is a **deprecated, unrunnable** Playwright version. The scrape is effectively **complete**: `data/profiles_metadata.json` has 3,297 profiles all `status=completed`, 3,296 with an `original_image_r2_key`, all produced via `method=graphql`. Liabilities are mostly around the code: live creds in `.env`, two checked-in PII datasets, ~10 contradictory AI-generated docs, a documented-but-unimplemented `--fetch-ids` feature, and quickstart scripts that reference the wrong input files.

### 🔴 High priority
- [ ] **Rotate the live R2 keys + revoke the unused Scrapfly key in `instagram_downloader/.env`.** Gitignored & never committed, but real production creds. Scrapfly key is dead code → revoke. — `security` `S`
- [ ] **Decide whether the committed PII datasets belong in git.** `data/profiles_metadata.json` (5.2 MB, 3,297 profiles) **and** `data/ids.json` (453 KB, 971+3,107 named users) are both **git-tracked and not gitignored**. Gitignore both (keep only `profiles_metadata_example.json`) or scrub names/bios + history if the repo goes public. — `security` `M` (`.gitignore`)

### 🟡 Medium priority
- [ ] **Delete deprecated `main.py` + its dead `playwright_downloader` dependency.** `main.py` is self-described DEPRECATED and imports a gitignored/absent module → `ImportError` from a clean checkout. Delete it, the `__pycache__` `.pyc` artifacts, and the now-pointless `playwright_downloader` gitignore line. — `cleanup` `S`
- [ ] **Implement or strip the documented `--fetch-ids` / `--target-user` CLI feature.** Documented in 3 docs + the argparse epilog (line 1126), but `parse_arguments()` defines neither → "unrecognized arguments". The matching code section ("EXPERIMENTAL: LOW-REQUEST … PROPAGATION", line 747) is an empty body. Since `ids.json` is supplied externally, likely strip it. — `incomplete` `M` (`main_refactored.py`, `QUICKREF.md`, `NEW_FEATURES.md`, `FEATURES_COMPLETE.md`)
- [ ] **Consolidate the 10 overlapping markdown docs into one README (+ optional ARCHITECTURE).** Most are AI-generated process artifacts; `FEATURES_COMPLETE.md`≈`NEW_FEATURES.md`, `REFACTORING_COMPLETE.md`/`INDEX.md` are one-time notes, `PROJECT_SUMMARY.md`'s file tree is stale. — `docs` `M`
- [ ] **Rewrite `README.md` to describe the canonical CLI**, not the deprecated Playwright flow (it currently documents `python main.py`, a stale file tree, and has **two duplicate `## License` blocks**). `README_REFACTORED.md` is a good basis. — `docs` `S`
- [ ] **Fix the quickstart scripts — they check for the wrong input files.** `quickstart.sh/.bat` look for `data/followers_1.json` + `data/following.json`, but the code reads `data/ids.json` exclusively → a new user can't run the tool. — `bug` `S`
- [ ] **Make `local_path` portable** instead of hardcoded absolute `C:\GitHub\Wesleygram\…` paths. `sync_r2.py` reads `local_path` and re-upload fails on any other machine. Store relative + resolve against `Path(__file__).parent`. — `tech-debt` `S` (`main_refactored.py`, `sync_r2.py`)

### 🟢 Low priority / polish
- [ ] **Fix docs that falsely claim boto3/R2 was removed.** `MIGRATION_GUIDE.md:14` ("Removed (local only)") and `REFACTORING_COMPLETE.md:22` are wrong — R2/boto3 is first-class and in use (Pillow *is* genuinely gone). — `docs` `S`
- [ ] **Align `.env.example` var names with the real `.env`** (long `R2_ENDPOINT_URL`… vs short `R2_ENDPOINT`…; code tolerates both). Pick one; document Scrapfly is unused. — `docs` `S`
- [ ] **Remove the unused `SCRAPFLY_API_KEY` from `.env`** (referenced nowhere). — `cleanup` `S`
- [ ] **Add retry/backoff + configurable `doc_id` to the GraphQL fetch path.** `fetch_profile_with_graphql()` uses a hardcoded `doc_id` and a single un-retried `requests.get`; on 429 it just returns an error (the deprecated `main.py` *had* exponential backoff). This is the real production path. — `enhancement` `M` (`main_refactored.py`)
- [ ] **Replace the live-network smoke script with real unit tests.** `test_refactored.py` hits the live `@instagram` account with no assertions/pytest. Add pytest + JSON fixtures for `normalize_metadata_keys`, `load_followers_following_from_ids`, `compute_image_hash`, `generate_html_report`. — `tech-debt` `M`
- [ ] **Backfill or mark-unknown the 16 profiles with zero follower/following/post counts** (the `render_surface=PROFILE` response doesn't always include counts; code stores `0` not `null`). — `bug` `S`
- [ ] **Fix hardcoded relative paths + a stale literal in the one-off audit scripts.** `check_duplicates.py`/`check_r2.py` open a hardcoded relative path (only work from repo root) and `check_duplicates.py` hardcodes "all 971 keys are unique". Fold into a subcommand or `tools/`. — `tech-debt` `S`
- [ ] **Clean up `data/` scratch files** (`*.json.tmp`, `*.json.bak`, 3 empty `followers_following_ids_*.json` stubs, `ids_self.json`) and **untrack** the git-tracked timestamped backup `profiles_metadata_20251218_162749.bak.json`. — `cleanup` `S`
- [ ] **Document or script where `data/ids.json` comes from.** The tool depends entirely on it, but no script here produces it (looks like a browser-console export). Ties into the `--fetch-ids` item. — `docs` `S`

### ❓ Open questions
- Remove the committed PII (`profiles_metadata.json` + `ids.json`) from the repo & scrub history, or keep the repo private indefinitely?
- All records came from `method=graphql` despite instascraper being the argparse default — is GraphQL the method to maintain, or should instascraper become default again?
- Was `--fetch-ids` abandoned on purpose (strip docs/epilog/empty section) or is it meant to be built?
- Is this tool now one-shot/maintenance, or re-run periodically? (Determines how much robustness/test investment is worth it.)
- Where does `data/ids.json` originate — document or script it?

### [Plaud] Brainstorms
None. No Plaud recording pertains to this project — all 65 in the library were checked by content (not title). See [[Plaud] Brainstorm Review](#plaud-brainstorm-review). _Capture future Wesleygram voice notes here._

---

## 3. ML Inference / LoRA — "Wesley-ify" image generation

**Path:** [`inference/`](inference/) (+ root notebook, `LoRA Photos/`, `test/`) · **Stack:** SDXL base+refiner, HuggingFace diffusers/transformers/accelerate, LoRA via kohya / Hollowstrawberry XL trainer, segment-anything (SAM vit_h) + BLIP-VQA, torch; R2 (boto3); Google Colab + Drive; python-dotenv.

**Current state:** Trains an SDXL LoRA (trigger `wesley_kamau`) via `Lora_Trainer_XL.ipynb`, then runs **SDXL inpainting** to swap Wesley into profile photos. The real pipeline is the **Colab inference notebook** (canonical = root `Copy_of…(3).ipynb`, 46 cells): loads R2 creds → fetches from R2 → SAM-segments → BLIP pose-detects → SDXL inpaint+refine (strength 0.65 headshot / 0.70 fullbody, guidance 8.0, LoRA scale 0.95, high_noise_frac 0.95, 40 steps, 1024px) → batch-uploads back to R2. `inference/local_inference.py` is a separate, simpler **text-to-image smoke test that is NOT runnable as-is** (missing LoRA file, unimplemented env override). Main risks: secrets in notebook output, duplicate multi-MB notebooks, no pinned requirements, no inference README, batch flow lives only in notebook cells.

### 🔴 High priority
- [ ] **Rotate the R2 keys baked into cell-6 OUTPUT of both tracked notebooks + scrub history.** (See Critical §.) Then strip outputs. — `security` `M` (`Copy_of_wesleygram_inference_v1 (3).ipynb`, `inference/Copy_of_wesleygram_inference_v1 (1).ipynb`)
- [ ] **Remove `print(credentials)` from `load_credentials()`** so secrets never re-enter notebook output (both the Colab-userdata and dotenv branches print the full dict). Log masked tails only. — `security` `S`
- [ ] **Implement the documented `LORA_PATH` env override in `local_inference.py`.** The comment promises it but line 10 hardcodes the path with no `os.getenv`. Add `os.getenv('LORA_PATH', …)` + a `--lora` arg. — `bug` `S`
- [ ] **Provide or document the missing LoRA weights.** `local_inference.py` defaults to `test/wesleygram-10.safetensors`, which **exists nowhere in the repo** (and isn't gitignored) → unrunnable. Notebook references a different weight (`wesleygram-25.safetensors` on Drive). Add download/HF instructions or wire into `inference/models/`. — `incomplete` `M` (`inference/local_inference.py`, `.gitignore`)
- [ ] **Delete the obsolete duplicate notebook + promote root `(3)` as canonical.** `inference/…(1).ipynb` (27.8 MB, Batch V1 only) is superseded by root `…(3).ipynb` (4.3 MB, has Batch V2). Output-strip `(3)`, rename sanely, move into `inference/`, delete `(1)`. — `cleanup` `S`
- [ ] **Strip output cells from all tracked notebooks + add an `nbstripout` git filter.** No filter configured today; notebooks carry base64 images + printed secrets (4.3 MB / 27.8 MB / 136 KB). — `tech-debt` `S` (`.gitattributes`)
- [ ] **Add a pinned `inference/requirements.txt`.** None exists. Needs diffusers, torch, transformers (BLIP), accelerate, safetensors, segment-anything, opencv-headless, boto3, python-dotenv (+ optional xformers). — `incomplete` `M`

### 🟡 Medium priority
- [ ] **Reconcile `local_inference.py` with the notebook pipeline (different, simpler path).** It's plain txt2img 512px/16-step — it **cannot reproduce site images** (no SAM/BLIP/inpaint/refiner). Either document it as a smoke test or port the inpainting flow to a runnable local script. — `incomplete` `L`
- [ ] **Add `inference/.env.example`** (use `instagram_downloader`'s as the pattern) and reconcile env-var names: notebook prefers `R2_ENDPOINT_URL`/`R2_ACCESS_KEY_ID`… but `.env` uses short names; notebook defaults bucket `instagram-profiles` while `.env` uses `images-original`. — `docs` `S`
- [ ] **Write an `inference/` README** documenting the end-to-end run (train → `wesleygram-NN.safetensors` on Drive → open notebook in Colab → set R2 secrets → SAM/BLIP/inpaint/refine → upload to R2). The run procedure currently lives only in notebook prose. — `docs` `M`
- [ ] **Productize batch processing into a standalone parameterized CLI.** Today it's a Colab `@title Batch V2` form cell with a hardcoded `BATCH_USERNAMES` list + a one-off `migrate_metadata_schema` cell → re-running the full set means editing cells. Drive it from `profiles_metadata.json`, abstract `drive.mount`/`userdata`. — `enhancement` `L`

### 🟢 Low priority / polish
- [ ] **Replace verbatim HF SDXL docs (`inference/sdxl.md`)** — it's an unmodified 446-line copy of the HuggingFace diffusers guide (keeps the HF Apache-2.0 header). Replace with a short link + the project's actual params, or delete. — `cleanup` `S`
- [ ] **Fix `inference/loratraining.md`:** stale unchecked boxes for done steps, wrong notebook name (`train_lora_colab.ipynb` → actual `Lora_Trainer_XL.ipynb`), references a non-existent `organize_lora_photos.ps1`, and a 69-vs-120 training-image-count mismatch. — `docs` `S`
- [ ] **Persist per-image seed + tuning params for reproducibility.** `SEED = -1` → random each run, surviving only in the output filename. Persist seed + strength/guidance/LoRA-scale into metadata. — `enhancement` `M`
- [ ] **Parameterize hardcoded Colab/Drive paths** (`/content/drive/MyDrive/Loras/…`, `/content/sam_vit_h_4b8939.pth`, `drive.mount`, `userdata`) so the pipeline can run outside Colab. — `tech-debt` `M`
- [ ] **Add a real smoke test under `test/`** (arg parsing, path validation, optional CPU-only tiny run). Today `test/` is just one example PNG, no test code. — `incomplete` `M`

### ❓ Open questions
- Were the leaked R2 keys (and the Scrapfly key) rotated after these notebooks were committed? If not, they are live.
- Which LoRA weight is canonical for the published images — `wesleygram-10` (`local_inference.py`) or `wesleygram-25` (notebook)? Neither is in the repo.
- Keep `local_inference.py` as a lightweight smoke test, or retire it for a script that reproduces the inpainting pipeline?
- Is the root `(3)` notebook definitively the latest, or is there a newer Colab/Drive copy never synced back?
- Was the LoRA trained on 69 images (`loratraining.md`) or ~120 (the trainer notebook output)?

### [Plaud] Brainstorms
None. No Plaud recording pertains to this project — all 65 in the library were checked by content (not title). See [[Plaud] Brainstorm Review](#plaud-brainstorm-review). _Capture future Wesleygram voice notes here._

---

## 4. Repo / root tooling & hygiene

**Path:** repo root · **Stack:** Python (boto3, python-dotenv, Pillow) for the root scripts; shared monorepo infra.

**Current state:** Root is in decent shape — `README.md` is a real top-level README (4 sub-projects + pipeline + stack), plus `LICENSE` (MIT), `DETAILS.md`, `TECHNICAL.md`. `.gitignore` correctly excludes venvs, `.env`, model files, and the big generated dirs. The two root scripts (`download_featured_images.py`, `generate_collage_frames.py`) pull from R2 via the downloader's `.env`. Main problems: **dataset duplication/staleness + PII**, a junk-named root notebook, doc drift, and no Git LFS.

### 🔴 High priority
- [ ] **Delete the stale root `profiles_metadata.json` and make scripts read only the web copy.** Root copy (5.2 MB, tracked) is an obsolete snapshot: 3,296 profiles, **zero** v2 fields, vs the canonical `web/src/data/profiles_metadata.json` (3,298, all v2). Both root scripts silently fall back to it; `README.md:54` mislabels it "The dataset". Delete it, drop the fallback, update README. — `tech-debt` `S` (`profiles_metadata.json`, `download_featured_images.py`, `generate_collage_frames.py`, `README.md`)
- [ ] **Remove the 4.3 MB stray root notebook `Copy_of_wesleygram_inference_v1 (3).ipynb`.** (Coordinate with Inference §, which promotes it as canonical — pick ONE: either move it into `inference/` output-stripped, or delete after consolidating there. Do not leave it junk-named at root.) — `cleanup` `S`
- [ ] **Scrub `local_path` + reconsider PII across all 3 committed metadata copies** (`web/src/data/`, root, `instagram_downloader/data/`). Every profile carries the dev's absolute Windows path; ~645 private accounts ship bios/counts. — `security` `M`

### 🟡 Medium priority
- [ ] **Set up Git LFS / binary-asset policy** (see Critical §). — `infra` `M`
- [ ] **Fix `DOWNLOAD_FEATURED_README.md`:** it says images are "named by username" (`beyonce.png`), but the script writes zero-padded `0001.png` + a separate `username_mapping.json`. The script's own docstring is also stale ("random number names"). — `docs` `S`

### 🟢 Low priority / polish
- [ ] **Fix `generate_collage_frames.py` stale docstring** ("~30 frames", "2×2/3×3/4×4 layouts", "1080×1080 square") vs reality (`NUM_FRAMES=22`, `GRID_LAYOUTS=[(9,16)]`, 1080×1920, `.jpg`). The runtime summary print is already correct. — `cleanup` `S`
- [ ] **Untrack / relocate `test/examples/inference_output.png`** (951 KB tracked sample, no test code; the `test/` name implies a suite that doesn't exist). Move under `docs/assets`. — `cleanup` `S`
- [ ] **Add a root `requirements.txt`** for the root scripts' deps (boto3, python-dotenv, Pillow), or document that the downloader venv is intended. — `infra` `S`
- [ ] **Consolidate the two root virtualenvs** (`.venv`, `.venv-1`) — both gitignored; local-disk hygiene. — `cleanup` `S`
- [ ] **Delete or gitignore the stray `bak/` dir** (17 MB of regenerable collage output; currently **not** ignored → would be committed if staged). Add `bak/` to `.gitignore`. — `cleanup` `S`
- [ ] **Finish `TECHNICAL.md` or mark it partial.** It lists 4 steps but ends mid-sentence at step 1 ("more on that later"). Optionally move narrative docs into a `docs/` folder to keep root lean. — `docs` `M`

### 🗑️ Local-only clutter (gitignored, safe to delete to reclaim disk)
- `featured_images/` (178 MB, regenerable) · `collage_frames/` (21 MB, regenerable) · `LoRA Photos/` (1.9 GB training data) · `.venv-1/` (redundant venv) · downloader `data/*.tmp`/`*.bak`.

### ❓ Open questions
- Is the root `profiles_metadata.json` safe to delete outright, or does an external script/cron still read it? (Same for the `instagram_downloader/data/` copy.)
- Ship scraped data for ~3,298 real users publicly, or reduce the web copy to app-needed fields with `local_path`/PII stripped?
- Which of `.venv` vs `.venv-1` is canonical; should root scripts share the downloader venv?
- Is `TECHNICAL.md` intentionally partial, or should the inference/storage/web sections be finished?
- Move narrative docs (`DETAILS.md`, `TECHNICAL.md`, `DOWNLOAD_FEATURED_README.md`) into a `docs/` folder?

### [Plaud] Brainstorms
None. No Plaud recording pertains to this project — all 65 in the library were checked by content (not title). See [[Plaud] Brainstorm Review](#plaud-brainstorm-review). _Capture future Wesleygram voice notes here._

---

## [Plaud] Brainstorm Review

**Result: 0 of 65 Plaud recordings pertain to Wesleygram.** Per the request, your **entire** Plaud library was pulled (not just recent ones) — all **65 recordings**, spanning **2026-06-16 → 2026-06-27** — and each was classified by its **AI-note content**, not its auto-generated title (titles can mislead). Method: 9 parallel agents fetched and read every recording's summary.

**Why none match:** your Plaud library begins in **mid-June 2026**, while Wesleygram was built in **December 2025** (per `DETAILS.md`). None of the June-2026 brainstorms revisit it.

The recordings instead belong to your **other** projects/contexts (logged here so you know they were reviewed, and where they live):

| Theme | Example recordings |
|---|---|
| **Wesleypedia / milkipedia** (personal Wikipedia-style wiki) | "6-16 Wesleypedia Brainstorm", "Wesley Pedia Audit / Reviewer Mode", "Domain Consolidation … milkipedia.com", "Voice-Driven Self-Interview Pipeline", "Friend-Sourced Data Pipeline for Wesley PDF Articles" |
| **wesleykamau.com portfolio + iOS messaging/UI** | "Desktop Portfolio Tile Redesign", "Interactive Portfolio Chat", "Custom Tapbacks", "iOS-Style Per-Message Timestamp", "Open-Source iOS UI Library", "Website Dedicated to Cat" |
| **Apps / ideas** | "Goal Link Creator App", "Hindsight & Memory Map Integration", "Shower-Native Voice Capture MVP", "Music Snippet Feature", "Two-List Music Organization" |
| **Work (JPMC)** | LLM/AI test-automation meetings (Playwright/Jira/"Devi"), "Smart Onboarding Agent", "NASA Intern Onboarding", "High-Stakes Demo" strategy |
| **Personal / casual** | California trip planning, Bahari sticker/gravy, finance (MacBook vs debt), networking, Plaud onboarding samples |

> ⚠️ These other projects clearly have rich brainstorm backlogs in Plaud. If you want, I can build the same kind of consolidated TODO for **Wesleypedia**, **wesleykamau.com**, or **Hindsight** next — those *do* have Plaud material to fold in.

**Going forward:** record Wesleygram voice notes in Plaud and re-run this review to populate the `[Plaud]` subsections above.

---

_Audit method: 8-agent deep read + adversarial verification across all 4 sub-projects (every finding confirmed against live code on `main`), plus a 9-agent content review of all 65 Plaud recordings._
