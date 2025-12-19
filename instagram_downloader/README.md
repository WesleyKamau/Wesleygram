# Instagram Profile Picture Downloader

Playwright-based automation for downloading Instagram profile pictures with Cloudflare R2 storage.

## Architecture

### Data Flow
1. Load followers/following from exported JSON files
2. Initialize Playwright browser with persistent session
3. For each profile:
   - Navigate to profile page
   - Extract metadata and profile picture
   - Compute SHA256 hash
   - Upload to Cloudflare R2
   - Update metadata atomically

### Key Features
- ✅ **No API dependencies** - Uses real browser automation
- ✅ **Persistent login** - Login once, reuse session forever
- ✅ **Atomic saves** - Progress saved after each profile
- ✅ **Resumable** - Skip already-completed profiles
- ✅ **Retry with backoff** - 3 attempts per profile
- ✅ **Quality first** - Extracts highest resolution images
- ✅ **R2 integration** - Stores originals in Cloudflare R2

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
playwright install chromium
```

### 2. Configure Environment

#### Step 2.1: Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** from the sidebar
3. Click **Create bucket**
4. Name your bucket (e.g., `instagram-profile-pics`)
5. Click **Create bucket**

#### Step 2.2: Generate R2 API Token

1. In R2 dashboard, click **Manage R2 API Tokens** (top right)
2. Click **Create API token**
3. Configure token:
   - **Token name**: `instagram-downloader` (or any name)
   - **Permissions**: Select "Object Read & Write"
   - **Specify bucket(s)**: Choose your bucket or "Apply to all buckets"
   - **TTL**: Leave blank (no expiration) or set as needed
4. Click **Create API Token**
5. **Important**: Copy the following immediately (shown only once):
   - Access Key ID
   - Secret Access Key
6. Click **Finish**

#### Step 2.3: Find Your Account ID

1. In Cloudflare R2 dashboard, look at the top of the page
2. You'll see a URL like: `https://dash.cloudflare.com/<ACCOUNT_ID>/r2/overview`
3. Copy the `<ACCOUNT_ID>` portion (a hex string like `a1b2c3d4e5f6g7h8i9j0`)

#### Step 2.4: Create `.env` File

In the `instagram_downloader/` directory, create a file named `.env` with this exact format:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_access_key_id_here
R2_SECRET_KEY=your_secret_access_key_here
R2_BUCKET=instagram-profile-pics
```

**Replace the placeholders:**
- `<ACCOUNT_ID>`: Your Cloudflare account ID from Step 2.3
- `your_access_key_id_here`: Access Key ID from Step 2.2
- `your_secret_access_key_here`: Secret Access Key from Step 2.2
- `instagram-profile-pics`: Your actual bucket name from Step 2.1

**Example:**
```env
R2_ENDPOINT=https://a1b2c3d4e5f6g7h8i9j0.r2.cloudflarestorage.com
R2_ACCESS_KEY=4f8a3b2e9d1c5e7f8a9b0c1d2e3f4a5b
R2_SECRET_KEY=9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g
R2_BUCKET=instagram-profile-pics
```

**Security Notes:**
- Never commit `.env` to Git (already in `.gitignore`)
- Keep your Secret Access Key private
- Rotate keys if accidentally exposed

### 3. Export Instagram Data
1. Go to Instagram → Settings → Privacy and Security → Data Download
2. Request a download of your data
3. Extract `followers_1.json` and `following.json`
4. Place them in `./data/` directory

### 4. First Run (Interactive Login)
```bash
python main.py
```

On first run:
- Browser window opens
- Manually login to Instagram
- Complete any 2FA challenges
- Press Enter when you see your Instagram feed
- Session saved to `data/storage_state.json`

### 5. Subsequent Runs
No login required - session is automatically reused.

## Metadata Schema

Each profile in `profiles_metadata.json`:

```json
{
  "profiles": {
    "instagram_id": {
      "instagram_id": "123456789",
      "username": "example",
      "full_name": "Example User",
      "biography": "Bio text...",
      "is_verified": false,
      "is_private": false,
      "follower_count": 1234,
      "following_count": 567,
      "post_count": 89,
      
      "original_image_r2_key": "originals/123456789/profile.jpg",
      "image_hash": "sha256...",
      "status": "completed",
      "error": null,
      "last_processed_at": "2025-12-18T10:30:00",
      
      "output_r2_key": null,
      "model_version": null,
      "inference_timestamp": null,
      
      "is_follower": true,
      "is_following": false,
      "processed": true
    }
  }
}
```

### Status Values
- `pending` - Not yet processed
- `processing` - Currently being processed
- `completed` - Successfully downloaded and uploaded
- `failed` - Failed after 3 attempts

## Configuration

Edit `main.py` to customize:

```python
# Collection mode
MODE = CollectionMode.FOLLOWERS  # or FOLLOWING or BOTH

