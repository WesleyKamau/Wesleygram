# 📚 Documentation Index

Complete guide to the refactored Instagram Profile Collector.

## 🎯 Start Here

**New User?** → [REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)  
Quick overview of what was done and how to get started.

**Need Quick Start?** → Run `quickstart.bat` (Windows) or `quickstart.sh` (Linux/Mac)

## 📖 Documentation Files

### Core Documentation

| File | Purpose | Audience |
|------|---------|----------|
| **[README_REFACTORED.md](README_REFACTORED.md)** | Complete user guide with all CLI options and examples | All users |
| **[REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)** | What was done, quick start, tips & tricks | New users |
| **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** | Old vs new comparison, when to use which | Existing users |

### Technical Documentation

| File | Purpose | Audience |
|------|---------|----------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System architecture, data flow, function organization | Developers |
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Detailed refactoring summary, function reference | Developers |
| **[INDEX.md](INDEX.md)** | This file - documentation index | Everyone |

## 🚀 Quick Links

### Getting Started
1. [Installation Instructions](README_REFACTORED.md#-installation)
2. [Quick Start Guide](REFACTORING_COMPLETE.md#-quick-start)
3. [First Collection Run](README_REFACTORED.md#-quick-start)

### Usage Examples
- [Basic Usage](REFACTORING_COMPLETE.md#-example-usage-scenarios)
- [CLI Options](README_REFACTORED.md#%EF%B8%8F-cli-options)
- [Advanced Scenarios](README_REFACTORED.md#-example-usage-scenarios)

### Download Methods
- [Instascraper Method](README_REFACTORED.md#method-1-instascraper-recommended)
- [GraphQL Method](README_REFACTORED.md#method-2-graphql-experimental)
- [Method Comparison](MIGRATION_GUIDE.md#performance-comparison)

### Technical Details
- [Architecture Overview](ARCHITECTURE.md#system-architecture-diagram)
- [Function Reference](PROJECT_SUMMARY.md#-function-organization)
- [Data Flow](ARCHITECTURE.md#data-flow-diagram)

## 📁 File Structure

```
instagram_downloader/
│
├── 🚀 Main Files
│   ├── main_refactored.py          ⭐ Use this! New CLI tool
│   ├── main.py                      ⚠️  Deprecated Playwright version
│   ├── requirements.txt             Updated dependencies
│   └── .env                         Optional environment variables
│
├── 📖 Documentation
│   ├── INDEX.md                     👈 You are here
│   ├── README_REFACTORED.md         Complete user guide
│   ├── REFACTORING_COMPLETE.md      What was done + quick start
│   ├── MIGRATION_GUIDE.md           Old vs new comparison
│   ├── ARCHITECTURE.md              Technical architecture
│   ├── PROJECT_SUMMARY.md           Detailed summary
│   └── README.md                    Original README (outdated)
│
├── 🧪 Testing & Setup
│   ├── test_refactored.py           Test suite
│   ├── quickstart.bat               Windows setup script
│   └── quickstart.sh                Linux/Mac setup script
│
├── 📊 Data (Input/Output)
│   └── data/
│       ├── followers_1.json         📥 Input: Instagram export
│       ├── following.json           📥 Input: Instagram export
│       ├── profiles_metadata.json   💾 Output: Collected metadata
│       └── profiles_metadata.json.bak  Automatic backup
│
└── 📸 Images (Output)
    └── profile_photos/
        └── username_timestamp.jpg   Downloaded profile pictures
```

## 🎯 Common Tasks

### Task 1: First Time Setup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Export Instagram data (manual step)
#    Settings → Download Your Information
#    Place followers_1.json and following.json in data/

# 3. Test with 10 profiles
python main_refactored.py --mode followers --limit 10
```
📖 Detailed guide: [REFACTORING_COMPLETE.md - Quick Start](REFACTORING_COMPLETE.md#-quick-start)

### Task 2: Process Followers
```bash
# Process 50 followers using Instascraper
python main_refactored.py --mode followers --limit 50
```
📖 All options: [README_REFACTORED.md - CLI Options](README_REFACTORED.md#%EF%B8%8F-cli-options)

### Task 3: Experimental GraphQL
```bash
# Use GraphQL method (faster but riskier)
python main_refactored.py --mode followers --method graphql --limit 20 --delay 5 10
```
📖 Method details: [README_REFACTORED.md - GraphQL Method](README_REFACTORED.md#method-2-graphql-experimental)

### Task 4: Metadata Only
```bash
# Skip image downloads (fast)
python main_refactored.py --mode both --no-images
```
📖 More scenarios: [REFACTORING_COMPLETE.md - Scenarios](REFACTORING_COMPLETE.md#-example-usage-scenarios)

### Task 5: Migrate from Old Version
```bash
# Your existing data is compatible!
python main_refactored.py --mode followers --skip-existing
```
📖 Migration guide: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md#-migration-steps)

## 🔍 Find What You Need

### I want to...

**...understand what changed**
→ [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

**...see all CLI options**
→ [README_REFACTORED.md - CLI Options](README_REFACTORED.md#%EF%B8%8F-cli-options)

**...understand the architecture**
→ [ARCHITECTURE.md](ARCHITECTURE.md)

**...see code examples**
→ [README_REFACTORED.md - Examples](README_REFACTORED.md#-quick-start)

**...troubleshoot errors**
→ [README_REFACTORED.md - Troubleshooting](README_REFACTORED.md#-troubleshooting)

**...understand functions**
→ [PROJECT_SUMMARY.md - Functions](PROJECT_SUMMARY.md#-function-organization)

**...compare performance**
→ [MIGRATION_GUIDE.md - Performance](MIGRATION_GUIDE.md#performance-comparison)

**...test the new code**
→ Run `python test_refactored.py`

## 📊 Feature Matrix

| Feature | File | Status |
|---------|------|--------|
| CLI Interface | main_refactored.py | ✅ Complete |
| Instascraper Method | main_refactored.py | ✅ Complete |
| GraphQL Method | main_refactored.py | ⚠️ Experimental |
| Rate Limiting | main_refactored.py | ✅ Complete |
| Metadata Management | main_refactored.py | ✅ Complete |
| Image Download | main_refactored.py | ✅ Complete |
| Username→ID Mapping | main_refactored.py | ⚠️ Experimental |
| Test Suite | test_refactored.py | ✅ Complete |
| Documentation | Multiple files | ✅ Complete |

## 🎓 Learning Path

### Beginner Path
1. Read [REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)
2. Run `quickstart.bat` or `quickstart.sh`
3. Try basic examples from [README_REFACTORED.md](README_REFACTORED.md)
4. Check [Troubleshooting](README_REFACTORED.md#-troubleshooting) if needed

### Intermediate Path
1. Read [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for method comparison
2. Experiment with different CLI options
3. Try both Instascraper and GraphQL methods
4. Learn about rate limiting strategies

### Advanced Path
1. Study [ARCHITECTURE.md](ARCHITECTURE.md) for system design
2. Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for function details
3. Review source code in `main_refactored.py`
4. Extend with custom download methods or storage backends

## 📈 Performance Guide

| Scenario | Recommended Settings | Doc Reference |
|----------|---------------------|---------------|
| First time user | `--limit 10` | [Quick Start](REFACTORING_COMPLETE.md#-quick-start) |
| Small dataset (<100) | `--mode followers --limit 50` | [Basic Usage](README_REFACTORED.md#-quick-start) |
| Large dataset (>1000) | `--mode both --delay 3 6` | [Scenarios](REFACTORING_COMPLETE.md#scenario-2-collecting-all-data) |
| Speed priority | `--method graphql --delay 5 10` | [GraphQL](README_REFACTORED.md#method-2-graphql-experimental) |
| Stability priority | `--method instascraper` | [Instascraper](README_REFACTORED.md#method-1-instascraper-recommended) |
| Metadata only | `--no-images --delay 1 2` | [Scenario 3](REFACTORING_COMPLETE.md#scenario-3-metadata-only-fast) |

## ⚠️ Important Notes

### Rate Limiting
- Always use delays (default: 2-5 seconds)
- GraphQL needs longer delays (5-10 seconds)
- Process in batches if dealing with large datasets
- 📖 Details: [README_REFACTORED.md - Rate Limiting](README_REFACTORED.md#-rate-limiting)

### Data Compatibility
- Existing `profiles_metadata.json` is fully compatible
- Use `--skip-existing` to continue from where you left off
- Automatic backups created on each save
- 📖 Details: [MIGRATION_GUIDE.md - Migration](MIGRATION_GUIDE.md#-migration-steps)

### Method Selection
- **Instascraper**: Recommended for most users (stable, reliable)
- **GraphQL**: Experimental (faster but higher rate limit risk)
- 📖 Comparison: [MIGRATION_GUIDE.md - When to Use Which](MIGRATION_GUIDE.md#when-to-use-which-version)

## 🆘 Getting Help

### Common Issues

**"Rate limited by Instagram"**
→ [Troubleshooting - Rate Limits](README_REFACTORED.md#rate-limited-by-instagram)

**"No followers/following data found"**
→ [Troubleshooting - Export Files](README_REFACTORED.md#no-followersfollowing-data-found)

**"Connection timeout"**
→ [Troubleshooting - Timeout](README_REFACTORED.md#connection-timeout)

### Need More Help?
1. Check [README_REFACTORED.md - Troubleshooting](README_REFACTORED.md#-troubleshooting)
2. Review [REFACTORING_COMPLETE.md - Tips & Tricks](REFACTORING_COMPLETE.md#-tips--tricks)
3. Run test suite: `python test_refactored.py`

## 📝 Version History

| Version | Description |
|---------|-------------|
| **v2.0** (Current) | Complete refactor - CLI-based, modular functions, no Playwright |
| v1.0 | Original Playwright-based version (deprecated) |

## 🎉 Summary

This refactored version provides:
- ✅ Lightweight architecture (no browser)
- ✅ Full CLI interface with argparse
- ✅ Two download methods (Instascraper + GraphQL)
- ✅ Modular, function-based code (20+ functions)
- ✅ Anonymous access (no authentication)
- ✅ Comprehensive documentation (7 docs)
- ✅ Test suite and quick start scripts
- ✅ Experimental features (GraphQL, username→ID mapping)

**Get started:** [REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)

---

*Last updated: December 18, 2025*
