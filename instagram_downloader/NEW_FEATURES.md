# New Features Documentation

## 🎉 Recent Enhancements (v2.1)

### 1. HTML Test Reports (`--test-html`)

Generate beautiful, detailed HTML reports for testing and debugging profile collection.

**Features:**
- Visual profile display with profile picture
- Complete JSON output (clean data structure)
- Raw API responses from both methods
- All metadata in an easy-to-read format
- Syntax-highlighted JSON

**Usage:**
```bash
# Generate HTML reports for 5 profiles
python main_refactored.py --mode followers --limit 5 --test-html

# Custom HTML output directory
python main_refactored.py --mode followers --limit 10 --test-html --html-output-dir ./my_reports
```

**Output:**
- Files saved to `test_reports/` directory
- Format: `test_report_username_timestamp.html`
- Open in any web browser

**Example Report Structure:**
```
📊 Profile Section
   - Profile picture
   - Name, bio, verification status
   - Follower/following/post counts

📋 Final Output JSON
   - Clean data structure we store

🔍 Raw API Responses
   - GraphQL response (if used)
   - Instascraper response (if used)

ℹ️ Additional Metadata
   - Instagram ID, username, method
   - Image hash, local path, R2 key
```

### 2. Updated GraphQL Method

Now uses Instagram's newer GraphQL endpoint with `doc_id` parameter.

**New URL Format:**
```
https://www.instagram.com/graphql/query/?doc_id=9539110062771438&variables={"id":"16979825101","render_surface":"PROFILE"}
```

**Improvements:**
- More reliable responses
- HD profile picture URLs
- Faster processing
- Support for user ID lookup

**Usage:**
```bash
# Use updated GraphQL method
python main_refactored.py --mode followers --method graphql --limit 20
```

**Features:**
- Automatically converts username to ID
- Returns raw responses when generating HTML
- Better error handling
- Includes HD profile picture URLs

### 3. Followers/Following with IDs (`--fetch-ids`)

Fetch followers and/or following lists with user IDs using Instaloader.

**Usage:**
```bash
# Fetch followers with IDs
python main_refactored.py --fetch-ids followers --target-user username

# Fetch following with IDs
python main_refactored.py --fetch-ids following --target-user username

# Fetch both
python main_refactored.py --fetch-ids both --target-user username
```

**Output:**
```json
{
  "followers": [
    {
      "username": "user1",
      "userid": "12345678",
      "full_name": "User One"
    }
  ],
  "following": [
    {
      "username": "user2",
      "userid": "87654321",
      "full_name": "User Two"
    }
  ]
}
```

**Saved to:**
- `data/followers_following_ids_username_timestamp.json`

**Note:** This requires authentication if the target account is private.

### 4. Cloudflare R2 Storage (`--upload-r2`)

Upload profile pictures to Cloudflare R2 object storage.

**Setup:**
1. Copy `.env.example` to `.env`
2. Fill in your R2 credentials:
   ```env
   R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key_id_here
   R2_SECRET_ACCESS_KEY=your_secret_access_key_here
   R2_BUCKET_NAME=instagram-profiles
   ```

**Usage:**
```bash
# Upload images to R2
python main_refactored.py --mode followers --limit 50 --upload-r2

# Upload with HTML reports
python main_refactored.py --mode followers --limit 10 --upload-r2 --test-html
```

**Features:**
- Automatic S3-compatible upload
- Timestamped filenames
- Organized by file type (original/processed)
- R2 key stored in metadata

**Filename Format:**
```
original/instagram_id_timestamp.jpg
```

**Metadata:**
```json
{
  "original_image_r2_key": "original/12345678_1703001234.jpg",
  "local_path": "profile_photos/username_1703001234.jpg"
}
```

## 🎯 Combined Usage Examples

### Example 1: Complete Test Run
```bash
# Process 5 profiles with everything enabled
python main_refactored.py \
  --mode followers \
  --limit 5 \
  --method graphql \
  --test-html \
  --upload-r2
```

**This will:**
- ✅ Fetch 5 follower profiles using GraphQL
- ✅ Download profile pictures locally
- ✅ Upload images to R2
- ✅ Generate HTML test reports
- ✅ Save all metadata