# Skip already-completed profiles
SKIP_EXISTING = True

# Limit (for testing)
sorted_usernames = sorted(list(target_usernames))[:10]
```

## Error Handling

### Private Accounts
- Metadata extracted if possible
- Status marked as `failed` with error message
- Move to next profile

### Deleted Accounts
- Detected via page title check
- Marked as failed with "Profile not found"
- Move to next profile

### Session Expiration
- Auto-detected on startup
- Prompts for re-login if needed
- Session refreshed and saved

### Network Errors
- 3 retry attempts with exponential backoff
- Progress saved even on partial failure
- Graceful handling of Ctrl+C

## Safety Features

### Rate Limiting
- Random 3-6 second delays between profiles
- Human-like navigation patterns
- No parallelization

### Atomic Saves
- Write to `.tmp` file first
- Backup to `.bak` before replace
- Atomic `os.replace()` prevents corruption

### Session Persistence
- Stored in `data/storage_state.json`
- No credentials stored in code
- Reuses cookies and tokens

## R2 Storage Structure

```
your-bucket/
├── originals/
│   ├── 123456789/
│   │   └── profile.jpg
│   ├── 987654321/
│   │   └── profile.jpg
│   └── ...
```

## Troubleshooting

### "R2 credentials not configured"
- Verify `.env` file exists
- Check R2 endpoint URL format
- Validate access key and secret

### "Profile picture element not found"
- Instagram may have changed HTML structure
- Check if profile is private
- Verify session is still valid

### Browser won't open
- Run `playwright install chromium`
- Check for Windows Defender blocking
- Try running as administrator

### Session keeps expiring
- Instagram security check triggered
- Try using a more established account
- Avoid VPN/proxy if possible

## Next Steps

After images are in R2:
1. Download originals for ML inference
2. Run face-swap model
3. Upload processed images to `outputs/` prefix
4. Update `output_r2_key` in metadata
5. Use for profile picture replacement

## Project Structure

```
instagram_downloader/
├── main.py                    # Main pipeline orchestrator
├── playwright_downloader.py   # Browser automation for image capture
├── metadata_manager.py        # Metadata utilities (legacy)
├── requirements.txt           # Python dependencies
├── .env                       # R2 credentials (not committed)
└── data/
    ├── followers_1.json       # Exported from Instagram
    ├── following.json         # Exported from Instagram
    ├── profiles_metadata.json # Processing state & metadata
    ├── storage_state.json     # Playwright session (not committed)
    ├── profiles_metadata.json.bak  # Auto-backup
    └── profiles_metadata.json.tmp  # Atomic write temp
```

## License

MIT

   "instagram_id": "123456789",
   "username": "example_user",
   "full_name": "Example User Name",
   "biography": "This is an example biography",
   "is_verified": false,
   "is_private": false,
   "follower_count": 1234,
   "following_count": 567,
   "post_count": 89,
   "profile_pic_url": "https://example.com/profile.jpg",
      "profile_pic_hash": null,
      "processed": false,
      "status": "pending",
   "is_follower": true,
   "is_following": false,
   "error": null,
   "output_r2_key": null,
   "model_version": null,
   "inference_timestamp": null
 }
 ```
 
`status` tracks state (`pending`, `processing`, `completed`, `failed`, `skipped`); `is_follower` / `is_following` record the relationship source(s). The other fields are preserved on reruns so you can resume downstream pipelines safely.

## Credits

This project was originally inspired by and builds upon the work from:

- **[instagram-pfp-downloader](https://github.com/edizbaha/instagram-pfp-downloader)** by edizbaha  
  A foundation for profile picture extraction and automation concepts.

## License

MIT
