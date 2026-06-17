import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Only allow this endpoint in development
const isDev = process.env.NODE_ENV !== 'production';

export async function POST(request: NextRequest) {
  if (!isDev) {
    return new NextResponse('Not available in production', { status: 403 });
  }

  try {
    const { instagram_id, field, value } = await request.json();

    if (!instagram_id || !field || typeof value !== 'boolean') {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    if (field !== 'featured' && field !== 'hidden') {
      return new NextResponse('Invalid field. Must be "featured" or "hidden"', { status: 400 });
    }

    // Path to profiles_metadata.json (in web/src/data folder - the file the website reads)
    const metadataPath = path.resolve(process.cwd(), 'src', 'data', 'profiles_metadata.json');
    console.log('[Metadata API] Updating file at:', metadataPath);

    // Read the current metadata as string to preserve formatting
    const fileContent = await fs.readFile(metadataPath, 'utf-8');

    // Find the profile block
    // Look for "instagram_id": {
    const profileStartMarker = `"${instagram_id}": {`;
    const profileStartIndex = fileContent.indexOf(profileStartMarker);

    if (profileStartIndex === -1) {
      console.error(`[Metadata API] Profile ${instagram_id} not found in ${metadataPath}`);
      return new NextResponse('Profile not found', { status: 404 });
    }

    // Find the end of the profile block (next closing brace with 4 spaces indentation)
    // This is a heuristic but should work for this specific file structure
    const profileEndIndex = fileContent.indexOf('    },', profileStartIndex);
    
    if (profileEndIndex === -1) {
       console.error(`[Metadata API] Could not find end of profile block for ${instagram_id}`);
       return new NextResponse('Profile structure parse error', { status: 500 });
    }

    const profileBlock = fileContent.substring(profileStartIndex, profileEndIndex);
    
    // Check if field already exists
    const fieldRegex = new RegExp(`"${field}":\\s*(true|false),?\\s*\\n`, 'g');
    const fieldExists = fieldRegex.test(profileBlock);

    let newFileContent = fileContent;

    if (value) {
      // Setting the flag to true: drop any existing entry to avoid duplicates,
      // then insert a fresh one at the top of the profile block.
      let updatedBlock = profileBlock.replace(fieldRegex, '');

      const insertPoint = profileStartMarker.length;
      updatedBlock = updatedBlock.slice(0, insertPoint) + `\n      "${field}": true,` + updatedBlock.slice(insertPoint);
      
      // Replace in original content
      newFileContent = fileContent.substring(0, profileStartIndex) + updatedBlock + fileContent.substring(profileEndIndex);
      
    } else {
      // We want to remove it (value=false)
      if (fieldExists) {
        const updatedBlock = profileBlock.replace(fieldRegex, '');
        newFileContent = fileContent.substring(0, profileStartIndex) + updatedBlock + fileContent.substring(profileEndIndex);
      }
    }

    // Write back to file
    await fs.writeFile(metadataPath, newFileContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      instagram_id,
      field,
      value,
      message: `Successfully ${value ? 'set' : 'removed'} ${field} flag`
    });
  } catch (error) {
    console.error('[Metadata API] Error:', error);
    return new NextResponse(
      `Failed to update metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
