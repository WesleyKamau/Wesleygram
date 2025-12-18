"""
Instagram Profile Metadata Collector - DEPRECATED

⚠️  WARNING: This version is deprecated! ⚠️

Please use main_refactored.py instead:
- No Playwright dependency (lightweight)
- Full CLI interface with argparse
- Two download methods (Instascraper + GraphQL)
- Modular, function-based architecture
- No authentication required
- Better rate limiting

Usage:
    python main_refactored.py --mode followers --limit 100

See README_REFACTORED.md for details.
"""

import json
import os
import time
import random
from pathlib import Path
from datetime import datetime
from typing import Set, Dict, Optional
from enum import Enum
from dotenv import load_dotenv

# Check if playwright is installed
try:
    from playwright_downloader import InstagramPlaywrightDownloader
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("\n" + "="*70)
    print("⚠️  WARNING: Playwright not installed!")
    print("="*70)
    print("This is the deprecated Playwright-based version.")
    print("\nPlease use the new refactored version instead:")
    print("  python main_refactored.py --mode followers --limit 100")
    print("\nOr install Playwright to continue using this version:")
    print("  pip install playwright")
    print("  playwright install chromium")
    print("="*70 + "\n")
    import sys
    sys.exit(1)

class CollectionMode(Enum):
    """Enum for follower/following collection modes"""
    FOLLOWERS = "followers"
    FOLLOWING = "following"
    BOTH = "both"


