# Migration Guide: Old vs New Version

## Quick Comparison

| Feature | Old Version (main.py) | New Version (main_refactored.py) |
|---------|----------------------|-----------------------------------|
| **Architecture** | Class-based monolith | Function-based modular |
| **Interface** | Hardcoded in main() | Full CLI with argparse |
| **Dependencies** | Playwright (heavy) | Instaloader + Requests (light) |
| **Authentication** | Required (login) | Anonymous (no login) |
| **Browser** | Required (Chromium) | Not needed |
| **Download Methods** | 1 (Playwright scraping) | 2 (Instascraper + GraphQL) |
| **Session Management** | storage_state.json | Not needed |
| **R2 Upload** | Built-in | Removed (local only) |
| **Rate Limiting** | Fixed delays | Configurable via CLI |
| **Image Quality** | Good | HD (GraphQL method) |
| **Setup Time** | ~5 minutes | ~30 seconds |

## Feature Comparison

### ✅ What's Better in New Version

1. **No Browser Required**
   - Old: `playwright install chromium` (150MB+)
   - New: Pure Python, no browser

2. **No Authentication**
   - Old: Login required, session management
   - New: Anonymous access

3. **CLI Interface**
   - Old: Edit code to change settings
   - New: `--mode followers --limit 100`

4. **Multiple Methods**
   - Old: Only Playwright
   - New: Instascraper (stable) + GraphQL (fast)

5. **Faster Setup**
   ```bash
   # Old
   pip install playwright
   playwright install chromium  # 150MB+ download
   # Configure .env file
   # Manual login on first run
   
   # New
   pip install -r requirements.txt  # Done!
   ```

6. **Lightweight**
   - Old: 3 dependencies + browser
   - New: 2 dependencies, no browser

7. **Modular Code**
   - Old: 522 lines, 1 class
   - New: ~700 lines, 20+ functions

### ⚠️ What's Missing from New Version

1. **R2 Upload**
   - Old: Automatic Cloudflare R2 upload
   - New: Local storage only
   - *Can be added back as a module if needed*

2. **Playwright Session**
   - Old: Persistent authenticated session
   - New: Not applicable (anonymous)

3. **Interactive Login**
   - Old: Built-in browser login flow
   - New: Not needed (anonymous)

### 🔄 Migration Steps

1. **Backup your data:**
   ```bash
   cp data/profiles_metadata.json data/profiles_metadata.json.backup
   ```

2. **Install new dependencies:**
   ```bash
   pip uninstall playwright  # Optional: remove old dependency
   pip install -r requirements.txt
   ```

3. **Run with same data:**
   ```bash
   python main_refactored.py --mode followers --skip-existing
   ```

4. **Your existing metadata is compatible!**
   - The new version reads the same `profiles_metadata.json`
   - It will skip already-processed profiles with `--skip-existing`

## Code Examples

### Old Way (main.py)

```python
# Edit constants in main()
TARGET_USERNAME = "wesleykamau"
MODE = CollectionMode.FOLLOWERS
SKIP_EXISTING = True

# Run
python main.py

# Wait for browser login
# Manual interaction required
```

### New Way (main_refactored.py)

```bash
# Command line - no code editing
python main_refactored.py \
  --username wesleykamau \
  --mode followers \
  --limit 100 \
  --method instascraper \
  --skip-existing

# No browser, no login, just runs
```

## When to Use Which Version

### Use New Version (main_refactored.py) If:

✅ You want a lightweight solution  
✅ You don't need authentication  
✅ You want CLI configuration  
✅ You want to avoid browser automation  
✅ You want multiple download methods  
✅ You prefer functional programming  

### Use Old Version (main.py) If:

⚠️ You specifically need Playwright browser automation  
⚠️ You need authenticated endpoints  
⚠️ You have custom R2 upload logic  
⚠️ You already have a working Playwright setup  

## Performance Comparison

### Profile Collection Speed

**Old (Playwright):**
- ~5-10 seconds per profile
- Includes browser rendering
- ~360-720 profiles/hour

**New (Instascraper):**
- ~2-5 seconds per profile
- Pure API calls
- ~720-1800 profiles/hour

**New (GraphQL):**
- ~1-3 seconds per profile
- Direct API endpoint
- ~1200-3600 profiles/hour
- Higher rate limit risk

### Resource Usage

**Old:**
- Memory: ~300-500MB (Chromium)
- Disk: ~150MB (browser)
- CPU: High (rendering)

**New:**
- Memory: ~50-100MB
- Disk: Minimal
- CPU: Low (HTTP only)

## Recommended Approach

For most users, we recommend:

```bash
# Use the new version with Instascraper
python main_refactored.py \
  --mode both \
  --method instascraper \
  --limit 500 \
  --delay 3 6 \
  --skip-existing
```

This gives you:
- ✅ Stable, reliable collection
- ✅ Good rate limiting
- ✅ No authentication needed
- ✅ Clean CLI interface

## Questions?

**Q: Can I use both versions?**  
A: Yes! They share the same `profiles_metadata.json` format.

**Q: Will my old data work?**  
A: Yes! The metadata format is compatible.

**Q: Should I delete main.py?**  
A: Keep it as a backup, but use `main_refactored.py` for new work.

**Q: Can I add R2 upload to the new version?**  
A: Yes! The old R2 upload code can be extracted and added as a separate module.

**Q: Which method is safest?**  
A: Instascraper method with delays of 3-6 seconds.
