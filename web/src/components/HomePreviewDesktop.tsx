'use client';

import { useEffect, useState } from 'react';
import { Profile } from '@/lib/profiles';
import { ProfileCarouselRowDesktop } from './ProfileCarouselRowDesktop';
import { HOME_PREVIEW_TITLE } from '@/lib/constants';
import { filterHomepageProfiles, splitIntoRows } from '@/lib/homepage';

interface HomePreviewDesktopProps {
  profiles: Profile[];
}

export function HomePreviewDesktop({ profiles }: HomePreviewDesktopProps) {
  const [rowProfiles, setRowProfiles] = useState<Profile[][]>([]);

  useEffect(() => {
    // Check for bypass filter parameter
    const params = new URLSearchParams(window.location.search);
    const bypassFilter = params.get('bypass_filter') === 'true';

    const shuffled = filterHomepageProfiles({
      profiles,
      bypassFilter,
      minFeatured: 4,
    });
    
    // Take 90 profiles and split evenly into 3 rows (30 each) for desktop
    const rows = splitIntoRows(shuffled, 3, 30);
    setRowProfiles(rows);
  }, [profiles]);

  if (rowProfiles.length === 0 || rowProfiles.some(row => row.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden py-12 max-w-[1600px] mx-auto">
      <ProfileCarouselRowDesktop profiles={rowProfiles[0]} direction="forward" keyPrefix="desktop-row1" />
      
      <div className="text-center z-10">
        <h2 className="text-5xl font-bold text-foreground tracking-tight">{HOME_PREVIEW_TITLE}</h2>
      </div>

      <ProfileCarouselRowDesktop profiles={rowProfiles[1]} direction="backward" keyPrefix="desktop-row2" />
      <ProfileCarouselRowDesktop profiles={rowProfiles[2]} direction="forward" keyPrefix="desktop-row3" />
    </div>
  );
}
