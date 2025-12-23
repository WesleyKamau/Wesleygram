#!/usr/bin/env python3
"""
Download Featured Processed Images Script
Downloads v2 processed images for all featured profiles in source quality.
Images are saved to a gitignored folder with random number names.
"""

import json
import os
import sys
import boto3
import random
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, List

# Load environment
base_dir = Path(__file__).parent
load_dotenv(dotenv_path=base_dir / 'instagram_downloader' / '.env', override=True)

# R2 credentials
r2_endpoint = os.getenv('R2_ENDPOINT_URL') or os.getenv('R2_ENDPOINT')
r2_access_key = os.getenv('R2_ACCESS_KEY_ID') or os.getenv('R2_ACCESS_KEY')
r2_secret_key = os.getenv('R2_SECRET_ACCESS_KEY') or os.getenv('R2_SECRET_KEY')
r2_bucket = os.getenv('R2_BUCKET_NAME') or os.getenv('R2_BUCKET') or 'instagram-profiles'

if not all([r2_endpoint, r2_access_key, r2_secret_key]):
    print("❌ R2 credentials not configured in .env")
    sys.exit(1)

print(f"🔧 R2 Bucket: {r2_bucket}")
print(f"🔧 Endpoint: {r2_endpoint}")
print()

# Output directory
output_dir = base_dir / 'featured_images'
output_dir.mkdir(exist_ok=True)
print(f"📁 Output directory: {output_dir}")
print()

# Load metadata
metadata_file = base_dir / 'web' / 'src' / 'data' / 'profiles_metadata.json'
if not metadata_file.exists():
    # Try alternate location
    metadata_file = base_dir / 'profiles_metadata.json'

if not metadata_file.exists():
    print(f"❌ Could not find profiles_metadata.json")
    sys.exit(1)

with open(metadata_file, 'r', encoding='utf-8') as f:
    metadata = json.load(f)

profiles = metadata['profiles']
print(f"📊 Loaded {len(profiles)} total profiles")

# Filter featured profiles
featured_profiles = {
    profile_id: profile 
    for profile_id, profile in profiles.items() 
    if profile.get('featured') == True
}

print(f"⭐ Found {len(featured_profiles)} featured profiles")
print()

# Connect to R2
print("🔍 Connecting to R2...")
s3_client = boto3.client(
    's3',
    endpoint_url=r2_endpoint,
    aws_access_key_id=r2_access_key,
    aws_secret_access_key=r2_secret_key
)

# Create random number mapping
profile_list = list(featured_profiles.items())
random.shuffle(profile_list)
username_mapping = {}

# Download each featured image
success_count = 0
error_count = 0
skipped_count = 0

for idx, (profile_id, profile) in enumerate(profile_list, start=1):
    username = profile.get('username', 'unknown')
    
    # Prefer v2 image, fallback to v1, then original
    r2_key = profile.get('v2_image_r2_key') or profile.get('v1_image_r2_key') or profile.get('original_image_r2_key')
    
    if not r2_key:
        print(f"⚠️  {username}: No image key found")
        skipped_count += 1
        continue
    
    # Determine file extension from R2 key
    file_ext = Path(r2_key).suffix or '.png'
    random_number = f"{idx:04d}"  # Zero-padded 4-digit number
    output_file = output_dir / f"{random_number}{file_ext}"
    
    # Store mapping
    username_mapping[random_number] = username
    
    # Skip if already downloaded
    if output_file.exists():
        print(f"⏭️  {random_number} ({username}): Already downloaded")
        skipped_count += 1
        continue
    
    try:
        print(f"⬇️  Downloading {random_number} ({username}) from {r2_key}...", end=' ')
        
        # Download from R2
        s3_client.download_file(r2_bucket, r2_key, str(output_file))
        
        print(f"✅")
        success_count += 1
        
    except Exception as e:
        print(f"❌ Error: {e}")
        error_count += 1

# Save username mapping
mapping_file = output_dir / 'username_mapping.json'
with open(mapping_file, 'w', encoding='utf-8') as f:
    json.dump(username_mapping, f, indent=2, ensure_ascii=False)

print()
print("=" * 60)
print(f"✅ Downloaded: {success_count}")
print(f"⏭️  Skipped: {skipped_count}")
print(f"❌ Errors: {error_count}")
print(f"📁 Images saved to: {output_dir}")
print(f"🗺️  Username mapping saved to: {mapping_file}")
print("=" * 60)
