# Instagram Profile Collector - Quick Reference v2.1

## 🚀 New Features in v2.1

### 1. HTML Test Reports
Generate visual reports for testing and debugging.
```bash
python main_refactored.py --mode followers --limit 5 --test-html
```

### 2. Updated GraphQL Method
Uses new `doc_id` endpoint for better reliability.
```bash
python main_refactored.py --mode followers --method graphql --limit 20
```

### 3. Fetch Followers/Following with IDs
Get complete lists with user IDs.
```bash
python main_refactored.py --fetch-ids both --target-user username
```

### 4. Cloudflare R2 Storage
Upload images to R2 object storage.
```bash
python main_refactored.py --mode followers --upload-r2
```

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [NEW_FEATURES.md](NEW_FEATURES.md) | Detailed guide to v2.1 features |
| [README_REFACTORED.md](README_REFACTORED.md) | Complete user guide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [INDEX.md](INDEX.md) | Documentation index |

## 🎯 Quick Examples

### Testing (with HTML reports)
```bash
python main_refactored.py --mode followers --limit 3 --test-html --method graphql
```

### Production (with R2 upload)
```bash
python main_refactored.py --mode both --limit 500 --upload-r2 --method instascraper
```

### Data Collection (fetch IDs first)
```bash
# Step 1: Get IDs
python main_refactored.py --fetch-ids both --target-user myusername

# Step 2: Process profiles
python main_refactored.py --mode both --upload-r2
```

## 🔧 Setup

### Basic Setup
```bash
pip install -r requirements.txt
```

### R2 Storage Setup (optional)
1. Copy `.env.example` to `.env`
2. Fill in your R2 credentials:
   ```env
   R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key_id
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=instagram-profiles
   ```

## 📊 All CLI Options

```
Core Options:
  --mode {followers,following,both}     Collection mode
  --method {instascraper,graphql}       Download method
  --limit N                             Max profiles to process
  --username USERNAME                   Target username
  
Image Options:
  --no-images                           Skip image downloads
  --output-dir DIR                      Image output directory
  --upload-r2                           Upload to R2 storage
  
Testing Options:
  --test-html                           Generate HTML reports
  --html-output-dir DIR                 HTML output directory
  
ID Fetching:
  --fetch-ids {followers,following,both}  Fetch with IDs
  --target-user USERNAME                Target for ID fetch
  
Rate Limiting:
  --delay MIN MAX                       Delay range (seconds)
  --skip-existing                       Skip processed profiles
```

## 📁 Output Structure

```
instagram_downloader/
├── data/
│   ├── followers_1.json              # Input: Instagram export
│   ├── following.json                # Input: Instagram export
│   ├── profiles_metadata.json        # Output: All metadata
│   └── followers_following_ids_*.json # Output: ID fetches
├── profile_photos/                   # Output: Profile pictures
│   └── username_timestamp.jpg
├── test_reports/                     # Output: HTML reports
│   └── test_report_username_timestamp.html
└── .env                              # Config: R2 credentials
```

## ⚠️ Important Notes

- **HTML Reports**: Great for testing, not for production at scale
- **R2 Upload**: Requires `.env` configuration
- **GraphQL**: Experimental, use with longer delays
- **Fetch IDs**: Separate operation, can be slow

## 🆘 Troubleshooting

### Rate Limited
```bash
# Increase delays
python main_refactored.py --mode followers --delay 5 10
```

### R2 Upload Fails
```bash
# Check .env file exists and has valid credentials
cat .env

# Test with small batch
python main_refactored.py --mode followers --limit 1 --upload-r2
```

### HTML Reports Missing
```bash
# Ensure flag is set and check output directory
python main_refactored.py --mode followers --limit 1 --test-html
ls test_reports/
```

## 📚 Learn More

- Full documentation: [INDEX.md](INDEX.md)
- New features guide: [NEW_FEATURES.md](NEW_FEATURES.md)
- Architecture details: [ARCHITECTURE.md](ARCHITECTURE.md)

---

**Version 2.1** - Added HTML reports, R2 upload, updated GraphQL, and ID fetching
