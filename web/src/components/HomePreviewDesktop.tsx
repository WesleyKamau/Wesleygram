'use client';

import { useEffect, useState } from 'react';
import { Profile } from '@/lib/profiles';
import { ProfileCarouselRowDesktop } from './ProfileCarouselRowDesktop';
import { HOME_PREVIEW_TITLE } from '@/lib/constants';

interface HomePreviewDesktopProps {
  profiles: Profile[];
}

export function HomePreviewDesktop({ profiles }: HomePreviewDesktopProps) {
  const [rowProfiles, setRowProfiles] = useState<Profile[][]>([]);

  useEffect(() => {
    // Get random profiles with processed images
    const processedProfiles = profiles.filter(p => p.v2_image_r2_key || p.v1_image_r2_key);
    const shuffled = [...processedProfiles].sort(() => Math.random() - 0.5);
    
    // Take 90 profiles and split evenly into 3 rows (30 each) for desktop
    const row1 = shuffled.slice(0, 30);
    const row2 = shuffled.slice(30, 60);
    const row3 = shuffled.slice(60, 90);
    
    setRowProfiles([row1, row2, row3]);
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
