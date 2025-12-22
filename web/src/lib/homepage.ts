import { Profile } from '@/types';

interface FilterProfilesOptions {
  profiles: Profile[];
  bypassFilter?: boolean;
  minFeatured?: number;
}

/**
 * Filters and prepares profiles for homepage preview carousel
 * - Excludes hidden profiles
 * - Uses featured profiles if available (and not bypassed)
 * - Shuffles the results
 */
export function filterHomepageProfiles({
  profiles,
  bypassFilter = false,
  minFeatured = 4,
}: FilterProfilesOptions): Profile[] {
  // Get profiles with processed images, excluding hidden
  let availableProfiles = profiles.filter(
    (p) => !p.hidden && (p.v2_image_r2_key || p.v1_image_r2_key)
  );

  // If not bypassing filter, try to use featured profiles first
  if (!bypassFilter) {
    const featuredProfiles = availableProfiles.filter((p) => p.featured);
    // Use featured if we have at least the minimum (carousel loops infinitely)
    if (featuredProfiles.length >= minFeatured) {
      availableProfiles = featuredProfiles;
    }
  }

  // Shuffle profiles
  return [...availableProfiles].sort(() => Math.random() - 0.5);
}

/**
 * Splits profiles into rows for carousel display
 */
export function splitIntoRows(profiles: Profile[], rowCount: number, profilesPerRow: number): Profile[][] {
  const rows: Profile[][] = [];
  for (let i = 0; i < rowCount; i++) {
    const start = i * profilesPerRow;
    const end = start + profilesPerRow;
    rows.push(profiles.slice(start, end));
  }
  return rows;
}
