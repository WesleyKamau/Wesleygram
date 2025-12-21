import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/r2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');

  console.log('[Image API] Request received', {
    key,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
  });

  if (!key) {
    console.warn('[Image API] Missing key parameter');
    return new NextResponse('Missing key parameter', { status: 400 });
  }

  try {
    const url = await getPresignedUrl(key);

    if (!url) {
      console.error('[Image API] Failed to generate presigned URL for key:', key);
      return new NextResponse('Failed to generate URL', { status: 500 });
    }

    console.log('[Image API] Successfully generated presigned URL for key:', key);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('[Image API] Error generating presigned URL:', {
      key,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new NextResponse(
      `Failed to generate URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
