import { ProfilesMetadata, Profile, HomeProfile } from '@/types';
import { selectProcessedKey } from '@/lib/images';
export type { Profile, HomeProfile };

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

/** Returns slim profiles with only the fields needed for homepage and search */
export function getHomeProfiles(): HomeProfile[] {
  return Object.values(metadata.profiles).map(p => ({
    instagram_id: p.instagram_id,
    username: p.username,
    full_name: p.full_name,
    biography: p.biography,
    is_verified: p.is_verified,
    profile_pic_url: p.profile_pic_url,
    v1_image_r2_key: p.v1_image_r2_key,
    v2_image_r2_key: p.v2_image_r2_key,
    featured: p.featured,
    hidden: p.hidden,
    is_follower: p.is_follower,
    is_following: p.is_following,
    follower_count: p.follower_count,
  }));
}

/** Returns only profiles eligible for the homepage carousel (featured + processed, not hidden) */
export function getCarouselProfiles(): HomeProfile[] {
  const all = getHomeProfiles().filter(
    (p) => !p.hidden && (p.v2_image_r2_key || p.v1_image_r2_key)
  );
  const featured = all.filter(p => p.featured);
  // Use featured if enough, otherwise fall back to all
  return featured.length >= 4 ? featured : all;
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
  return searchRankProfiles(getProfiles(), query) as Profile[];
}
