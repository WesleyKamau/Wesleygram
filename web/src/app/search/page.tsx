import { SearchPageClient } from '@/components/SearchPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search - Wesleygram',
  description: 'Search for Wesley-ified profiles',
};

// The profile dataset is fetched client-side from /api/profiles (CDN-cached)
// rather than server-rendered into the page — inlining it made every /search
// response ~2.6MB of RSC payload.
export default function SearchPage() {
  return <SearchPageClient />;
}
