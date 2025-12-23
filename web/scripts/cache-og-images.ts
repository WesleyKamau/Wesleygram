/**
 * Build script to cache featured profile images for OpenGraph generation
 * Run this at build time to avoid fetching from R2 on every OG image request
 * 
 * Usage: npx tsx scripts/cache-og-images.ts
 */

import { config } from 'dotenv';
config(); // Load .env file

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import metadataRaw from '../src/data/profiles_metadata.json';

interface Profile {
  instagram_id: string;
  username: string;
  featured?: boolean;
  hidden?: boolean;
  v1_image_r2_key?: string;
  v2_image_r2_key?: string;
  profile_pic_url: string;
}

interface ProfilesMetadata {
  profiles: Record<string, Profile>;
}

const metadata = metadataRaw as unknown as ProfilesMetadata;

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET) {
  console.error('Missing R2 environment variables');
  process.exit(1);
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

async function getPresignedUrl(key: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
}

function selectProcessedKey(profile: Profile): string | null {
  return profile.v2_image_r2_key || profile.v1_image_r2_key || null;
}

async function main() {
  const cacheDir = join(process.cwd(), 'public', 'og-cache');
  
  // Create cache directory if it doesn't exist
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  // Get featured profiles with processed images
  const allProfiles = Object.values(metadata.profiles);
  const availableProfiles = allProfiles.filter(
    (p) => !p.hidden && (p.v2_image_r2_key || p.v1_image_r2_key)
  );
  const featuredProfiles = availableProfiles.filter((p) => p.featured);

  // Use featured if we have enough, otherwise use all processed
  const profilesToCache = featuredProfiles.length >= 16 
    ? featuredProfiles 
    : availableProfiles.slice(0, 20); // Cache up to 20 for variety

  console.log(`Caching ${profilesToCache.length} profile images for OpenGraph...`);

  const cachedProfiles: Array<{ instagram_id: string; filename: string }> = [];

  for (const profile of profilesToCache) {
    const imageKey = selectProcessedKey(profile);
    if (!imageKey) continue;

    const presignedUrl = await getPresignedUrl(imageKey);
    if (!presignedUrl) {
      console.warn(`  Skipping ${profile.username}: no presigned URL`);
      continue;
    }

    try {
      const response = await fetch(presignedUrl);
      if (!response.ok) {
        console.warn(`  Skipping ${profile.username}: fetch failed`);
        continue;
      }

      const originalBuffer = Buffer.from(await response.arrayBuffer());
      
      // Resize to 240x240 (the size we display in OG image) as JPEG for smaller files
      const resizedBuffer = await sharp(originalBuffer)
        .resize(240, 240, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const filename = `${profile.instagram_id}.jpg`;
      const filePath = join(cacheDir, filename);
      
      await writeFile(filePath, resizedBuffer);
      cachedProfiles.push({ instagram_id: profile.instagram_id, filename });
      console.log(`  Cached: ${profile.username} -> ${filename} (${Math.round(resizedBuffer.length / 1024)}KB)`);
    } catch (error) {
      console.warn(`  Error caching ${profile.username}:`, error);
    }
  }

  // Write manifest file
  const manifest = {
    cachedAt: new Date().toISOString(),
    profiles: cachedProfiles,
  };
  
  await writeFile(
    join(cacheDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\nCached ${cachedProfiles.length} images to ${cacheDir}`);
  console.log('Manifest written to manifest.json');
}

main().catch(console.error);