class InstagramProfileDownloader:
    def __init__(self, username: str):
        self.username = username
        
        # Directory setup
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "data"
        self.metadata_file = self.data_dir / "profiles_metadata.json"

        # Ensure directories exist
        self.data_dir.mkdir(exist_ok=True)

        # Load existing metadata
        self.metadata = self._load_metadata()
        
        # Initialize sets for followers/following
        self.followers_set: Set[str] = set()
        self.following_set: Set[str] = set()
    
    def _load_metadata(self) -> Dict:
        """Load existing metadata or create new structure"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return self._normalize_metadata_keys(data)
        return {
            "last_updated": None,
            "owner_username": self.username,
            "profiles": {}
        }

    def _normalize_metadata_keys(self, data: Dict) -> Dict:
        """Ensure profiles are keyed by instagram_id (not username/unique_id)"""
        profiles = data.get("profiles", {})
        normalized = {}

        for key, record in profiles.items():
            instagram_id = record.get("instagram_id")
            new_key = str(instagram_id) if instagram_id else key

            merged = normalized.get(new_key, {})
            merged.update(record)

            # Ensure defaults for required fields (new schema)
            merged.setdefault("processed", False)
            merged.setdefault("status", "pending")
            merged.setdefault("original_image_r2_key", None)
            merged.setdefault("image_hash", None)
            merged.setdefault("last_processed_at", None)
            merged.setdefault("model_version", None)
            merged.setdefault("inference_timestamp", None)
            merged.setdefault("error", None)
            merged.setdefault("output_r2_key", None)
            merged.setdefault("is_follower", False)
            merged.setdefault("is_following", False)

            # Preserve prior state if already present
            if new_key in normalized:
                existing = normalized[new_key]
                merged["processed"] = bool(existing.get("processed") or merged.get("processed"))
                merged["status"] = existing.get("status", merged.get("status"))
                merged["error"] = existing.get("error") if existing.get("error") else merged.get("error")
                merged["original_image_r2_key"] = existing.get("original_image_r2_key") or merged.get("original_image_r2_key")
                merged["output_r2_key"] = existing.get("output_r2_key") or merged.get("output_r2_key")
                merged["image_hash"] = existing.get("image_hash") or merged.get("image_hash")
                merged["model_version"] = existing.get("model_version") or merged.get("model_version")
                merged["inference_timestamp"] = existing.get("inference_timestamp") or merged.get("inference_timestamp")
                merged["last_processed_at"] = existing.get("last_processed_at") or merged.get("last_processed_at")
                merged["is_follower"] = bool(existing.get("is_follower") or merged.get("is_follower"))
                merged["is_following"] = bool(existing.get("is_following") or merged.get("is_following"))

            normalized[new_key] = merged

        data["profiles"] = normalized
        return data

    def _save_metadata(self):
        """Atomically save metadata to JSON with a backup to avoid corruption."""
        self.metadata["last_updated"] = datetime.now().isoformat()
        tmp_path = self.metadata_file.with_suffix(self.metadata_file.suffix + ".tmp")
        bak_path = self.metadata_file.with_suffix(self.metadata_file.suffix + ".bak")

        # Write to temp file first
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)

        # Backup existing metadata file if present
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as src, open(bak_path, 'w', encoding='utf-8') as dst:
                    dst.write(src.read())
            except Exception:
                # If backup fails, proceed with replace to avoid blocking saves
                pass

        # Atomic replace
        os.replace(tmp_path, self.metadata_file)

    def _mark_failure(self, username: str, error_message: str):
        """Mark a username as failed in metadata without losing flags."""
        is_follower = username in self.followers_set
        is_following = username in self.following_set

        # Find existing record if any
        existing_key = self._find_record_key_by_username(username)
        if existing_key:
            record = self.metadata["profiles"][existing_key]
        else:
            # Minimal record keyed by username to be normalized later
            record = {
                "instagram_id": None,
                "username": username,
                "full_name": None,
                "biography": None,
                "is_verified": None,
                "is_private": None,
                "follower_count": None,
                "following_count": None,
                "post_count": None,
                "original_image_r2_key": None,
                "image_hash": None,
                "processed": False,
                "status": "failed",
                "error": None,
                "last_processed_at": None,
                "output_r2_key": None,
                "model_version": None,
                "inference_timestamp": None,
                "is_follower": False,
                "is_following": False,
            }

        record["status"] = "failed"
        record["error"] = error_message
        record["last_processed_at"] = datetime.now().isoformat()
        record["is_follower"] = is_follower
        record["is_following"] = is_following

        record_key = str(record.get("instagram_id") or record.get("username"))
        self.metadata["profiles"][record_key] = record
        # Save immediately to persist failure state
        self._save_metadata()
    
    def load_export_files(self):
        """
        Load followers and following from exported Instagram JSON files into memory.
        """
        followers_file = self.data_dir / "followers_1.json"
        following_file = self.data_dir / "following.json"
        
        # Load followers
        if followers_file.exists():
            try:
                with open(followers_file, 'r', encoding='utf-8') as f:
                    followers_data = json.load(f)
                
                if isinstance(followers_data, list):
                    for item in followers_data:
                        if isinstance(item, dict):
                            string_list = item.get("string_list_data", [])
                            if string_list and len(string_list) > 0:
                                username = string_list[0].get("value")
                                if username:
                                    self.followers_set.add(username)
                print(f"  ✓ Loaded {len(self.followers_set)} followers from export")
            except Exception as e:
                print(f"  ✗ Error loading followers: {e}")
        
        # Load following
        if following_file.exists():
            try:
                with open(following_file, 'r', encoding='utf-8') as f:
                    following_data = json.load(f)
                
                if isinstance(following_data, dict):
                    following_list = following_data.get("relationships_following", [])
                    if isinstance(following_list, list):
                        for item in following_list:
                            if isinstance(item, dict):
                                title = item.get("title")
                                if title:
                                    self.following_set.add(title)
                print(f"  ✓ Loaded {len(self.following_set)} following from export")
            except Exception as e:
                print(f"  ✗ Error loading following: {e}")

    def _find_record_key_by_username(self, username: str) -> Optional[str]:
        """Find an existing record key by username to avoid refetching"""
        for key, record in self.metadata.get("profiles", {}).items():
            if record.get("username") == username:
                return key
        return None

    def get_existing_usernames(self) -> Set[str]:
        """Return a set of usernames already present in metadata."""
        profiles = self.metadata.get("profiles", {})
        return {r.get("username") for r in profiles.values() if r.get("username")}
    
    def get_followers_and_following(self, limit: Optional[int] = None) -> tuple[Set[str], Set[str]]:
        """
        Note: Followers/following lists require authentication and cannot be accessed via ASP.
        This is a limitation of Instagram's private API.
        Returns empty sets; profiles must be provided separately.
        """
        print(f"\nNote: Followers/following are not accessible without authentication.")
        print(f"Returning empty set. Provide target usernames manually or via a file.\n")
        return set(), set()

    def _scrape_profile(self, username: str) -> Dict:
        """Create initial profile record structure. No longer fetches live data."""
        
        record = {
            "instagram_id": None,  # Will be populated during Playwright capture
            "username": username,
            "full_name": None,
            "biography": None,
            "is_verified": None,
            "is_private": None,
            "follower_count": None,
            "following_count": None,
            "post_count": None,
            # R2 storage fields
            "original_image_r2_key": None,
            "image_hash": None,
            # Processing state
            "processed": False,
            "status": "pending",  # pending | processing | completed | failed
            "error": None,
            "last_processed_at": None,
            # ML inference fields (for later)
            "output_r2_key": None,
            "model_version": None,
            "inference_timestamp": None,
            # Relationship flags
            "is_follower": False,
            "is_following": False,
        }

        return record

    def _scrape_follow_list(self, instagram_id: str, *, list_type: str, limit: Optional[int]) -> Set[str]:
        """
        Deprecated: Friendship endpoints require authentication.
        This method is no longer used.
        """
        return set()

    def collect_profile_with_image(self, username: str, playwright_downloader: InstagramPlaywrightDownloader) -> bool:
        """
        Process a single profile: extract metadata and download profile picture.
        Uses Playwright browser automation instead of API scraping.
        """
        
        # Determine flags based on loaded export files
        is_follower = username in self.followers_set
        is_following = username in self.following_set
        
        existing_key = self._find_record_key_by_username(username)
        if existing_key:
            record = self.metadata["profiles"][existing_key]
            
            # Check if already completed
            if record.get("status") == "completed" and record.get("original_image_r2_key"):
                print(f"  ⊙ Already completed, skipping")
                return True
            
            # Update flags
            record["is_follower"] = is_follower
            record["is_following"] = is_following
        else:
            # Create new record
            record = self._scrape_profile(username)
            record["is_follower"] = is_follower
            record["is_following"] = is_following
        
        # Mark as processing
        record["status"] = "processing"
        record_key = str(record.get("instagram_id") or record.get("username"))
        self.metadata["profiles"][record_key] = record
        self._save_metadata()
        
        try:
            # Extract profile image and metadata using Playwright
            result = playwright_downloader.extract_profile_image(username)
            
            if "error" in result:
                raise Exception(result["error"])
            
            # Update profile metadata from page data
            profile_data = result.get("profile_data", {})
            if profile_data.get("username"):
                record.update({
                    "full_name": profile_data.get("full_name"),
                    "biography": profile_data.get("biography"),
                    "is_verified": profile_data.get("is_verified"),
                    "is_private": profile_data.get("is_private"),
                    "follower_count": profile_data.get("follower_count"),
                    "following_count": profile_data.get("following_count"),
                    "post_count": profile_data.get("post_count"),
                })
            
            # Compute image hash
            image_bytes = result["image_bytes"]
            image_hash = playwright_downloader.compute_image_hash(image_bytes)
            
            # Upload to R2 (using username as ID until we extract real ID)
            instagram_id = record.get("instagram_id") or username
            r2_key = playwright_downloader.upload_to_r2(image_bytes, instagram_id)
            
            if not r2_key:
                raise Exception("R2 upload failed")
            
            # Update record with success
            record["original_image_r2_key"] = r2_key
            record["image_hash"] = image_hash
            record["status"] = "completed"
            record["processed"] = True
            record["last_processed_at"] = datetime.now().isoformat()
            record["error"] = None
            
            # Save with updated key if we got real ID
            final_key = str(record.get("instagram_id") or username)
            self.metadata["profiles"][final_key] = record
            self._save_metadata()
            
            print(f"  ✓ Completed: image uploaded to R2")
            return True
            
        except Exception as e:
            # Mark as failed
            record["status"] = "failed"
            record["error"] = str(e)
            record["last_processed_at"] = datetime.now().isoformat()
            
            final_key = str(record.get("instagram_id") or username)
            self.metadata["profiles"][final_key] = record
            self._save_metadata()
            
            print(f"  ✗ Failed: {e}")
            return False

    def collect_profile_metadata(self, username: str) -> bool:
        """Collect metadata for a single user via Instaloader"""
        
        # Determine flags based on loaded export files
        is_follower = username in self.followers_set
        is_following = username in self.following_set
        
        existing_key = self._find_record_key_by_username(username)
        if existing_key:
            record = self.metadata["profiles"][existing_key]
            # Update flags
            record["is_follower"] = is_follower
            record["is_following"] = is_following
            self.metadata["profiles"][existing_key] = record
            return True

        try:
            record = self._scrape_profile(username)
            record_key = str(record.get("instagram_id") or record.get("username"))
            record["is_follower"] = is_follower
            record["is_following"] = is_following

            self.metadata["profiles"][record_key] = record
            print(f"  ✓ Collected @{username}")
            return True

        except Exception as e:
            print(f"  ✗ Error collecting @{username}: {e}")
            return False

    def collect_all_metadata(self, limit: Optional[int] = None, mode: CollectionMode = CollectionMode.FOLLOWERS):
        """
        Deprecated: Followers/following collection requires authentication.
        Use collect_profile_metadata() with a list of usernames instead.
        """
        print("Note: Followers/following lists are not accessible without authentication.")
        print("Provide target usernames manually and call collect_profile_metadata() for each.")


def main():
    """Main entry point"""
    load_dotenv()
    
    # Initialize downloader
    TARGET_USERNAME = "wesleykamau"
    downloader = InstagramProfileDownloader(TARGET_USERNAME)
    
    print("=" * 60)
    print("Instagram Profile Picture Downloader (Playwright)")
    print("=" * 60)
    
    # Load export files
    print("\n--- Loading followers and following from exported files ---")
    downloader.load_export_files()
    
    if not downloader.followers_set and not downloader.following_set:
        print("\n✗ No followers/following data found")
        print("Make sure you have exported followers_1.json and following.json from Instagram")
        return

    # Determine collection mode
    MODE = CollectionMode.FOLLOWERS
    SKIP_EXISTING = True
    
    target_usernames = set()
    if MODE == CollectionMode.FOLLOWERS:
        target_usernames = downloader.followers_set
    elif MODE == CollectionMode.FOLLOWING:
        target_usernames = downloader.following_set
    elif MODE == CollectionMode.BOTH:
        target_usernames = downloader.followers_set | downloader.following_set
    
    # If skipping existing, filter them out
    if SKIP_EXISTING:
        existing = downloader.get_existing_usernames()
        before = len(target_usernames)
        target_usernames = {u for u in target_usernames if u not in existing}
        skipped = before - len(target_usernames)
        print(f"\nSkip-existing mode ON: {skipped} already in metadata; {len(target_usernames)} to process.")

    print(f"\n--- Processing {len(target_usernames)} profiles via Playwright (Mode: {MODE.value}) ---\n")
    
    # Initialize Playwright downloader
    pw_downloader = InstagramPlaywrightDownloader(downloader.data_dir)
    
    try:
        pw_downloader.start_browser()
        
        # Check if we need to login
        if not pw_downloader.session_file.exists():
            print("No saved session found. Starting interactive login...\n")
            pw_downloader.login_interactive()
        else:
            print(f"Found saved session: {pw_downloader.session_file.name}")
            if not pw_downloader.verify_session():
                print("\nSession expired or invalid. Starting interactive login...\n")
                pw_downloader.login_interactive()
            else:
                print("✓ Session is valid\n")
        
        success_count = 0
        fail_count = 0
        
        # Sort for consistent order
        sorted_usernames = sorted(list(target_usernames))[:10]  # Limit for testing

        for i, username in enumerate(sorted_usernames, 1):
            print(f"[{i}/{len(sorted_usernames)}] Processing @{username}...")

            attempt = 0
            max_attempts = 3
            collected = False
            last_err = None

            while attempt < max_attempts and not collected:
                try:
                    collected = downloader.collect_profile_with_image(username, pw_downloader)
                    if collected:
                        success_count += 1
                        # Polite delay between profiles
                        time.sleep(random.uniform(3, 6))
                        break
                except Exception as e:
                    last_err = e
                    print(f"  Attempt {attempt + 1} failed: {e}")
                
                attempt += 1
                if attempt < max_attempts:
                    # Exponential backoff on retry
                    backoff = min(30, 2 ** attempt + random.uniform(0, 3))
                    time.sleep(backoff)

            if not collected:
                fail_count += 1
                downloader._mark_failure(username, str(last_err) if last_err else "Unknown error")
                # Longer delay after permanent failure
                time.sleep(random.uniform(5, 10))
                
    except KeyboardInterrupt:
        print("\nInterrupted by user. Progress saved.\n")
    finally:
        # Always cleanup Playwright resources
        pw_downloader.close()
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total loaded from files:")
    print(f"  - Followers: {len(downloader.followers_set)}")
    print(f"  - Following: {len(downloader.following_set)}")
    print(f"Profiles processed in this run: {success_count} success, {fail_count} failed")
    print(f"Metadata saved to: {downloader.metadata_file}")
    print("=" * 60)


if __name__ == "__main__":
    main()
