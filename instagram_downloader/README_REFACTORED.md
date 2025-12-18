# Instagram Profile Metadata Collector - Refactored CLI

A modern, modular CLI tool for collecting Instagram profile metadata and profile pictures using two methods:
1. **Instascraper** (via Instaloader) - Stable, anonymous method
2. **GraphQL** - Experimental method using Instagram's GraphQL API

## 🎯 Key Features

- ✅ **Fully modular and function-based** architecture
- ✅ **CLI interface** with argparse for all configuration
- ✅ **No Playwright dependency** - lightweight and fast
- ✅ **Two download methods**: Instascraper (stable) and GraphQL (experimental)
- ✅ **Anonymous access** - no authentication required
- ✅ **Rate limiting** with configurable delays
- ✅ **Skip existing profiles** to avoid redundant processing
- ✅ **Metadata-only mode** without downloading images
- ✅ **Atomic saves** with backup to prevent data corruption
- ✅ **Progress tracking** with detailed output
- ✅ **Experimental username→ID propagation** for future use

## 📦 Installation

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

## 🚀 Quick Start

```bash
# Process 50 followers using Instascraper (recommended)
python main_refactored.py --mode followers --limit 50

# Process all following accounts
python main_refactored.py --mode following

# Process both followers and following
python main_refactored.py --mode both --limit 100

# Use experimental GraphQL method
python main_refactored.py --mode followers --method graphql --limit 20

# Metadata only (no image downloads)
python main_refactored.py --mode followers --no-images

# Custom delay to avoid rate limits
python main_refactored.py --mode followers --delay 5 10
```

## 🎛️ CLI Options

```
usage: main_refactored.py [-h] [--mode {followers,following,both}]
                          [--method {instascraper,graphql}] [--limit LIMIT]
                          [--skip-existing] [--no-skip-existing] [--no-images]
                          [--delay MIN MAX] [--username USERNAME]
                          [--output-dir OUTPUT_DIR]

Options:
  -h, --help            Show help message and exit
  
  --mode {followers,following,both}
                        Collection mode (default: followers)
                        
  --method {instascraper,graphql}
                        Download method (default: instascraper)
                        - instascraper: Stable, uses Instaloader
                        - graphql: Experimental, direct API calls
                        
  --limit LIMIT         Maximum number of profiles to process
                        (default: all)
                        
  --skip-existing       Skip profiles already in metadata (default: True)
  --no-skip-existing    Process all profiles even if in metadata
  
  --no-images           Skip downloading profile pictures
                        (metadata only mode)
                        
  --delay MIN MAX       Delay range between requests in seconds
                        (default: 2 5)
                        
  --username USERNAME   Target Instagram username (default: wesleykamau)
  
  --output-dir OUTPUT_DIR
                        Output directory for profile photos
                        (default: ./profile_photos)
```

## 📊 Download Methods

### Method 1: Instascraper (Recommended)

Uses **Instaloader** library for reliable, anonymous profile data collection.

**Pros:**
- ✅ Stable and well-maintained
- ✅ No authentication required
- ✅ Handles rate limiting gracefully
- ✅ High-quality profile pictures

**Cons:**
- ❌ Slightly slower (1-2 requests per profile)

**Example:**
```bash
python main_refactored.py --mode followers --method instascraper --limit 100
```

### Method 2: GraphQL (Experimental)

Direct calls to Instagram's GraphQL API endpoint.

**Pros:**
- ✅ Very fast (single request per profile)
- ✅ HD profile pictures available
- ✅ Low overhead

**Cons:**
- ⚠️ May be rate-limited aggressively
- ⚠️ Instagram may change the API
- ⚠️ Use sparingly

**Example:**
```bash
python main_refactored.py --mode followers --method graphql --limit 20 --delay 5 10
```

## 🔬 Experimental Features

### Username→ID Propagation

The tool includes experimental logic to propagate username→ID mappings after collection:

```python
# Automatically runs after processing
username_to_id = propagate_followers_following_with_ids(metadata, metadata_file)
# Returns: {'username1': 'id1', 'username2': 'id2', ...}
```

This mapping can be used for future low-request batch operations or GraphQL queries that require user IDs.

## 📁 Project Structure

```
instagram_downloader/
├── main_refactored.py          # New modular CLI tool
├── main.py                      # Original Playwright version (deprecated)
├── requirements.txt             # Updated dependencies
├── README_REFACTORED.md        # This file
├── data/
│   ├── followers_1.json        # Instagram export: followers
│   ├── following.json          # Instagram export: following
│   ├── profiles_metadata.json  # Collected profile data
│   └── profiles_metadata.json.bak  # Automatic backup
└── profile_photos/             # Downloaded profile pictures
```

## 📝 Data Format

### Input Files (Instagram Export)

