"""
Instagram Profile Metadata Collector
CLI tool to collect profile data using Instascraper (anonymous) and experimental GraphQL methods.
"""

import json
import os
import sys
import time
import random
import argparse
import hashlib
import requests
import boto3
from pathlib import Path
from datetime import datetime
from typing import Set, Dict, Optional, List, Tuple
from enum import Enum
from dotenv import load_dotenv
import instaloader
from urllib.parse import quote, unquote
from html import escape

# ======================== ENUMS ========================

class CollectionMode(Enum):
    """Enum for follower/following collection modes"""
    FOLLOWERS = "followers"
    FOLLOWING = "following"
    BOTH = "both"

class DownloadMethod(Enum):
    """Enum for download methods"""
    INSTASCRAPER = "instascraper"
    GRAPHQL = "graphql"

# ======================== UTILITY FUNCTIONS ========================

def compute_image_hash(image_bytes: bytes) -> str:
    """Compute SHA256 hash of image bytes"""
    return hashlib.sha256(image_bytes).hexdigest()

def save_image_locally(image_bytes: bytes, username: str, output_dir: Path) -> str:
    """Save image to local filesystem"""
    output_dir.mkdir(exist_ok=True)
    filename = f"{username}_{int(time.time())}.jpg"
    filepath = output_dir / filename
    
    with open(filepath, 'wb') as f:
        f.write(image_bytes)
    
    return str(filepath)

# ======================== DATA LOADING FUNCTIONS ========================

def load_followers_from_export(followers_file: Path) -> Set[str]:
    """Load followers from Instagram export JSON file"""
    followers_set = set()
    
    if not followers_file.exists():
        return followers_set
    
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
                            followers_set.add(username)
        
        print(f"  ✓ Loaded {len(followers_set)} followers from export")
    except Exception as e:
        print(f"  ✗ Error loading followers: {e}")
    
    return followers_set

def load_following_from_export(following_file: Path) -> Set[str]:
    """Load following from Instagram export JSON file"""
    following_set = set()
    
    if not following_file.exists():
        return following_set
    
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
                            following_set.add(title)
        
        print(f"  ✓ Loaded {len(following_set)} following from export")
    except Exception as e:
        print(f"  ✗ Error loading following: {e}")
    
    return following_set

