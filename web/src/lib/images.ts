import { Profile } from '@/types';

export const WESLEY_ID = '290944620';

// Instagram-style default avatar (gray silhouette) for the rare profile with
// no image in R2 at all. Inline data URL — no extra request, works in <Image>
// with `unoptimized`.
export const DEFAULT_AVATAR_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" fill="#e5e5e5"/>' +
      '<circle cx="50" cy="38" r="17" fill="#a3a3a3"/>' +
      '<path d="M50 60c-17 0-29 10-32 24l-1 16h66l-1-16c-3-14-15-24-32-24z" fill="#a3a3a3"/>' +
      '</svg>'
  );

// Select best processed image key: prefer v2, fallback to v1
export function selectProcessedKey(profile: Pick<Profile, 'v2_image_r2_key' | 'v1_image_r2_key'>): string | null {
  return profile.v2_image_r2_key || profile.v1_image_r2_key || null;
}

/**
 * Build a stable image URL for an R2 key, routing through the /api/image
 * presign endpoint. Full URLs are passed through.
 *
 * NOTE: this lives in `images.ts` (which does NOT import the multi-MB
 * profiles metadata JSON) so client components can use it without pulling
 * the entire metadata blob into their bundle.
 */
export function getImageUrl(key: string | undefined | null, width?: number): string {
  if (!key) return '';
  if (key.startsWith('http') || key.startsWith('data:')) return key;
  const sizeParam = width ? `&w=${width}` : '';
  return `/api/image?key=${encodeURIComponent(key)}${sizeParam}`;
}

/**
 * Returns the display image URL for a profile, with Wesley override.
 * Pass `width` to get a resized webp thumbnail (much smaller download) for
 * fixed-size square contexts like avatars and carousel cards.
 *
 * Fallback order: processed (v2 → v1) → R2 original → silhouette avatar.
 * (The scraped Instagram CDN `profile_pic_url`s carried expiring signatures
 * and are long dead — the R2 original is the reliable source.)
 */
export function getProfileImageUrl(
  profile: Pick<Profile, 'instagram_id' | 'v2_image_r2_key' | 'v1_image_r2_key' | 'original_image_r2_key'>,
  width?: number
): { url: string; unoptimized: boolean } {
  if (profile.instagram_id === WESLEY_ID) {
    return { url: '/wesley_profile.jpg', unoptimized: false };
  }
  const key = selectProcessedKey(profile) || profile.original_image_r2_key;
  if (key) {
    return { url: getImageUrl(key, width), unoptimized: true };
  }
  return { url: DEFAULT_AVATAR_URL, unoptimized: true };
}
