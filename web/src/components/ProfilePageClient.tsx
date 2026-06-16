'use client';

import { useState } from 'react';
import { ProfileView } from '@/components/ProfileView';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SearchOverlay } from '@/components/SearchOverlay';
import type { Profile } from '@/types';

interface ProfilePageClientProps {
  profile: Profile;
  resolvedUrls?: {
    original: string | null;
    processed: string | null;
  };
}

export function ProfilePageClient({ profile, resolvedUrls }: ProfilePageClientProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <ProfileHeader
        onSearchClick={() => setSearchOpen(!searchOpen)}
        searchOpen={searchOpen}
      />
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
      <main className="flex flex-1 flex-col items-center px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pt-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] min-h-0 overflow-y-auto">
        <ProfileView profile={profile} resolvedUrls={resolvedUrls} />
      </main>
    </div>
  );
}
