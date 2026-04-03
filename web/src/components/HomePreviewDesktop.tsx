'use client';

import { useEffect, useState } from 'react';
import { HomeProfile } from '@/lib/profiles';
import { ProfileCarouselRowDesktop } from './ProfileCarouselRowDesktop';
import { HOME_PREVIEW_TITLE, MIN_FEATURED_PROFILES } from '@/lib/constants';
import { filterHomepageProfiles, splitIntoRows } from '@/lib/homepage';

interface HomePreviewDesktopProps {
  profiles: HomeProfile[];
}

export function HomePreviewDesktop({ profiles }: HomePreviewDesktopProps) {
  const [rowProfiles, setRowProfiles] = useState<HomeProfile[][]>([]);
  const [rowCount, setRowCount] = useState(3);

  useEffect(() => {
    const updateRowCount = () => {
      // Use 2 rows on shorter screens (tablets), 3 on taller screens
      setRowCount(window.innerHeight < 1100 ? 2 : 3);
    };
    updateRowCount();
    window.addEventListener('resize', updateRowCount);
    return () => window.removeEventListener('resize', updateRowCount);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bypassFilter = params.get('bypass_filter') === 'true';

    const shuffled = filterHomepageProfiles({
      profiles,
      bypassFilter,
      minFeatured: MIN_FEATURED_PROFILES,
      targetRows: rowCount,
    });

    const rows = splitIntoRows(shuffled, rowCount, 30, profiles);
    setRowProfiles(rows);
  }, [profiles, rowCount]);

  if (rowProfiles.length === 0 || rowProfiles.some(row => row.length === 0)) {
    return null;
  }

  if (rowCount === 2) {
    // Tablet layout: 1 row above title, 1 row below
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-x-hidden py-4 w-full">
        <ProfileCarouselRowDesktop profiles={rowProfiles[0]} direction="forward" keyPrefix="desktop-row1" cardSize={160} />

        <div className="text-center z-10 py-1">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">{HOME_PREVIEW_TITLE}</h2>
        </div>

        <ProfileCarouselRowDesktop profiles={rowProfiles[1]} direction="backward" keyPrefix="desktop-row2" cardSize={160} />
      </div>
    );
  }

  // Full desktop layout: 1 row above title, 2 rows below
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-x-hidden overflow-y-visible py-12 w-full">
      <ProfileCarouselRowDesktop profiles={rowProfiles[0]} direction="forward" keyPrefix="desktop-row1" />

      <div className="text-center z-10">
        <h2 className="text-5xl font-bold text-foreground tracking-tight">{HOME_PREVIEW_TITLE}</h2>
      </div>

      <ProfileCarouselRowDesktop profiles={rowProfiles[1]} direction="backward" keyPrefix="desktop-row2" />
      <ProfileCarouselRowDesktop profiles={rowProfiles[2]} direction="forward" keyPrefix="desktop-row3" />
    </div>
  );
}
