import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Dev-only authoring endpoint: toggles the `featured` / `hidden` flags that
// curate the homepage. Edits the metadata via JSON.parse/stringify — the old
// string-surgery version could corrupt the file if the formatting drifted.
const isDev = process.env.NODE_ENV !== 'production';

export async function POST(request: NextRequest) {
  if (!isDev) {
    return new NextResponse('Not available in production', { status: 403 });
  }

  try {
    const { instagram_id, field, value } = await request.json();

    if (!instagram_id || typeof instagram_id !== 'string' || !field || typeof value !== 'boolean') {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    if (field !== 'featured' && field !== 'hidden') {
      return new NextResponse('Invalid field. Must be "featured" or "hidden"', { status: 400 });
    }

    // Path to profiles_metadata.json (in web/src/data folder - the file the website reads)
    const metadataPath = path.resolve(process.cwd(), 'src', 'data', 'profiles_metadata.json');

    const fileContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(fileContent) as {
      profiles: Record<string, Record<string, unknown>>;
    };

    const profile = metadata.profiles[instagram_id];
    if (!profile) {
      return new NextResponse('Profile not found', { status: 404 });
    }

    if (value) {
      profile[field] = true;
    } else {
      // The flags are tri-state-by-absence: false is represented by removing
      // the field, matching how the dataset was originally authored.
      delete profile[field];
    }

    // Write atomically (temp + rename) so a crash can't truncate the dataset.
    // 2-space indent matches scripts/generate-blur.ts output.
    const tmpPath = `${metadataPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(metadata, null, 2), 'utf-8');
    await fs.rename(tmpPath, metadataPath);

    return NextResponse.json({
      success: true,
      instagram_id,
      field,
      value,
      message: `Successfully ${value ? 'set' : 'removed'} ${field} flag`,
    });
  } catch (error) {
    console.error('[Metadata API] Error:', error);
    return new NextResponse(
      `Failed to update metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
