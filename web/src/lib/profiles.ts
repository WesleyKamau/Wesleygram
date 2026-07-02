import { ProfilesMetadata, Profile, HomeProfile } from '@/types';
export type { Profile, HomeProfile };
// NOTE: `getImageUrl` intentionally lives in `@/lib/images`, NOT here. This
// module statically imports the multi-MB metadata JSON below, so anything a
// client component imports from it drags that whole blob into the browser
// bundle. Import image helpers from `@/lib/images` instead.

import metadataRaw from '@/data/profiles_metadata.json';

const metadata = metadataRaw as unknown as ProfilesMetadata;

/**
 * Returns slim profiles with only the fields needed for homepage and search.
 * Hidden profiles are excluded so their data never ships to the client (they
 * remain reachable by direct ID via getProfileById).
 */
export function getHomeProfiles(): HomeProfile[] {
  return Object.values(metadata.profiles)
    .filter((p) => !p.hidden)
    .map((p) => ({
      instagram_id: p.instagram_id,
      username: p.username,
      full_name: p.full_name,
      biography: p.biography,
      is_verified: p.is_verified,
      original_image_r2_key: p.original_image_r2_key,
      v1_image_r2_key: p.v1_image_r2_key,
      v2_image_r2_key: p.v2_image_r2_key,
      featured: p.featured,
      hidden: p.hidden,
      is_follower: p.is_follower,
      is_following: p.is_following,
      follower_count: p.follower_count,
    }));
}

/** Returns only profiles eligible for the homepage carousel (featured + processed). */
export function getCarouselProfiles(): HomeProfile[] {
  const WESLEY_ID = '290944620';
  // getHomeProfiles() already excludes hidden profiles.
  const all = getHomeProfiles().filter(
    (p) => p.instagram_id === WESLEY_ID || p.v2_image_r2_key || p.v1_image_r2_key
  );
  const featured = all.filter((p) => p.featured);
  // Use featured if enough, otherwise fall back to all.
  // Always include Wesley even if he's not featured.
  if (featured.length >= 4) {
    const hasWesley = featured.some((p) => p.instagram_id === WESLEY_ID);
    if (!hasWesley) {
      const wesley = all.find((p) => p.instagram_id === WESLEY_ID);
      if (wesley) featured.push(wesley);
    }
    return featured;
  }
  return all;
}

export function getProfileById(id: string): Profile | undefined {
  return metadata.profiles[id];
}

export function getProfileByUsername(username: string | undefined): Profile | undefined {
  if (!username) return undefined;
  const normalizedUsername = username.toLowerCase();
  return Object.values(metadata.profiles).find(
    (p) => p.username.toLowerCase() === normalizedUsername
  );
}
