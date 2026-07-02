import { NextResponse } from 'next/server';
import { getHomeProfiles } from '@/lib/profiles';

export async function GET() {
  const profiles = getHomeProfiles();
  // The dataset is bundled at build time and only changes on deploy (which
  // purges the CDN cache), so let browsers and the CDN hold it aggressively.
  return NextResponse.json(profiles, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
