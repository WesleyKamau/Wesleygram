'use client';

import { useState } from 'react';
import { ProfileView } from '@/components/ProfileView';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SearchOverlay } from '@/components/SearchOverlay';
import { PageTransition } from '@/components/PageTransition';
import { Profile } from '@/lib/profiles';

interface ProfilePageClientProps {
  profile: Profile;
}

export function ProfilePageClient({ profile }: ProfilePageClientProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <PageTransition>
      <div className="flex h-svh flex-col bg-background text-foreground">
        <ProfileHeader
          onSearchClick={() => setSearchOpen(!searchOpen)}
          searchOpen={searchOpen}
        />
        <SearchOverlay
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
        <main className="flex flex-1 flex-col items-center px-4 py-3 sm:py-6 min-h-0 overflow-y-auto">
          <ProfileView profile={profile} />
        </main>
      </div>
    </PageTransition>
  );
}
