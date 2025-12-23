#!/usr/bin/env python3
"""
Generate Collage Grid Frames Script
Downloads random profile images from R2 and creates collage grid frames.
Generates ~30 frames with varied grid layouts (2x2, 3x3, 4x4, etc.)
Output: 1080x1080 square frames saved to gitignored folder.
"""

import json
import os
import sys
import boto3
import random
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

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
output_dir = base_dir / 'collage_frames'
output_dir.mkdir(exist_ok=True)
print(f"📁 Output directory: {output_dir}")
print()

# Configuration
FRAME_WIDTH = 1080   # 9:16 aspect ratio
FRAME_HEIGHT = 1920
NUM_FRAMES = 22  # 22 frames with minimal reuse
GRID_LAYOUTS = [
    (9, 16),  # 144 images - perfect 9:16 aspect ratio
]
IMAGES_PER_FRAME_MIN = 3000  # Use all available images

# Load metadata
metadata_file = base_dir / 'web' / 'src' / 'data' / 'profiles_metadata.json'
if not metadata_file.exists():
    metadata_file = base_dir / 'profiles_metadata.json'

if not metadata_file.exists():
    print(f"❌ Could not find profiles_metadata.json")
    sys.exit(1)

with open(metadata_file, 'r', encoding='utf-8') as f:
    metadata = json.load(f)

profiles = metadata['profiles']
print(f"📊 Loaded {len(profiles)} total profiles")

# Collect all profiles with images
profiles_with_images = []
for profile_id, profile in profiles.items():
    r2_key = profile.get('v2_image_r2_key') or profile.get('v1_image_r2_key') or profile.get('original_image_r2_key')
    if r2_key:
        profiles_with_images.append({
            'id': profile_id,
            'username': profile.get('username', 'unknown'),
            'r2_key': r2_key
        })

print(f"🖼️  Found {len(profiles_with_images)} profiles with images")
print()

# Connect to R2
print("🔍 Connecting to R2...")
s3_client = boto3.client(
    's3',
    endpoint_url=r2_endpoint,
    aws_access_key_id=r2_access_key,
    aws_secret_access_key=r2_secret_key
)

def download_image_from_r2(r2_key: str) -> Image.Image:
    """Download image from R2 and return PIL Image"""
    response = s3_client.get_object(Bucket=r2_bucket, Key=r2_key)
    image_data = response['Body'].read()
    return Image.open(BytesIO(image_data)).convert('RGB')

def download_profile_image(profile: dict) -> tuple:
    """Download a single profile image, returns (profile, image) or (profile, None) on error"""
    try:
        img = download_image_from_r2(profile['r2_key'])
        return (profile, img)
    except Exception as e:
        return (profile, None)

def create_collage(images: List[Image.Image], grid_size: Tuple[int, int]) -> Image.Image:
    """Create a 9:16 collage from images with given grid layout"""
    cols, rows = grid_size  # cols=9, rows=16
    cell_width = FRAME_WIDTH // cols
    cell_height = FRAME_HEIGHT // rows
    
    # Create blank canvas
    collage = Image.new('RGB', (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0))
    
    # Place images in grid
    for idx, img in enumerate(images[:cols * rows]):
        col = idx % cols
        row = idx // cols
        
        # Resize and crop image to cell size
        img_resized = img.resize((cell_width, cell_height), Image.Resampling.LANCZOS)
        
        x = col * cell_width
        y = row * cell_height
        collage.paste(img_resized, (x, y))
    
    return collage

# Generate frames
print(f"🎨 Generating {NUM_FRAMES} collage frame(s)...")
print()

# Calculate total images needed
total_images_needed = sum(rows * cols for rows, cols in GRID_LAYOUTS) * (NUM_FRAMES // len(GRID_LAYOUTS))
total_images_needed = max(total_images_needed, IMAGES_PER_FRAME_MIN)

# Sample random profiles
sample_size = min(len(profiles_with_images), total_images_needed)
sampled_profiles = random.sample(profiles_with_images, sample_size)
print(f"🎲 Selected {sample_size} random profiles for collages")
print()

# Download all images first
print("⬇️  Downloading images from R2 (parallel)...")
downloaded_images = []

# Use ThreadPoolExecutor for concurrent downloads (20 workers)
with ThreadPoolExecutor(max_workers=20) as executor:
    # Submit all download tasks
    future_to_profile = {executor.submit(download_profile_image, profile): profile for profile in sampled_profiles}
    
    # Process completed downloads
    completed = 0
    for future in as_completed(future_to_profile):
        profile, img = future.result()
        completed += 1
        print(f"  [{completed}/{len(sampled_profiles)}] {profile['username']}", end='\r')
        if img is not None:
            downloaded_images.append(img)
        else:
            print(f"\n  ⚠️  Failed to download {profile['username']}")

print(f"\n✅ Downloaded {len(downloaded_images)} images")
print()

# Shuffle images
random.shuffle(downloaded_images)

# Generate frames
success_count = 0
image_idx = 0

for frame_num in range(NUM_FRAMES):
    # Pick random grid layout
    grid_size = random.choice(GRID_LAYOUTS)
    cols, rows = grid_size  # cols=9, rows=16
    images_needed = cols * rows
    
    # Check if we have enough images
    if image_idx + images_needed > len(downloaded_images):
        # Reshuffle and restart if needed
        random.shuffle(downloaded_images)
        image_idx = 0
    
    # Get images for this frame
    frame_images = downloaded_images[image_idx:image_idx + images_needed]
    image_idx += images_needed
    
    try:
        print(f"🖼️  Frame {frame_num + 1}/{NUM_FRAMES}: {cols}x{rows} grid ({len(frame_images)} images)...", end=' ')
        
        # Create collage
        collage = create_collage(frame_images, grid_size)
        
        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save frame
        output_file = output_dir / f"frame_{frame_num + 1:03d}_{cols}x{rows}.jpg"
        collage.save(output_file, 'JPEG', quality=95)
        
        print(f"✅")
        success_count += 1
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

print()
print("=" * 60)
print(f"✅ Generated {success_count} collage frame(s)")
print(f"📁 Frames saved to: {output_dir}")
print(f"📐 Resolution: {FRAME_WIDTH}x{FRAME_HEIGHT} pixels (9:16)")
images_reused = max(0, success_count * 144 - len(downloaded_images))
print(f"📊 Total images used: {len(downloaded_images)} unique, {images_reused} reused")
print("=" * 60)
