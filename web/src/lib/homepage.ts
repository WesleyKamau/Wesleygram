import { Profile } from '@/types';

interface FilterProfilesOptions {
  profiles: Profile[];
  bypassFilter?: boolean;
  minFeatured?: number;
}

/**
 * Filters and prepares profiles for homepage preview carousel
 * - Excludes hidden profiles
 * - Shows ONLY featured profiles if threshold is met (distributes them evenly)
 * - Falls back to all profiles if not enough featured
 * - Uses smart distribution to maximize spacing between repeats
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

  // If not bypassing filter and we have enough featured profiles, show ONLY those
  if (!bypassFilter) {
    const featuredProfiles = availableProfiles.filter((p) => p.featured);
    
    if (featuredProfiles.length >= minFeatured) {
      // Shuffle featured profiles first for random order on each page load
      const shuffledFeatured = [...featuredProfiles].sort(() => Math.random() - 0.5);
      
      // Distribute profiles across rows so each row has distinct profiles
      // that repeat within the row (target 4 rows of 30 profiles each = 120 total)
      const targetRows = 4;
      const profilesPerRow = 30;
      
      // Assign profiles to rows using round-robin distribution
      const rowAssignments: Profile[][] = Array(targetRows).fill(null).map(() => []);
      shuffledFeatured.forEach((profile, idx) => {
        const rowIndex = idx % targetRows;
        rowAssignments[rowIndex].push(profile);
      });
      
      // Fill each row by repeating its assigned profiles
      const distributed: Profile[] = [];
      for (let rowIdx = 0; rowIdx < targetRows; rowIdx++) {
        const rowProfiles = rowAssignments[rowIdx];
        if (rowProfiles.length === 0) continue;
        
        for (let i = 0; i < profilesPerRow; i++) {
          const profileIdx = i % rowProfiles.length;
          distributed.push(rowProfiles[profileIdx]);
        }
      }
      
      availableProfiles = distributed;
    } else {
      // Not enough featured profiles, shuffle all profiles
      availableProfiles = [...availableProfiles].sort(() => Math.random() - 0.5);
    }
  } else {
    // Bypass filter active, shuffle all profiles
    availableProfiles = [...availableProfiles].sort(() => Math.random() - 0.5);
  }

  return availableProfiles;
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
