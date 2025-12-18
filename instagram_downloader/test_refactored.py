#!/usr/bin/env python3
"""
Test script for the refactored Instagram profile collector
Tests both Instascraper and GraphQL methods on a few public profiles
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from main_refactored import (
    download_with_instascraper,
    fetch_profile_with_graphql,
    download_profile_picture,
    compute_image_hash,
    DownloadMethod
)

def test_instascraper():
    """Test the Instascraper method"""
    print("\n" + "="*60)
    print("Testing Instascraper Method")
    print("="*60)
    
    test_username = "instagram"  # Official Instagram account (public)
    output_dir = Path(__file__).parent / "test_photos"
    output_dir.mkdir(exist_ok=True)
    
    try:
        print(f"\nFetching profile for @{test_username}...")
        result = download_with_instascraper(test_username, output_dir)
        
        if "error" in result:
            print(f"❌ Error: {result['error']}")
            return False
        
        print(f"✅ Success!")
        print(f"   Instagram ID: {result['instagram_id']}")
        print(f"   Full Name: {result['full_name']}")
        print(f"   Followers: {result['follower_count']:,}")
        print(f"   Is Verified: {result['is_verified']}")
        print(f"   Is Private: {result['is_private']}")
        print(f"   Image Hash: {result['image_hash'][:16]}...")
        print(f"   Local Path: {result['local_path']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def test_graphql():
    """Test the GraphQL method"""
    print("\n" + "="*60)
    print("Testing GraphQL Method (Experimental)")
    print("="*60)
    
    test_username = "instagram"  # Official Instagram account (public)
    output_dir = Path(__file__).parent / "test_photos"
    output_dir.mkdir(exist_ok=True)
    
    try:
        print(f"\nFetching profile for @{test_username}...")
        result = fetch_profile_with_graphql(test_username)
        
        if "error" in result:
            print(f"❌ Error: {result['error']}")
            return False
        
        print(f"✅ Success!")
        print(f"   Instagram ID: {result['instagram_id']}")
        print(f"   Full Name: {result['full_name']}")
        print(f"   Followers: {result['follower_count']:,}")
        print(f"   Is Verified: {result['is_verified']}")
        print(f"   Is Private: {result['is_private']}")
        print(f"   Profile Pic URL: {result['profile_pic_url'][:50]}...")
        
        # Test downloading the profile picture
        print(f"\nDownloading profile picture...")
        try:
            image_bytes, image_hash, local_path = download_profile_picture(
                result['profile_pic_url'],
                test_username,
                output_dir
            )
            print(f"✅ Image downloaded!")
            print(f"   Size: {len(image_bytes):,} bytes")
            print(f"   Hash: {image_hash[:16]}...")
            print(f"   Path: {local_path}")
            
        except Exception as e:
            print(f"❌ Failed to download image: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("Instagram Profile Collector - Test Suite")
    print("="*60)
    print("\nThis will test both collection methods on the")
    print("official @instagram account (public profile)")
    print("\n⚠️  Note: Tests make real HTTP requests to Instagram")
    print("="*60)
    
    results = []
    
    # Test Instascraper
    results.append(("Instascraper", test_instascraper()))
    
    # Wait a bit before second test
    import time
    print("\n⏱️  Waiting 5 seconds before GraphQL test...")
    time.sleep(5)
    
    # Test GraphQL
    results.append(("GraphQL", test_graphql()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for method, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{method:20} {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 All tests passed!")
        print("="*60)
        return 0
    else:
        print("⚠️  Some tests failed. Check output above.")
        print("="*60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
