import { ProfilesMetadata, Profile } from '@/types';
import { selectProcessedKey } from '@/lib/images';
export type { Profile };

import metadataRaw from '@/data/profiles_metadata.json';
import { searchRankProfiles } from '@/lib/search';

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
  return getProfiles().filter((p) => !!selectProcessedKey(p));
}

export function getProfileById(id: string): Profile | undefined {
  return metadata.profiles[id];
}

export function getProfileByUsername(username: string): Profile | undefined {
  const normalizedUsername = username.toLowerCase();
  return Object.values(metadata.profiles).find(
    (p) => p.username.toLowerCase() === normalizedUsername
  );
}

export function searchProfiles(query: string): Profile[] {
  return searchRankProfiles(getProfiles(), query);
}
