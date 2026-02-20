import { NextResponse } from 'next/server';
import { getProfiles } from '@/lib/profiles';

export async function GET() {
  const profiles = getProfiles();
  return NextResponse.json(profiles, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
