import { Profile } from '@/types';

// Select best processed image key: prefer v2, fallback to v1
export function selectProcessedKey(profile: Profile): string | null {
  return profile.v2_image_r2_key || profile.v1_image_r2_key || null;
}