**followers_1.json:**
```json
[
  {
    "string_list_data": [
      {
        "value": "username1",
        "href": "https://www.instagram.com/username1",
        "timestamp": 1234567890
      }
    ]
  }
]
```

**following.json:**
```json
{
  "relationships_following": [
    {
      "title": "username2",
      "string_list_data": [
        {
          "href": "https://www.instagram.com/_u/username2",
          "timestamp": 1234567890
        }
      ]
    }
  ]
}
```

### Output (profiles_metadata.json)

```json
{
  "last_updated": "2025-12-18T12:00:00.000000",
  "owner_username": "wesleykamau",
  "profiles": {
    "12345678901": {
      "instagram_id": "12345678901",
      "username": "example_user",
      "full_name": "Example User",
      "biography": "Bio text here",
      "is_verified": false,
      "is_private": false,
      "follower_count": 1234,
      "following_count": 567,
      "post_count": 89,
      "profile_pic_url": "https://...",
      "local_path": "profile_photos/example_user_1234567890.jpg",
      "image_hash": "sha256hash...",
      "processed": true,
      "status": "completed",
      "error": null,
      "last_processed_at": "2025-12-18T12:00:00.000000",
      "is_follower": true,
      "is_following": false,
      "method": "instascraper"
    }
  }
}
```

## 🔧 Function Reference

### Core Functions

- `load_followers_from_export()` - Load followers from Instagram export
- `load_following_from_export()` - Load following from Instagram export
- `load_metadata()` - Load existing metadata file
- `save_metadata()` - Atomically save metadata with backup
- `normalize_metadata_keys()` - Normalize profile keys by Instagram ID

### Download Methods

- `download_with_instascraper()` - Fetch profile using Instaloader
- `fetch_profile_with_graphql()` - Experimental GraphQL fetch
- `download_profile_picture()` - Download image from URL

### Processing

- `collect_profile_metadata()` - Process a single profile
- `process_profiles_batch()` - Process multiple profiles with rate limiting
- `propagate_followers_following_with_ids()` - Build username→ID mapping

### Utilities

- `compute_image_hash()` - SHA256 hash of image
- `save_image_locally()` - Save image to filesystem
- `get_existing_usernames()` - Get already-processed usernames
- `find_record_key_by_username()` - Find metadata record by username

## 🚨 Rate Limiting

Both methods implement rate limiting to avoid Instagram blocks:

- **Instascraper**: Use `--delay 2 5` (2-5 seconds between requests)
- **GraphQL**: Use `--delay 5 10` (5-10 seconds, more aggressive)

Instagram may still rate-limit you if:
- You process too many profiles in a short time
- You make requests too frequently
- Your IP is flagged

**Best practices:**
- Start with small limits (`--limit 20`)
- Use longer delays for GraphQL method
- Process in batches over multiple sessions
- Rotate IPs if processing large datasets

## ⚠️ Known Limitations

1. **Followers/Following Lists**: Cannot fetch follower/following lists without authentication
   - Must use Instagram's official export feature
   - Export via: Instagram → Settings → Account Center → Download Your Information

2. **GraphQL Rate Limits**: The experimental GraphQL method may be blocked faster
   - Use sparingly
   - Increase delays if you get 429 errors

3. **Profile Pictures**: Some private accounts may have placeholder images

4. **No R2 Upload**: Removed Cloudflare R2 integration (was Playwright-specific)
   - Images saved locally only
   - Can be added back if needed

## 🔄 Migration from Old Version

If you were using the Playwright version (`main.py`):

1. Your existing `profiles_metadata.json` is compatible
2. Run the new tool: `python main_refactored.py --skip-existing`
3. It will continue from where you left off

## 📈 Performance

**Instascraper Method:**
- ~2-5 seconds per profile
- ~720-1800 profiles per hour

**GraphQL Method:**
- ~1-3 seconds per profile
- ~1200-3600 profiles per hour
- Higher risk of rate limiting

## 🛠️ Troubleshooting

### "Rate limited by Instagram"
- Increase delay: `--delay 10 20`
- Reduce limit: `--limit 10`
- Wait 30-60 minutes before retrying

### "No followers/following data found"
- Export your data from Instagram:
  - Settings → Account Center → Your Information and Permissions → Download Your Information
  - Select JSON format
  - Extract `followers_1.json` and `following.json` to `data/` folder

### "Connection timeout"
- Check your internet connection
- Instagram may be temporarily unavailable
- Try again later

## 📄 License

See [LICENSE](../LICENSE) file in the root directory.

## 🤝 Contributing

This is a refactored version focused on:
- Modularity (functions over classes where appropriate)
- CLI-first design
- Removal of heavy dependencies (Playwright)
- Multiple download methods

Feel free to extend or modify for your use case!
