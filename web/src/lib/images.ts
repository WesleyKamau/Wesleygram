import { Profile } from '@/types';

export const WESLEY_ID = '290944620';

// Select best processed image key: prefer v2, fallback to v1
export function selectProcessedKey(profile: Pick<Profile, 'v2_image_r2_key' | 'v1_image_r2_key'>): string | null {
  return profile.v2_image_r2_key || profile.v1_image_r2_key || null;
}

function keyToImageUrl(key: string): string {
  if (key.startsWith('http')) return key;
  return `/api/image?key=${encodeURIComponent(key)}`;
}

/** Returns the display image URL for a profile, with Wesley override */
export function getProfileImageUrl(profile: Pick<Profile, 'instagram_id' | 'v2_image_r2_key' | 'v1_image_r2_key' | 'profile_pic_url'>): { url: string; unoptimized: boolean } {
  if (profile.instagram_id === WESLEY_ID) {
    return { url: '/wesley_profile.jpg', unoptimized: false };
  }
  const processedKey = selectProcessedKey(profile);
  if (processedKey) {
    return { url: keyToImageUrl(processedKey), unoptimized: true };
  }
  return { url: profile.profile_pic_url, unoptimized: false };
}
