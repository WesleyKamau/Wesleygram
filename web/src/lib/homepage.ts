import { HomeProfile } from '@/types';
import { WESLEY_ID } from '@/lib/images';

interface FilterProfilesOptions {
  profiles: HomeProfile[];
  bypassFilter?: boolean;
  minFeatured?: number;
  targetRows?: number;
}

/**
 * Filters and prepares profiles for homepage preview carousel.
 * Wesley is EXCLUDED from this pipeline — he is injected separately by splitIntoRows.
 */
export function filterHomepageProfiles({
  profiles,
  bypassFilter = false,
  minFeatured = 4,
  targetRows = 4,
}: FilterProfilesOptions): HomeProfile[] {
  // Exclude Wesley — he's handled separately in splitIntoRows
  let availableProfiles: HomeProfile[] = profiles.filter(
    (p) => !p.hidden && p.instagram_id !== WESLEY_ID && (p.v2_image_r2_key || p.v1_image_r2_key)
  );

  if (!bypassFilter) {
    const featuredProfiles = availableProfiles.filter((p) => p.featured);

    if (featuredProfiles.length >= minFeatured) {
      const shuffled = [...featuredProfiles].sort(() => Math.random() - 0.5);

      const profilesPerRow = 30;
      const rowAssignments: HomeProfile[][] = Array(targetRows).fill(null).map(() => []);
      shuffled.forEach((profile, idx) => {
        rowAssignments[idx % targetRows].push(profile);
      });

      const distributed: HomeProfile[] = [];
      for (let rowIdx = 0; rowIdx < targetRows; rowIdx++) {
        const rowProfiles = rowAssignments[rowIdx];
        if (rowProfiles.length === 0) continue;
        for (let i = 0; i < profilesPerRow; i++) {
          distributed.push(rowProfiles[i % rowProfiles.length]);
        }
      }

      availableProfiles = distributed;
    } else {
      availableProfiles = [...availableProfiles].sort(() => Math.random() - 0.5);
    }
  } else {
    availableProfiles = [...availableProfiles].sort(() => Math.random() - 0.5);
  }

  return availableProfiles;
}

/**
 * Splits profiles into rows for carousel display.
 * Always injects Wesley at position 3 in row 0 — sourced from the original
 * profiles list, completely independent of the filter/shuffle pipeline.
 */
export function splitIntoRows(
  distributed: HomeProfile[],
  rowCount: number,
  profilesPerRow: number,
  allProfiles: HomeProfile[],
): HomeProfile[][] {
  // Find Wesley from the ORIGINAL unfiltered profiles list
  const wesley = allProfiles.find(p => p.instagram_id === WESLEY_ID);

  const rows: HomeProfile[][] = [];
  for (let i = 0; i < rowCount; i++) {
    const start = i * profilesPerRow;
    const end = start + profilesPerRow;
    const row = distributed.slice(start, end);

    // Remove any accidental Wesley instances
    for (let j = row.length - 1; j >= 0; j--) {
      if (row[j].instagram_id === WESLEY_ID) row.splice(j, 1);
    }

    // Inject Wesley at position 3 in row 0 (front and center)
    if (i === 0 && wesley) {
      row.splice(3, 0, wesley);
    }

    rows.push(row);
  }
  return rows;
}
