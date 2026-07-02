// The dataset was slimmed to exactly the fields the site displays or ranks
// by — scraper internals (local paths, hashes, processing status/errors,
// timestamps) and the long-expired Instagram CDN profile_pic_url were
// stripped from src/data/profiles_metadata.json and must not come back.
export interface Profile {
  instagram_id: string;
  username: string;
  full_name: string;
  biography: string;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  original_image_r2_key: string;
  is_follower: boolean;
  is_following: boolean;
  v1_image_r2_key: string | null;
  v2_image_r2_key: string | null;
  featured?: boolean; // Curated profiles to show on homepage preview
  hidden?: boolean; // Hide from homepage and search entirely
  // Tiny base64 blur-up placeholders (LQIP), precomputed by scripts/generate-blur.ts.
  // Server-side only — never included in HomeProfile, so they don't ship in bulk.
  original_blur?: string;
  v1_blur?: string;
  v2_blur?: string;
}

/** Slim profile type with only fields needed for homepage and search */
export type HomeProfile = Pick<Profile,
  | 'instagram_id'
  | 'username'
  | 'full_name'
  | 'biography'
  | 'is_verified'
  | 'original_image_r2_key'
  | 'v1_image_r2_key'
  | 'v2_image_r2_key'
  | 'featured'
  | 'hidden'
  | 'is_follower'
  | 'is_following'
  | 'follower_count'
>;

export interface ProfilesMetadata {
  last_updated: string;
  owner_username: string;
  profiles: Record<string, Profile>;
}
