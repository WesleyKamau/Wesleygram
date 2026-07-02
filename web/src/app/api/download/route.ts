import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/r2';
import { isKnownR2Key } from '@/lib/r2-keys';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  // The filename lands in a response header — restrict it to safe characters
  // so a crafted query string can't inject header data.
  const rawFilename = searchParams.get('filename') || 'image.png';
  const filename = rawFilename.replace(/[^\w.\- ]/g, '_').slice(0, 128) || 'image.png';

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
  }

  // Only serve keys that belong to a known profile — otherwise this route is
  // an open proxy for every object in the bucket.
  if (!isKnownR2Key(key)) {
    return new NextResponse('Unknown key', { status: 404 });
  }

  try {
    const url = await getPresignedUrl(key);

    if (!url) {
      return new NextResponse('Failed to generate URL', { status: 500 });
    }

    // Fetch the image from R2
    const response = await fetch(url);

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const blob = await response.blob();

    // Return the image with download headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Download API] Error:', error);
    return new NextResponse(
      `Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
