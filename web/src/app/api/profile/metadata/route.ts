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
    let fileContent = await fs.readFile(metadataPath, 'utf-8');

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
      // We want to set it to true
      if (fieldExists) {
        // Update existing (though it's boolean, so maybe just replace)
        // If it's already true, do nothing? Or replace to be sure.
        // Since we're doing string manipulation, let's just remove it first then add it back, 
        // or replace the line.
        // Actually, if it exists, let's replace it.
        // But regex replace on the whole file is risky if ID is not unique (unlikely for keys).
        // Safer: reconstruct the profile block.
        
        // Let's just remove it first if it exists, then add it.
        // Actually, simpler:
        // If we are adding (value=true):
        // 1. Remove any existing entry for this field in this block.
        // 2. Insert the new entry at the top of the block.
      }
      
      // Remove existing if any (to avoid duplicates or wrong values)
      let updatedBlock = profileBlock.replace(fieldRegex, '');
      
      // Insert at the top: after the opening brace
      // The marker is `"${instagram_id}": {`
      // We want to add `\n      "${field}": true,` after it.
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
