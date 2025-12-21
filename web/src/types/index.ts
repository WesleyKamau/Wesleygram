export interface Profile {
  instagram_id: string;
  username: string;
  full_name: string;
  biography: string;
  is_verified: boolean;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  profile_pic_url: string;
  local_path: string;
  image_hash: string;
  original_image_r2_key: string;
  processed: boolean;
  status: string;
  error: string | null;
  last_processed_at: string;
  is_follower: boolean;
  is_following: boolean;
  method: string;
  r2_original_upload_status: string;
  r2_original_error: string | null;
  has_people: boolean;
  v1_image_r2_key?: string;
  v1_error?: string | null;
  v1_processed_at?: string;
}

export interface ProfilesMetadata {
  last_updated: string;
  owner_username: string;
  profiles: Record<string, Profile>;
}
