/**
 * Precompute base64 blur-up placeholders (LQIP) for every profile image and
 * write them back into src/data/profiles_metadata.json as `original_blur`,
 * `v1_blur` and `v2_blur`.
 *
 * These tiny strings (~hundreds of bytes each) are shown blurred while the
 * full image loads, giving an instant native-feeling preview instead of a
 * gray skeleton. They live on the full Profile (server-side only), so they
 * never ship in the bulk homepage/search payload.
 *
 * Requires the same Cloudflare R2 credentials as the app. Run from web/:
 *
 *   pnpm generate-blur            # fill in any missing placeholders
 *   pnpm generate-blur --force    # recompute all of them
 *
 * It's idempotent — already-computed images are skipped unless --force.
 */
import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET) {
  console.error('Missing R2 credentials. Set R2_ENDPOINT / R2_ACCESS_KEY / R2_SECRET_KEY / R2_BUCKET (e.g. in web/.env.local).');
  process.exit(1);
}

const client = new S3Client({
  region: 'us-east-1',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

const METADATA_PATH = path.join(process.cwd(), 'src', 'data', 'profiles_metadata.json');
const FORCE = process.argv.includes('--force');
const CONCURRENCY = 8;
const BLUR_SIZE = 20; // px — tiny on purpose; the browser scales + blurs it up

/**
 * Which (key, blur) pairs a profile actually needs. The profile page shows
 * the original plus the SELECTED processed image (v2, falling back to v1) —
 * so v1_blur is only computed when a profile has no v2. Skipping the unused
 * ones roughly halves the R2 downloads and the JSON growth.
 */
function imageFieldsFor(profile: Record<string, string | null | undefined>) {
  const fields: { keyField: string; blurField: string }[] = [
    { keyField: 'original_image_r2_key', blurField: 'original_blur' },
  ];
  if (profile['v2_image_r2_key']) {
    fields.push({ keyField: 'v2_image_r2_key', blurField: 'v2_blur' });
  } else if (profile['v1_image_r2_key']) {
    fields.push({ keyField: 'v1_image_r2_key', blurField: 'v1_blur' });
  }
  return fields;
}

async function makeBlur(key: string): Promise<string | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    const out = await sharp(Buffer.from(bytes))
      .resize(BLUR_SIZE, BLUR_SIZE, { fit: 'cover' })
      .webp({ quality: 40 })
      .toBuffer();
    return `data:image/webp;base64,${out.toString('base64')}`;
  } catch (err) {
    console.warn(`  ! failed for ${key}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function main() {
  const raw = await readFile(METADATA_PATH, 'utf8');
  const metadata = JSON.parse(raw) as {
    profiles: Record<string, Record<string, string | null | undefined>>;
  };

  // Build the work list: every (profile, image) pair that needs a blur string.
  const jobs: { profile: Record<string, string | null | undefined>; keyField: string; blurField: string; key: string }[] = [];
  for (const profile of Object.values(metadata.profiles)) {
    for (const { keyField, blurField } of imageFieldsFor(profile)) {
      const key = profile[keyField];
      if (typeof key === 'string' && key && (FORCE || !profile[blurField])) {
        jobs.push({ profile, keyField, blurField, key });
      }
    }
  }

  console.log(`${jobs.length} image(s) to process (concurrency ${CONCURRENCY}${FORCE ? ', --force' : ''}).`);

  let done = 0;
  let filled = 0;
  // Simple fixed-size worker pool.
  async function worker() {
    while (jobs.length) {
      const job = jobs.pop();
      if (!job) break;
      const blur = await makeBlur(job.key);
      if (blur) {
        job.profile[job.blurField] = blur;
        filled++;
      }
      if (++done % 50 === 0) console.log(`  ...${done} processed`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Atomic write (temp + rename) so an interrupt can't truncate the dataset.
  const { rename } = await import('node:fs/promises');
  await writeFile(`${METADATA_PATH}.tmp`, JSON.stringify(metadata, null, 2) + '\n');
  await rename(`${METADATA_PATH}.tmp`, METADATA_PATH);
  console.log(`Done. Wrote ${filled} blur placeholder(s) to ${path.relative(process.cwd(), METADATA_PATH)}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
