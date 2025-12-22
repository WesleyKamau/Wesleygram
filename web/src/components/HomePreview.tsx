'use client';

import { useEffect, useState } from 'react';
import { Profile } from '@/lib/profiles';
import { ProfileCarouselRow } from './ProfileCarouselRow';
import { HomePreviewDesktop } from './HomePreviewDesktop';
import { HOME_PREVIEW_TITLE } from '@/lib/constants';
import { filterHomepageProfiles, splitIntoRows } from '@/lib/homepage';

interface HomePreviewProps {
  profiles: Profile[];
}

export function HomePreview({ profiles }: HomePreviewProps) {
  const [rowProfiles, setRowProfiles] = useState<Profile[][]>([]);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if desktop
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    // Check for bypass filter parameter
    const params = new URLSearchParams(window.location.search);
    const bypassFilter = params.get('bypass_filter') === 'true';

    const shuffled = filterHomepageProfiles({
      profiles,
      bypassFilter,
      minFeatured: 4,
    });
    
    // Take 120 profiles and split evenly into 4 rows (30 each)
    const rows = splitIntoRows(shuffled, 4, 30);
    setRowProfiles(rows);
  }, [profiles]);

  if (rowProfiles.length === 0 || rowProfiles.some(row => row.length === 0)) {
    return null;
  }

  // Render desktop version on large screens
  if (isDesktop) {
    return <HomePreviewDesktop profiles={profiles} />;
  }

  // Render mobile version

  // Render mobile version
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden py-4">
      <ProfileCarouselRow profiles={rowProfiles[0]} direction="forward" keyPrefix="row1" className="hide-on-short" />
      <ProfileCarouselRow profiles={rowProfiles[1]} direction="backward" keyPrefix="row2" />

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{HOME_PREVIEW_TITLE}</h2>
      </div>

      <ProfileCarouselRow profiles={rowProfiles[2]} direction="forward" keyPrefix="row3" />
      <ProfileCarouselRow profiles={rowProfiles[3]} direction="backward" keyPrefix="row4" className="hide-on-short" />
    </div>
  );
}
