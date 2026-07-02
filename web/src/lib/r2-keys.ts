import { ProfilesMetadata } from '@/types';
import metadataRaw from '@/data/profiles_metadata.json';

// Server-only (imports the multi-MB metadata JSON — never import from client
// components). Builds the set of every R2 object key the site knows about so
// the image/download API routes can refuse arbitrary keys: without this,
// anyone could enumerate or proxy any object in the bucket.
const metadata = metadataRaw as unknown as ProfilesMetadata;

const knownKeys = new Set<string>();
for (const profile of Object.values(metadata.profiles)) {
  for (const key of [
    profile.original_image_r2_key,
    profile.v1_image_r2_key,
    profile.v2_image_r2_key,
  ]) {
    if (key) knownKeys.add(key);
  }
}

export function isKnownR2Key(key: string): boolean {
  return knownKeys.has(key);
}
