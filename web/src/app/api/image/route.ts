import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getPresignedUrl, getObjectBytes } from '@/lib/r2';

export const runtime = 'nodejs';

// Whitelisted thumbnail widths so the resize cache can't be flooded with
// arbitrary sizes. These cover avatar (80px), mobile/desktop cards and retina.
const ALLOWED_WIDTHS = new Set([96, 160, 240, 320, 480, 640]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
  }

  const wParam = searchParams.get('w');
  const width = wParam ? parseInt(wParam, 10) : null;

  // A `w` that isn't whitelisted is a bug (typo / unexpected caller). Reject it
  // loudly rather than silently serving the full-res image and defeating the
  // bandwidth savings. (Omitting `w` entirely is fine — that's the hero path.)
  if (wParam !== null && (width === null || !ALLOWED_WIDTHS.has(width))) {
    return new NextResponse(`Unsupported width: ${wParam}`, { status: 400 });
  }

  // Sized request: fetch the object once, resize to a small square webp, and
  // return it with a long cache. This keeps the bytes the phone downloads tiny
  // (a full-res PNG becomes a few KB webp) instead of shipping the original.
  if (width) {
    try {
      const obj = await getObjectBytes(key);
      if (obj) {
        const resized = await sharp(Buffer.from(obj.body))
          .rotate() // honour EXIF orientation
          .resize(width, width, { fit: 'cover', withoutEnlargement: true })
          .webp({ quality: 72 })
          .toBuffer();

        return new NextResponse(resized as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      }
    } catch (error) {
      console.error('[Image API] Resize failed, falling back to redirect:', {
        key,
        width,
        error: error instanceof Error ? error.message : String(error),
      });
      // fall through to the redirect path below
    }
  }

  // Default / fallback: redirect to a presigned URL (full resolution).
  try {
    const url = await getPresignedUrl(key);

    if (!url) {
      console.error('[Image API] Failed to generate presigned URL for key:', key);
      return new NextResponse('Failed to generate URL', { status: 500 });
    }

    return NextResponse.redirect(url, {
      headers: {
        'Cache-Control': 'private, max-age=3000, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[Image API] Error generating presigned URL:', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(
      `Failed to generate URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
