#!/usr/bin/env python3
"""
R2 Sync Script
Compares profiles_metadata.json R2 keys against actual R2 bucket contents
and re-uploads any missing objects.
"""

import json
import os
import sys
import boto3
from pathlib import Path
from dotenv import load_dotenv

# Load environment
base_dir = Path(__file__).parent
load_dotenv(dotenv_path=base_dir / '.env', override=True)

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

# Load metadata
metadata_file = base_dir / 'data' / 'profiles_metadata.json'
with open(metadata_file, 'r', encoding='utf-8') as f:
    metadata = json.load(f)

profiles = metadata['profiles']
print(f"📊 Loaded {len(profiles)} profiles from metadata")

# Get all R2 keys from metadata
metadata_keys = set()
profile_by_key = {}
for profile in profiles.values():
    r2_key = profile.get('original_image_r2_key')
    if r2_key:
        metadata_keys.add(r2_key)
        profile_by_key[r2_key] = profile

print(f"📊 Expected R2 keys: {len(metadata_keys)}")
print()

# Connect to R2 and list all objects
print("🔍 Connecting to R2 and listing objects...")
s3_client = boto3.client(
    's3',
    endpoint_url=r2_endpoint,
    aws_access_key_id=r2_access_key,
    aws_secret_access_key=r2_secret_key
)

# List all objects in bucket
r2_keys = set()
paginator = s3_client.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket=r2_bucket):
    if 'Contents' in page:
        for obj in page['Contents']:
            r2_keys.add(obj['Key'])

print(f"📊 Actual R2 objects: {len(r2_keys)}")
print()

# Find missing
missing_keys = metadata_keys - r2_keys
if not missing_keys:
    print("✅ All objects present in R2 - no sync needed!")
    sys.exit(0)

print(f"⚠️  Found {len(missing_keys)} missing object(s):")
for key in missing_keys:
    profile = profile_by_key[key]
    print(f"  - {key}")
    print(f"    Username: {profile.get('username')}")
    print(f"    ID: {profile.get('instagram_id')}")
print()

# Re-upload missing objects
confirm = input(f"Re-upload {len(missing_keys)} missing object(s)? (yes/no): ").strip().lower()
if confirm != 'yes':
    print("❌ Cancelled")
    sys.exit(0)

print()
print("🚀 Re-uploading missing objects...")
profile_photos_dir = base_dir / 'profile_photos'

success_count = 0
fail_count = 0

for key in missing_keys:
    profile = profile_by_key[key]
    username = profile.get('username')
    local_path = profile.get('local_path')
    
    if not local_path or not Path(local_path).exists():
        print(f"  ✗ {username}: Local file not found ({local_path})")
        fail_count += 1
        continue
    
    try:
        # Read local file
        with open(local_path, 'rb') as f:
            image_bytes = f.read()
        
        # Upload to R2
        s3_client.put_object(
            Bucket=r2_bucket,
            Key=key,
            Body=image_bytes,
            ContentType='image/jpeg'
        )
        
        print(f"  ✓ {username}: Uploaded {key}")
        success_count += 1
        
    except Exception as e:
        print(f"  ✗ {username}: Failed - {e}")
        fail_count += 1

print()
print("=" * 70)
print("📊 Sync Complete")
print("=" * 70)
print(f"  ✓ Uploaded: {success_count}")
print(f"  ✗ Failed: {fail_count}")
print("=" * 70)