def load_followers_following_from_ids(ids_file: Path) -> Tuple[Set[str], Set[str], Dict[str, str]]:
    """Load followers and following from a consolidated ids.json file.
    Expects a JSON with keys: 'followers' and 'following', each a list of
    objects containing at least 'username' and 'id'.
    Returns two sets of usernames.
    """
    followers_set: Set[str] = set()
    following_set: Set[str] = set()
    username_id_map: Dict[str, str] = {}

    if not ids_file.exists():
        print(f"  ✗ ids.json not found at: {ids_file}")
        return followers_set, following_set, username_id_map

    try:
        with open(ids_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        followers = data.get('followers', [])
        following = data.get('following', [])

        for item in followers:
            username = item.get('username')
            uid = item.get('id')
            if username:
                followers_set.add(username)
                if uid:
                    username_id_map[username] = str(uid)

        for item in following:
            username = item.get('username')
            uid = item.get('id')
            if username:
                following_set.add(username)
                if uid:
                    username_id_map[username] = str(uid)

        print(f"  ✓ Loaded {len(followers_set)} followers from ids.json")
        print(f"  ✓ Loaded {len(following_set)} following from ids.json")
    except Exception as e:
        print(f"  ✗ Error loading ids.json: {e}")

    return followers_set, following_set, username_id_map

# ======================== METADATA MANAGEMENT ========================

def load_metadata(metadata_file: Path, username: str) -> Dict:
    """Load existing metadata or create new structure"""
    if metadata_file.exists():
        with open(metadata_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return normalize_metadata_keys(data)
    
    return {
        "last_updated": None,
        "owner_username": username,
        "profiles": {}
    }

def normalize_metadata_keys(data: Dict) -> Dict:
    """Ensure profiles are keyed by instagram_id (not username/unique_id)"""
    profiles = data.get("profiles", {})
    normalized = {}

    for key, record in profiles.items():
        instagram_id = record.get("instagram_id")
        new_key = str(instagram_id) if instagram_id else key

        merged = normalized.get(new_key, {})
        merged.update(record)

        # Ensure defaults for required fields
        merged.setdefault("processed", False)
        merged.setdefault("status", "pending")
        merged.setdefault("original_image_r2_key", None)
        merged.setdefault("profile_pic_url", None)
        merged.setdefault("image_hash", None)
        merged.setdefault("last_processed_at", None)
        merged.setdefault("error", None)
        merged.setdefault("is_follower", False)
        merged.setdefault("is_following", False)
        merged.setdefault("r2_upload_status", None)
        merged.setdefault("r2_error", None)

        # Preserve prior state if already present
        if new_key in normalized:
            existing = normalized[new_key]
            merged["processed"] = bool(existing.get("processed") or merged.get("processed"))
            merged["status"] = existing.get("status", merged.get("status"))
            merged["error"] = existing.get("error") if existing.get("error") else merged.get("error")
            merged["is_follower"] = bool(existing.get("is_follower") or merged.get("is_follower"))
            merged["is_following"] = bool(existing.get("is_following") or merged.get("is_following"))

        normalized[new_key] = merged

    data["profiles"] = normalized
    return data

def save_metadata(metadata: Dict, metadata_file: Path):
    """Atomically save metadata to JSON with a backup"""
    # Normalize keys to prefer instagram_id and collapse duplicates
    metadata = normalize_metadata_keys(metadata)
    metadata["last_updated"] = datetime.now().isoformat()
    tmp_path = metadata_file.with_suffix(metadata_file.suffix + ".tmp")
    bak_path = metadata_file.with_suffix(metadata_file.suffix + ".bak")

    # Write to temp file first
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    # Backup existing metadata file if present
    if metadata_file.exists():
        try:
            with open(metadata_file, 'r', encoding='utf-8') as src, open(bak_path, 'w', encoding='utf-8') as dst:
                dst.write(src.read())
        except Exception:
            pass

    # Atomic replace
    os.replace(tmp_path, metadata_file)

def get_existing_usernames(metadata: Dict) -> Set[str]:
    """Return a set of usernames already present in metadata"""
    profiles = metadata.get("profiles", {})
    return {r.get("username") for r in profiles.values() if r.get("username")}

def find_record_key_by_username(metadata: Dict, username: str) -> Optional[str]:
    """Find an existing record key by username"""
    for key, record in metadata.get("profiles", {}).items():
        if record.get("username") == username:
            return key
    return None

# ======================== INSTASCRAPER METHOD ========================

def download_with_instascraper(username: str, output_dir: Path) -> Dict:
    """
    Download profile data using Instaloader (Instascraper alternative)
    This method is anonymous and doesn't require authentication.
    """
    try:
        loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True
        )
        
        # Load profile
        profile = instaloader.Profile.from_username(loader.context, username)
        
        # Download profile picture
        profile_pic_url = profile.profile_pic_url
        response = requests.get(profile_pic_url, timeout=10)
        response.raise_for_status()
        
        image_bytes = response.content
        image_hash = compute_image_hash(image_bytes)
        
        # Save locally
        local_path = save_image_locally(image_bytes, username, output_dir)
        
        # Build profile data
        result = {
            "instagram_id": str(profile.userid),
            "username": profile.username,
            "full_name": profile.full_name or "",
            "biography": profile.biography or "",
            "is_verified": profile.is_verified,
            "is_private": profile.is_private,
            "follower_count": profile.followers,
            "following_count": profile.followees,
            "post_count": profile.mediacount,
            "profile_pic_url": profile_pic_url,
            "image_bytes": image_bytes,
            "image_hash": image_hash,
            "local_path": local_path,
            "method": "instascraper"
        }
        
        return result
        
    except Exception as e:
        return {"error": str(e)}

# ======================== EXPERIMENTAL GRAPHQL METHOD ========================

def fetch_profile_with_graphql(username: str = "", user_id: str = "", return_raw: bool = False) -> Dict:
    """
    Experimental: Fetch profile data using Instagram's GraphQL endpoint.
    This is a low-request method that doesn't require authentication initially.
    
    Args:
        username: Instagram username (will be converted to ID first if provided)
        user_id: Instagram user ID (preferred if available)
        return_raw: If True, include raw API response in result
    
    Note: Instagram may rate-limit or block this method. Use sparingly.
    """
    try:
        raw_response = None
        
        # If only username provided, need to get user_id first via web_profile_info
        if username and not user_id:
            url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest',
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            user_id = data.get('data', {}).get('user', {}).get('id')
            if not user_id:
                return {"error": "Could not fetch user ID from username"}
        
        if not user_id:
            return {"error": "Either username or user_id must be provided"}
        
        # Use the new GraphQL query endpoint with doc_id
        variables = {"id": str(user_id), "render_surface": "PROFILE"}
        variables_json = json.dumps(variables, separators=(',', ':'))
        url = f"https://www.instagram.com/graphql/query/?doc_id=9539110062771438&variables={quote(variables_json)}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if return_raw:
            raw_response = data
        
        # Parse the new response format
        user_data = data.get('data', {}).get('user', {})
        
        if not user_data:
            return {"error": "No user data found", "raw_response": raw_response}
        
        # Extract profile picture URL (HD version)
        profile_pic_url_hd = user_data.get('hd_profile_pic_url_info', {}).get('url') or \
                            user_data.get('profile_pic_url_hd') or \
                            user_data.get('profile_pic_url')
        
        result = {
            "instagram_id": user_data.get('id') or user_id,
            "username": user_data.get('username'),
            "full_name": user_data.get('full_name', ''),
            "biography": user_data.get('biography', ''),
            "is_verified": user_data.get('is_verified', False),
            "is_private": user_data.get('is_private', False),
            "follower_count": user_data.get('follower_count') or user_data.get('edge_followed_by', {}).get('count', 0),
            "following_count": user_data.get('following_count') or user_data.get('edge_follow', {}).get('count', 0),
            "post_count": user_data.get('media_count') or user_data.get('edge_owner_to_timeline_media', {}).get('count', 0),
            "profile_pic_url": profile_pic_url_hd,
            "profile_pic_url_hd": profile_pic_url_hd,
            "method": "graphql"
        }
        
        if return_raw:
            result["raw_response"] = raw_response
        
        return result
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            return {"error": "Rate limited by Instagram. Try again later."}
        return {"error": f"HTTP error: {e}"}
    except Exception as e:
        return {"error": str(e)}

def download_profile_picture(profile_pic_url: str, username: str, output_dir: Path) -> Tuple[bytes, str, str]:
    """Download profile picture from URL and return bytes, hash, and local path"""
    try:
        response = requests.get(profile_pic_url, timeout=10)
        response.raise_for_status()
        
        image_bytes = response.content
        image_hash = compute_image_hash(image_bytes)
        local_path = save_image_locally(image_bytes, username, output_dir)
        
        return image_bytes, image_hash, local_path
        
    except Exception as e:
        raise Exception(f"Failed to download profile picture: {e}")

# ======================== PROFILE COLLECTION FUNCTIONS ========================

def collect_profile_metadata(
    username: str,
    metadata: Dict,
    followers_set: Set[str],
    following_set: Set[str],
    method: DownloadMethod,
    output_dir: Path,
    download_images: bool = True,
    upload_to_r2_enabled: bool = False,
    generate_html: bool = False,
    html_output_dir: Optional[Path] = None,
    username_id_map: Optional[Dict[str, str]] = None,
    intra_delay: float = 0.0
) -> bool:
    """
    Collect metadata and optionally download profile picture for a single user.
    
    Args:
        username: Instagram username to process
        metadata: Metadata dictionary to update
        followers_set: Set of followers
        following_set: Set of following
        method: Download method to use (instascraper or graphql)
        output_dir: Directory to save images
        download_images: Whether to download profile pictures
        upload_to_r2_enabled: Whether to upload images to R2
        generate_html: Whether to generate HTML test report
        html_output_dir: Directory for HTML reports
    
    Returns:
        True if successful, False otherwise
    """
    # Determine flags
    is_follower = username in followers_set
    is_following = username in following_set
    
    # Check if already processed
    existing_key = find_record_key_by_username(metadata, username)
    if existing_key:
        record = metadata["profiles"][existing_key]
        if record.get("status") == "completed" and (not download_images or record.get("local_path")):
            print(f"  ⊙ Already completed, skipping")
            return True
        # Update flags
        record["is_follower"] = is_follower
        record["is_following"] = is_following
    else:
        # Create new record
        record = {
            "instagram_id": (username_id_map.get(username) if username_id_map else None),
            "username": username,
            "full_name": None,
            "biography": None,
            "is_verified": None,
            "is_private": None,
            "follower_count": None,
            "following_count": None,
            "post_count": None,
            "profile_pic_url": None,
            "local_path": None,
            "image_hash": None,
            "original_image_r2_key": None,
            "r2_upload_status": None,
            "r2_error": None,
            "processed": False,
            "status": "pending",
            "error": None,
            "last_processed_at": None,
            "is_follower": is_follower,
            "is_following": is_following,
            "method": method.value
        }
    
    # Mark as processing; write under a stable initial key
    record["status"] = "processing"
    initial_key = str(record.get("instagram_id") or record.get("username"))
    metadata["profiles"][initial_key] = record
    
    try:
        # Fetch profile data based on method
        if method == DownloadMethod.INSTASCRAPER:
            if download_images:
                result = download_with_instascraper(username, output_dir)
                if generate_html and "error" not in result:
                    # Add raw response for HTML report
                    try:
                        loader = instaloader.Instaloader(quiet=True)
                        profile = instaloader.Profile.from_username(loader.context, username)
                        result["raw_response_instascraper"] = {
                            "userid": profile.userid,
                            "username": profile.username,
                            "full_name": profile.full_name,
                            "biography": profile.biography,
                            "is_verified": profile.is_verified,
                            "is_private": profile.is_private,
                            "followers": profile.followers,
                            "followees": profile.followees,
                            "mediacount": profile.mediacount,
                            "profile_pic_url": profile.profile_pic_url
                        }
                    except:
                        pass
            else:
                # Just get metadata without downloading image
                loader = instaloader.Instaloader(quiet=True)
                profile = instaloader.Profile.from_username(loader.context, username)
                result = {
                    "instagram_id": str(profile.userid),
                    "username": profile.username,
                    "full_name": profile.full_name or "",
                    "biography": profile.biography or "",
                    "is_verified": profile.is_verified,
                    "is_private": profile.is_private,
                    "follower_count": profile.followers,
                    "following_count": profile.followees,
                    "post_count": profile.mediacount,
                    "profile_pic_url": profile.profile_pic_url,
                    "method": "instascraper"
                }
                if generate_html:
                    result["raw_response_instascraper"] = {
                        "userid": profile.userid,
                        "username": profile.username,
                        "full_name": profile.full_name,
                        "biography": profile.biography,
                        "is_verified": profile.is_verified,
                        "is_private": profile.is_private,
                        "followers": profile.followers,
                        "followees": profile.followees,
                        "mediacount": profile.mediacount,
                        "profile_pic_url": profile.profile_pic_url
                    }
        
        elif method == DownloadMethod.GRAPHQL:
            # Get user ID first, then use GraphQL
            user_id = username_id_map.get(username) if username_id_map else None
            result = fetch_profile_with_graphql(username=username, user_id=user_id, return_raw=generate_html)
            
            if "error" not in result and download_images and result.get("profile_pic_url"):
                # Download the profile picture
                try:
                    if intra_delay and intra_delay > 0:
                        time.sleep(intra_delay)
                    image_bytes, image_hash, local_path = download_profile_picture(
                        result["profile_pic_url"], username, output_dir
                    )
                    result["image_bytes"] = image_bytes
                    result["image_hash"] = image_hash
                    result["local_path"] = local_path
                except Exception as e:
                    print(f"  ⚠ Failed to download image: {e}")
        
        else:
            return False
        
        # Check for errors
        if "error" in result:
            raise Exception(result["error"])
        
        # Upload to R2 if enabled
        r2_key = None
        if upload_to_r2_enabled and result.get("image_bytes"):
            instagram_id = result.get("instagram_id") or username
            r2_key = upload_to_r2(result["image_bytes"], instagram_id, "original")
            if r2_key:
                print(f"  ☁️  Uploaded to R2: {r2_key}")
                record["r2_upload_status"] = "uploaded"
                record["r2_error"] = None
            else:
                record["r2_upload_status"] = "failed"
                record["r2_error"] = record.get("r2_error") or "Upload failed or credentials missing"
        elif upload_to_r2_enabled and not result.get("image_bytes"):
            record["r2_upload_status"] = "skipped"
            record["r2_error"] = "No image bytes available"
        else:
            record["r2_upload_status"] = "disabled"
            record["r2_error"] = None
        
        # Update record with fetched data
        record.update({
            "instagram_id": result.get("instagram_id") or (username_id_map.get(username) if username_id_map else None),
            "full_name": result.get("full_name"),
            "biography": result.get("biography"),
            "is_verified": result.get("is_verified"),
            "is_private": result.get("is_private"),
            "follower_count": result.get("follower_count"),
            "following_count": result.get("following_count"),
            "post_count": result.get("post_count"),
            "profile_pic_url": result.get("profile_pic_url"),
            "image_hash": result.get("image_hash"),
            "local_path": result.get("local_path"),
            "original_image_r2_key": r2_key,
            "status": "completed",
            "processed": True,
            "last_processed_at": datetime.now().isoformat(),
            "error": None,
            "method": result.get("method")
        })
        
        # Generate HTML report if requested
        if generate_html and html_output_dir:
            try:
                # Prepare data for HTML report
                html_data = record.copy()
                if "raw_response" in result:
                    html_data["raw_response"] = result["raw_response"]
                if "raw_response_instascraper" in result:
                    html_data["raw_response_instascraper"] = result["raw_response_instascraper"]
                if "image_bytes" in result:
                    html_data["image_bytes"] = result["image_bytes"]
                
                html_path = generate_html_report(html_data, html_output_dir, username)
                print(f"  📄 HTML report: {html_path}")
            except Exception as e:
                print(f"  ⚠ Failed to generate HTML: {e}")
        
        # Update metadata with final key, removing temporary key if changed
        final_key = str(record.get("instagram_id") or username)
        if final_key != initial_key and initial_key in metadata["profiles"]:
            try:
                del metadata["profiles"][initial_key]
            except Exception:
                pass
        metadata["profiles"][final_key] = record
        
        print(f"  ✓ Completed: {record.get('full_name', username)} (@{username})")
        return True
        
    except Exception as e:
        # Mark as failed
        record["status"] = "failed"
        record["error"] = str(e)
        record["last_processed_at"] = datetime.now().isoformat()
        
        final_key = str(record.get("instagram_id") or username)
        if final_key != initial_key and initial_key in metadata["profiles"]:
            try:
                del metadata["profiles"][initial_key]
            except Exception:
                pass
        metadata["profiles"][final_key] = record
        
        print(f"  ✗ Failed: {e}")
        return False

def process_profiles_batch(
    usernames: List[str],
    metadata: Dict,
    metadata_file: Path,
    followers_set: Set[str],
    following_set: Set[str],
    method: DownloadMethod,
    output_dir: Path,
    download_images: bool = True,
    upload_to_r2_enabled: bool = False,
    generate_html: bool = False,
    html_output_dir: Optional[Path] = None,
    delay_range: Tuple[float, float] = (2, 5),
    username_id_map: Optional[Dict[str, str]] = None,
    intra_delay: float = 0.0
) -> Tuple[int, int]:
    """
    Process a batch of profiles with rate limiting.
    
    Returns:
        Tuple of (success_count, fail_count)
    """
    success_count = 0
    fail_count = 0
    
    for i, username in enumerate(usernames, 1):
        print(f"[{i}/{len(usernames)}] Processing @{username}...")
        
        success = collect_profile_metadata(
            username=username,
            metadata=metadata,
            followers_set=followers_set,
            following_set=following_set,
            method=method,
            output_dir=output_dir,
            download_images=download_images,
            upload_to_r2_enabled=upload_to_r2_enabled,
            generate_html=generate_html,
            html_output_dir=html_output_dir,
            username_id_map=username_id_map,
            intra_delay=intra_delay
        )
        
        if success:
            success_count += 1
        else:
            fail_count += 1
        
        # Save metadata after each profile
        save_metadata(metadata, metadata_file)
        
        # Rate limiting delay
        if i < len(usernames):
            delay = random.uniform(*delay_range)
            time.sleep(delay)
    
    return success_count, fail_count

# ======================== EXPERIMENTAL: LOW-REQUEST FOLLOWER/FOLLOWING PROPAGATION ========================


# ======================== R2 STORAGE FUNCTIONALITY ========================

def upload_to_r2(image_bytes: bytes, instagram_id: str, file_type: str = "original") -> Optional[str]:
    """
    Upload image to Cloudflare R2 storage.
    
    Args:
        image_bytes: Image data as bytes
        instagram_id: Instagram user ID for filename
        file_type: Type of image ("original", "processed", etc.)
    
    Returns:
        R2 key (path) if successful, None otherwise
    """
    try:
        # Load R2 credentials from environment
        # Support both long and short env var names
        r2_endpoint = os.getenv('R2_ENDPOINT_URL') or os.getenv('R2_ENDPOINT')
        r2_access_key = os.getenv('R2_ACCESS_KEY_ID') or os.getenv('R2_ACCESS_KEY')
        r2_secret_key = os.getenv('R2_SECRET_ACCESS_KEY') or os.getenv('R2_SECRET_KEY')
        r2_bucket = os.getenv('R2_BUCKET_NAME') or os.getenv('R2_BUCKET') or 'instagram-profiles'

        if not all([r2_endpoint, r2_access_key, r2_secret_key]):
            missing = []
            if not r2_endpoint: missing.append('R2_ENDPOINT_URL/R2_ENDPOINT')
            if not r2_access_key: missing.append('R2_ACCESS_KEY_ID/R2_ACCESS_KEY')
            if not r2_secret_key: missing.append('R2_SECRET_ACCESS_KEY/R2_SECRET_KEY')
            print(f"  ⚠️  R2 credentials missing: {', '.join(missing)}")
            return None
        
        # Initialize S3 client for R2
        s3_client = boto3.client(
            's3',
            endpoint_url=r2_endpoint,
            aws_access_key_id=r2_access_key,
            aws_secret_access_key=r2_secret_key
        )
        
        # Generate R2 key
        timestamp = int(time.time())
        r2_key = f"{file_type}/{instagram_id}_{timestamp}.jpg"
        
        # Upload to R2
        s3_client.put_object(
            Bucket=r2_bucket,
            Key=r2_key,
            Body=image_bytes,
            ContentType='image/jpeg'
        )
        
        return r2_key
        
    except Exception as e:
        print(f"  ✗ R2 upload failed: {e}")
        return None

# ======================== HTML TEST REPORT GENERATION ========================

def generate_html_report(profile_data: Dict, output_dir: Path, username: str) -> str:
    """
    Generate an HTML test report for a single profile showing all collected data.
    
    Args:
        profile_data: Dictionary containing all profile data including raw responses
        output_dir: Directory to save the HTML file
        username: Username for the filename
    
    Returns:
        Path to generated HTML file
    """
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    html_file = output_dir / f"test_report_{username}_{timestamp}.html"
    
    # Extract data
    final_output = {k: v for k, v in profile_data.items() if k not in ['raw_response', 'raw_response_instascraper', 'image_bytes']}
    raw_responses = {}
    
    if 'raw_response' in profile_data:
        raw_responses['GraphQL Response'] = profile_data['raw_response']
    if 'raw_response_instascraper' in profile_data:
        raw_responses['Instascraper Response'] = profile_data['raw_response_instascraper']
    
    # Get profile picture URL
    profile_pic_url = profile_data.get('profile_pic_url', '')
    local_path = profile_data.get('local_path', '')
    
    # Generate HTML
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - @{escape(username)}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin-bottom: 10px;
            font-size: 2em;
        }}
        .header .username {{
            font-size: 1.2em;
            opacity: 0.9;
        }}
        .profile-section {{
            padding: 30px;
            display: flex;
            gap: 30px;
            align-items: flex-start;
            border-bottom: 1px solid #eee;
        }}
        .profile-pic {{
            flex-shrink: 0;
        }}
        .profile-pic img {{
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 3px solid #667eea;
        }}
        .profile-info {{
            flex-grow: 1;
        }}
        .profile-info h2 {{
            margin-bottom: 15px;
            color: #667eea;
        }}
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }}
        .stat-card {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 3px solid #667eea;
        }}
        .stat-card .label {{
            font-size: 0.85em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .stat-card .value {{
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
            margin-top: 5px;
        }}
        .section {{
            padding: 30px;
            border-bottom: 1px solid #eee;
        }}
        .section h2 {{
            color: #667eea;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .section h2::before {{
            content: '';
            width: 4px;
            height: 24px;
            background: #667eea;
            border-radius: 2px;
        }}
        .json-container {{
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            margin-top: 10px;
        }}
        .json-key {{ color: #66d9ef; }}
        .json-string {{ color: #a6e22e; }}
        .json-number {{ color: #ae81ff; }}
        .json-boolean {{ color: #fd971f; }}
        .json-null {{ color: #f92672; }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            margin-left: 10px;
        }}
        .badge.verified {{
            background: #4CAF50;
            color: white;
        }}
        .badge.private {{
            background: #FF9800;
            color: white;
        }}
        .metadata {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }}
        .metadata-item {{
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }}
        .metadata-item .key {{
            font-size: 0.85em;
            color: #666;
            margin-bottom: 3px;
        }}
        .metadata-item .value {{
            font-weight: 600;
            color: #333;
            word-break: break-all;
        }}
        .timestamp {{
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }}
        pre {{
            white-space: pre-wrap;
            word-wrap: break-word;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Instagram Profile Test Report</h1>
            <div class="username">@{escape(username)}</div>
            <div style="margin-top: 10px; opacity: 0.8; font-size: 0.9em;">
                Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            </div>
        </div>
        
        <div class="profile-section">
            {"<div class='profile-pic'><img src='" + escape(profile_pic_url) + "' alt='Profile Picture' onerror=\"this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 150 150%22%3E%3Crect fill=%22%23ddd%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'\"></div>" if profile_pic_url else ""}
            <div class="profile-info">
                <h2>
                    {escape(final_output.get('full_name', 'N/A'))}
                    {('<span class="badge verified">✓ Verified</span>' if final_output.get('is_verified') else '')}
                    {('<span class="badge private">🔒 Private</span>' if final_output.get('is_private') else '')}
                </h2>
                <p style="color: #666; margin-bottom: 15px;">{escape(final_output.get('biography', ''))}</p>
                
                <div class="stats">
                    <div class="stat-card">
                        <div class="label">Followers</div>
                        <div class="value">{final_output.get('follower_count', 0):,}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Following</div>
                        <div class="value">{final_output.get('following_count', 0):,}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Posts</div>
                        <div class="value">{final_output.get('post_count', 0):,}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📋 Final Output JSON</h2>
            <p style="color: #666; margin-bottom: 10px;">This is the cleaned data structure we store:</p>
            <div class="json-container">
                <pre>{escape(json.dumps(final_output, indent=2, ensure_ascii=False))}</pre>
            </div>
        </div>
        
        {"".join([f'''
        <div class="section">
            <h2>🔍 Raw API Response: {escape(name)}</h2>
            <p style="color: #666; margin-bottom: 10px;">Complete response from API endpoint:</p>
            <div class="json-container">
                <pre>{escape(json.dumps(response, indent=2, ensure_ascii=False))}</pre>
            </div>
        </div>
        ''' for name, response in raw_responses.items()])}
        
        <div class="section">
            <h2>ℹ️ Additional Metadata</h2>
            <div class="metadata">
                <div class="metadata-item">
                    <div class="key">Instagram ID</div>
                    <div class="value">{escape(str(final_output.get('instagram_id', 'N/A')))}</div>
                </div>
                <div class="metadata-item">
                    <div class="key">Username</div>
                    <div class="value">@{escape(final_output.get('username', 'N/A'))}</div>
                </div>
                <div class="metadata-item">
                    <div class="key">Method</div>
                    <div class="value">{escape(final_output.get('method', 'N/A'))}</div>
                </div>
                <div class="metadata-item">
                    <div class="key">Image Hash</div>
                    <div class="value" style="font-size: 0.8em;">{escape(str(final_output.get('image_hash', 'N/A'))[:16])}...</div>
                </div>
                <div class="metadata-item">
                    <div class="key">Local Path</div>
                    <div class="value" style="font-size: 0.85em;">{escape(str(local_path))}</div>
                </div>
                <div class="metadata-item">
                    <div class="key">R2 Key</div>
                    <div class="value" style="font-size: 0.85em;">{escape(str(final_output.get('original_image_r2_key', 'N/A')))}</div>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            Report generated by Instagram Profile Collector v2.0
        </div>
    </div>
</body>
</html>
"""
    
    # Write HTML file
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return str(html_file)

# ======================== CLI INTERFACE ========================

def parse_arguments():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(
        description="Instagram Profile Metadata Collector - CLI Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process 50 followers using Instascraper
  python main_refactored.py --mode followers --limit 50 --method instascraper
  
  # Process following using GraphQL (experimental)
  python main_refactored.py --mode following --method graphql
  
  # Process with HTML test reports
  python main_refactored.py --mode followers --limit 10 --test-html
  
  # Upload to R2 storage
  python main_refactored.py --mode followers --limit 50 --upload-r2
  
  # Fetch followers/following with IDs
  python main_refactored.py --fetch-ids followers --target-user username
        """
    )
    
    parser.add_argument(
        '--mode',
        type=str,
        choices=['followers', 'following', 'both'],
        default='followers',
        help='Collection mode: followers, following, or both (default: followers)'
    )
    
    parser.add_argument(
        '--method',
        type=str,
        choices=['instascraper', 'graphql'],
        default='instascraper',
        help='Download method: instascraper (stable) or graphql (experimental) (default: instascraper)'
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Maximum number of profiles to process (default: all)'
    )
    
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        default=True,
        help='Skip profiles already in metadata (default: True)'
    )
    
    parser.add_argument(
        '--no-skip-existing',
        action='store_false',
        dest='skip_existing',
        help='Process all profiles even if already in metadata'
    )
    
    parser.add_argument(
        '--no-images',
        action='store_true',
        help='Skip downloading profile pictures (metadata only)'
    )
    
    parser.add_argument(
        '--delay',
        nargs=2,
        type=float,
        default=[2.0, 5.0],
        metavar=('MIN', 'MAX'),
        help='Delay range between requests in seconds (default: 2 5)'
    )

    parser.add_argument(
        '--intra-delay',
        type=float,
        default=0.0,
        help='Additional delay (seconds) inserted between API fetch and image download'
    )
    
    parser.add_argument(
        '--username',
        type=str,
        default='wesleykamau',
        help='Target Instagram username (default: wesleykamau)'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default=None,
        help='Output directory for profile photos (default: ./profile_photos)'
    )
    
    # New arguments
    parser.add_argument(
        '--test-html',
        action='store_true',
        help='Generate HTML test reports for each profile'
    )
    
    parser.add_argument(
        '--html-output-dir',
        type=str,
        default=None,
        help='Output directory for HTML reports (default: ./test_reports)'
    )
    
    parser.add_argument(
        '--upload-r2',
        action='store_true',
        help='Upload profile pictures to Cloudflare R2 storage'
    )
    
    parser.add_argument(
        '--ids-file',
        type=str,
        default=None,
        help='Path to ids.json containing followers and following with IDs (default: ./data/ids.json)'
    )

    parser.add_argument(
        '--clear-metadata',
        action='store_true',
        help='Clear profiles_metadata.json (prompts for confirmation)'
    )
    
    return parser.parse_args()

# ======================== MAIN FUNCTION ========================

def main():
    """Main entry point"""
    # Setup directories and load .env from project folder explicitly
    base_dir = Path(__file__).parent
    load_dotenv(dotenv_path=base_dir / '.env', override=True)

    # Parse CLI arguments
    args = parse_arguments()
    
    # Setup directories
    data_dir = base_dir / "data"
    output_dir = Path(args.output_dir) if args.output_dir else base_dir / "profile_photos"
    output_dir.mkdir(exist_ok=True)
    
    html_output_dir = Path(args.html_output_dir) if args.html_output_dir else base_dir / "test_reports"
    if args.test_html:
        html_output_dir.mkdir(exist_ok=True)
    
    metadata_file = data_dir / "profiles_metadata.json"
    # Optional: clear metadata with confirmation
    if args.clear_metadata:
        print("\n⚠️  You are about to clear all saved profile metadata.")
        print(f"File: {metadata_file}")
        confirm = input('Type "YES" to confirm: ').strip()
        if confirm == 'YES':
            try:
                # Backup existing file with timestamp if it exists
                if metadata_file.exists():
                    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                    bak_path = metadata_file.with_name(f"profiles_metadata_{ts}.bak.json")
                    with open(metadata_file, 'r', encoding='utf-8') as src, open(bak_path, 'w', encoding='utf-8') as dst:
                        dst.write(src.read())
                    print(f"  🗄️  Backup saved to: {bak_path}")
                # Write a fresh, empty metadata file
                fresh = {"last_updated": None, "owner_username": args.username, "profiles": {}}
                save_metadata(fresh, metadata_file)
                print("  ✓ Metadata cleared.")
            except Exception as e:
                print(f"  ✗ Failed to clear metadata: {e}")
                return 1
        else:
            print("  ⊙ Clear cancelled.")

    
    # Print banner
    print("=" * 70)
    print("Instagram Profile Metadata Collector - CLI Tool")
    print("=" * 70)
    print(f"Mode: {args.mode}")
    print(f"Method: {args.method} {'(EXPERIMENTAL)' if args.method == 'graphql' else ''}")
    print(f"Target: @{args.username}")
    print(f"Limit: {args.limit if args.limit else 'All'}")
    print(f"Download Images: {not args.no_images}")
    print(f"Upload to R2: {args.upload_r2}")
    print(f"Generate HTML: {args.test_html}")
    print(f"Skip Existing: {args.skip_existing}")
    print(f"Delay Range: {args.delay[0]}-{args.delay[1]}s")
    print(f"Intra Delay: {args.intra_delay}s")
    print("=" * 70)
    
    # Load followers/following from ids.json
    ids_path = Path(args.ids_file) if args.ids_file else data_dir / "ids.json"
    print("\n📂 Loading followers and following from ids.json...")
    followers_set, following_set, username_id_map = load_followers_following_from_ids(ids_path)
    
    if not followers_set and not following_set:
        print("\n✗ No followers/following data found in ids.json")
        print("Ensure ids.json exists with 'followers' and 'following' arrays.")
        return 1
    
    # Load metadata
    metadata = load_metadata(metadata_file, args.username)
    
    # Determine target usernames based on mode
    mode = CollectionMode(args.mode)
    target_usernames = set()
    
    if mode == CollectionMode.FOLLOWERS:
        target_usernames = followers_set
    elif mode == CollectionMode.FOLLOWING:
        target_usernames = following_set
    elif mode == CollectionMode.BOTH:
        target_usernames = followers_set | following_set
    
    print(f"\n📊 Total in export files:")
    print(f"  - Followers: {len(followers_set)}")
    print(f"  - Following: {len(following_set)}")
    print(f"  - Mode '{args.mode}': {len(target_usernames)} profiles")
    
    # Filter existing if skip-existing is enabled
    if args.skip_existing:
        existing = get_existing_usernames(metadata)
        before = len(target_usernames)
        target_usernames = {u for u in target_usernames if u not in existing}
        skipped = before - len(target_usernames)
        print(f"\n⏭️  Skip-existing enabled: {skipped} already in metadata; {len(target_usernames)} to process")
    
    # Apply limit
    target_usernames_list = sorted(list(target_usernames))
    if args.limit:
        target_usernames_list = target_usernames_list[:args.limit]
        print(f"\n🔢 Limit applied: Processing {len(target_usernames_list)} profiles")
    
    if not target_usernames_list:
        print("\n✓ No profiles to process")
        return 0
    
    # Process profiles
    print(f"\n🚀 Starting profile collection...\n")
    
    method = DownloadMethod(args.method)
    
    try:
        success_count, fail_count = process_profiles_batch(
            usernames=target_usernames_list,
            metadata=metadata,
            metadata_file=metadata_file,
            followers_set=followers_set,
            following_set=following_set,
            method=method,
            output_dir=output_dir,
            download_images=not args.no_images,
            upload_to_r2_enabled=args.upload_r2,
            generate_html=args.test_html,
            html_output_dir=html_output_dir if args.test_html else None,
            delay_range=tuple(args.delay),
            username_id_map=username_id_map,
            intra_delay=float(args.intra_delay)
        )
        
        # Save final metadata
        save_metadata(metadata, metadata_file)
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 Summary")
        print("=" * 70)
        print(f"Total processed: {success_count + fail_count}")
        print(f"  ✓ Success: {success_count}")
        print(f"  ✗ Failed: {fail_count}")
        print(f"\n📁 Metadata saved to: {metadata_file}")
        if not args.no_images:
            print(f"📸 Images saved to: {output_dir}")
        if args.test_html:
            print(f"📄 HTML reports saved to: {html_output_dir}")
        if args.upload_r2:
            # Compute how many uploads actually succeeded
            uploaded_count = 0
            for uname in target_usernames_list:
                key = find_record_key_by_username(metadata, uname)
                if key:
                    rec = metadata["profiles"].get(key, {})
                    if rec.get("original_image_r2_key"):
                        uploaded_count += 1
            if uploaded_count > 0:
                print(f"☁️  Images uploaded to R2: {uploaded_count}")
            else:
                print(f"☁️  No images uploaded to R2")
        print("=" * 70)
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user. Progress saved.")
        save_metadata(metadata, metadata_file)
        return 130

if __name__ == "__main__":
    sys.exit(main())
