import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/r2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
  }

  const url = await getPresignedUrl(key);

  if (!url) {
    return new NextResponse('Failed to generate URL', { status: 500 });
  }

  return NextResponse.redirect(url);
}
