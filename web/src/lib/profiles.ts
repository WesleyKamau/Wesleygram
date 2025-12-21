import { ProfilesMetadata, Profile } from '@/types';
export type { Profile };

import metadataRaw from '@/data/profiles_metadata.json';

const metadata = metadataRaw as unknown as ProfilesMetadata;

export const R2_BASE_URL = ''; // Not used directly anymore

export function getImageUrl(key: string | undefined | null): string {
  if (!key) return '';
  // If it's already a full URL (like profile_pic_url), return it
  if (key.startsWith('http')) return key;
  // Otherwise, route through our API to get a presigned URL
  return `/api/image?key=${encodeURIComponent(key)}`;
}


export function getProfiles(): Profile[] {
  return Object.values(metadata.profiles);
}

export function getProcessedProfiles(): Profile[] {
  return getProfiles().filter((p) => p.v1_image_r2_key);
}

export function getProfileById(id: string): Profile | undefined {
  return metadata.profiles[id];
}

export function searchProfiles(query: string): Profile[] {
  const lowerQuery = query.toLowerCase();
  return getProcessedProfiles().filter(
    (p) =>
      p.username.toLowerCase().includes(lowerQuery) ||
      p.full_name.toLowerCase().includes(lowerQuery)
  );
}
