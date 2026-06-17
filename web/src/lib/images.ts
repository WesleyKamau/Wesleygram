import { Profile } from '@/types';

export const WESLEY_ID = '290944620';

// Select best processed image key: prefer v2, fallback to v1
export function selectProcessedKey(profile: Pick<Profile, 'v2_image_r2_key' | 'v1_image_r2_key'>): string | null {
  return profile.v2_image_r2_key || profile.v1_image_r2_key || null;
}

/**
 * Build a stable image URL for an R2 key, routing through the /api/image
 * presign endpoint. Full URLs (e.g. profile_pic_url) are passed through.
 *
 * NOTE: this lives in `images.ts` (which does NOT import the multi-MB
 * profiles metadata JSON) so client components can use it without pulling
 * the entire metadata blob into their bundle.
 */
export function getImageUrl(key: string | undefined | null, width?: number): string {
  if (!key) return '';
  if (key.startsWith('http')) return key;
  const sizeParam = width ? `&w=${width}` : '';
  return `/api/image?key=${encodeURIComponent(key)}${sizeParam}`;
}

/**
 * Returns the display image URL for a profile, with Wesley override.
 * Pass `width` to get a resized webp thumbnail (much smaller download) for
 * fixed-size square contexts like avatars and carousel cards.
 */
export function getProfileImageUrl(
  profile: Pick<Profile, 'instagram_id' | 'v2_image_r2_key' | 'v1_image_r2_key' | 'profile_pic_url'>,
  width?: number
): { url: string; unoptimized: boolean } {
  if (profile.instagram_id === WESLEY_ID) {
    return { url: '/wesley_profile.jpg', unoptimized: false };
  }
  const processedKey = selectProcessedKey(profile);
  if (processedKey) {
    return { url: getImageUrl(processedKey, width), unoptimized: true };
  }
  return { url: profile.profile_pic_url, unoptimized: false };
}