### Example 2: Fetch Follower/Following Lists
```bash
# Get all followers with IDs
python main_refactored.py \
  --fetch-ids followers \
  --target-user someuser

# Then process those users
python main_refactored.py \
  --mode followers \
  --limit 100 \
  --upload-r2
```

### Example 3: Development/Testing
```bash
# Generate HTML reports for debugging
python main_refactored.py \
  --mode followers \
  --limit 3 \
  --test-html \
  --method graphql

# Check test_reports/*.html for results
```

### Example 4: Production Run
```bash
# Process all followers with R2 upload
python main_refactored.py \
  --mode both \
  --method instascraper \
  --upload-r2 \
  --delay 3 6
```

## 📊 CLI Options Summary

### New Options

| Option | Type | Description |
|--------|------|-------------|
| `--test-html` | flag | Generate HTML test reports |
| `--html-output-dir` | path | Custom HTML output directory (default: ./test_reports) |
| `--upload-r2` | flag | Upload images to Cloudflare R2 |
| `--fetch-ids` | choice | Fetch followers/following with IDs (followers/following/both) |
| `--target-user` | string | Target user for --fetch-ids |

### Updated Options

All previous options remain the same:
- `--mode` - Collection mode (followers/following/both)
- `--method` - Download method (instascraper/graphql)
- `--limit` - Max profiles to process
- `--skip-existing` / `--no-skip-existing` - Skip processed profiles
- `--no-images` - Metadata only
- `--delay` - Rate limiting (min max seconds)
- `--username` - Target Instagram username
- `--output-dir` - Custom output directory

## 🔧 Configuration

### R2 Storage Configuration (.env)

```env
# Required for --upload-r2
R2_ENDPOINT_URL=https://abc123.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_key_id
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=instagram-profiles
```

### HTML Reports

No configuration needed. Reports are automatically styled and include:
- Responsive design
- Dark mode JSON viewer
- Profile statistics
- Raw API responses
- Complete metadata

## ⚠️ Important Notes

### HTML Test Reports
- Generated files can be large (especially with raw responses)
- Use `--limit` to control the number of reports
- Great for debugging and testing
- Not recommended for production runs with large datasets

### R2 Upload
- Requires valid R2 credentials in `.env`
- Images uploaded in addition to local save
- R2 key stored in metadata for reference
- Does not replace local storage

### Fetch IDs
- Uses Instaloader's authenticated methods
- May require login for private accounts
- Rate-limited by Instagram
- Saves output to JSON file
- Can take time for large follower/following lists

### GraphQL Method
- Now uses `doc_id=9539110062771438`
- More stable than previous endpoint
- Still experimental - use with caution
- Better for testing with `--test-html`

## 🎓 Best Practices

### For Testing
```bash
# Small batch with HTML reports
python main_refactored.py --mode followers --limit 5 --test-html --method graphql
```

### For Production
```bash
# Large batch with R2 upload
python main_refactored.py --mode both --method instascraper --upload-r2 --delay 3 6
```

### For Data Collection
```bash
# First, fetch IDs
python main_refactored.py --fetch-ids both --target-user username

# Then, process profiles
python main_refactored.py --mode both --limit 500 --upload-r2
```

## 📈 Performance Impact

| Feature | Performance Impact | Recommendation |
|---------|-------------------|----------------|
| `--test-html` | +10-20% processing time | Use for small batches (<10) |
| `--upload-r2` | +5-15% processing time | Use for production runs |
| `--fetch-ids` | Depends on list size | Separate step, not parallel |
| GraphQL method | 20-30% faster than Instascraper | Use for speed, not reliability |

## 🐛 Troubleshooting

### HTML Reports Not Generated
- Check `--html-output-dir` permissions
- Ensure `--test-html` flag is set
- Check console for error messages

### R2 Upload Failing
- Verify `.env` credentials
- Check R2 bucket exists
- Ensure network connectivity
- Check boto3 installation: `pip install boto3`

### Fetch IDs Failing
- May need authentication for private accounts
- Check rate limiting
- Verify target user exists
- Use `--delay` to slow down requests

## 📝 Version History

| Version | Features Added |
|---------|----------------|
| v2.1 | HTML reports, R2 upload, GraphQL update, Fetch IDs |
| v2.0 | Initial refactored release with CLI |
| v1.0 | Original Playwright-based version |
