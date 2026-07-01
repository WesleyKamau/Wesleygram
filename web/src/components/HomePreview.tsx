'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HomeProfile } from '@/types';
import { ProfileCarouselRow } from './ProfileCarouselRow';
import { HomePreviewDesktop } from './HomePreviewDesktop';
import { HOME_PREVIEW_TITLE } from '@/lib/constants';
import { filterHomepageProfiles, splitIntoRows } from '@/lib/homepage';
import { MIN_FEATURED_PROFILES } from '@/lib/constants';
import { useIsClient } from '@/lib/useIsClient';

interface HomePreviewProps {
  profiles: HomeProfile[];
}

export function HomePreview({ profiles }: HomePreviewProps) {
  // The row selection shuffles with Math.random and reads window.location, so it
  // must run on the client only. `useIsClient` keeps it out of SSR/hydration and
  // `useMemo` derives the rows during render (no set-state-in-effect).
  const isClient = useIsClient();
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

  const rowProfiles = useMemo<HomeProfile[][]>(() => {
    if (!isClient) return [];

    // Check for bypass filter parameter
    const params = new URLSearchParams(window.location.search);
    const bypassFilter = params.get('bypass_filter') === 'true';

    const shuffled = filterHomepageProfiles({
      profiles,
      bypassFilter,
      minFeatured: MIN_FEATURED_PROFILES,
      targetRows: 4,
    });

    // Take 120 profiles and split evenly into 4 rows (30 each)
    return splitIntoRows(shuffled, 4, 30, profiles);
  }, [profiles, isClient]);

  if (rowProfiles.length === 0 || rowProfiles.some(row => row.length === 0)) {
    return null;
  }

  // Render desktop version on large screens
  if (isDesktop) {
    return <HomePreviewDesktop profiles={profiles} />;
  }

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
