import { getProfiles } from '@/lib/profiles';
import { SearchPageClient } from '@/components/SearchPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search - Wesleygram',
  description: 'Search for Wesley-ified profiles',
};

export default function SearchPage() {
  const profiles = getProfiles();

  return <div>
    <SearchPageClient profiles={profiles} />
  </div>;
}
