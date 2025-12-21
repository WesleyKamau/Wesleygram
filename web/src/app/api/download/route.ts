import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/r2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  const filename = searchParams.get('filename') || 'image.png';

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
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
