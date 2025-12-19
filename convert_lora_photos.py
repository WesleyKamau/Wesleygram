"""
Convert HEIC photos to JPG with consistent numbering for LoRA training.
"""
import os
from pathlib import Path
from PIL import Image
from pillow_heif import register_heif_opener
from datetime import datetime

# Register HEIF opener with Pillow
register_heif_opener()

def convert_lora_photos(source_dir: str, output_dir: str = None, quality: int = 95):
    """
    Convert HEIC photos to JPG with numbered filenames.
    
    Args:
        source_dir: Directory containing HEIC files
        output_dir: Output directory (defaults to converted_TIMESTAMP in source_dir)
        quality: JPG quality (1-100, default 95 for LoRA training)
    """
    source_path = Path(source_dir)
    
    # Create output directory with timestamp
    if output_dir is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = source_path / f"converted_{timestamp}"
    else:
        output_path = Path(output_dir)
    
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Get all image files (use set to avoid duplicates on case-insensitive filesystems)
    all_files = set()
    for pattern in ["*.HEIC", "*.heic", "*.JPG", "*.jpg", "*.JPEG", "*.jpeg"]:
        all_files.update(source_path.glob(pattern))
    
    # Convert to sorted list
    all_files = sorted([f for f in all_files if f.is_file()])
    
    print(f"Found {len(all_files)} image files to process")
    print(f"Output directory: {output_path}")
    print(f"JPG quality: {quality}")
    print()
    
    converted_count = 0
    skipped_count = 0
    
    for idx, file_path in enumerate(all_files, start=1):
        output_filename = f"{idx:04d}.jpg"
        output_file = output_path / output_filename
        
        try:
            # Open image (works for both HEIC and JPG)
            with Image.open(file_path) as img:
                # Convert to RGB if necessary (HEIC images might be in different color modes)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Convert RGBA/LA to RGB with white background
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Save as JPG with high quality
                img.save(output_file, 'JPEG', quality=quality, optimize=True)
                
            converted_count += 1
            print(f"✓ Converted: {file_path.name} → {output_filename}")
            
        except Exception as e:
            skipped_count += 1
            print(f"✗ Error converting {file_path.name}: {e}")
    
    print()
    print(f"Conversion complete!")
    print(f"  Converted: {converted_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Output: {output_path.absolute()}")
    
    return output_path


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert HEIC photos to JPG for LoRA training")
    parser.add_argument("--source", default="LoRA Photos", help="Source directory with HEIC files")
    parser.add_argument("--output", default=None, help="Output directory (default: converted_TIMESTAMP)")
    parser.add_argument("--quality", type=int, default=95, help="JPG quality 1-100 (default: 95)")
    
    args = parser.parse_args()
    
    convert_lora_photos(args.source, args.output, args.quality)
