# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Command Line                             │
│  python main_refactored.py --mode followers --limit 50               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CLI Parser (argparse)                         │
│  • Parse mode (followers/following/both)                             │
│  • Parse method (instascraper/graphql)                               │
│  • Parse limits, delays, options                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Data Loading Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Load Followers  │  │ Load Following  │  │ Load Metadata    │   │
│  │ from Export     │  │ from Export     │  │ from JSON        │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Target Selection                              │
│  • Determine target usernames based on mode                          │
│  • Filter existing if skip-existing enabled                          │
│  • Apply limit if specified                                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Profile Processing Loop                          │
│  For each username:                                                  │
│    1. Check if already processed                                     │
│    2. Select download method                                         │
│    3. Fetch profile data                                             │
│    4. Download image (optional)                                      │
│    5. Save metadata                                                  │
│    6. Rate limit delay                                               │
└─────────────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
        ┌─────────────────────────┐  ┌─────────────────────────┐
        │   Instascraper Method   │  │   GraphQL Method        │
        │   (via Instaloader)     │  │   (Direct API)          │
        └─────────────────────────┘  └─────────────────────────┘
                          │                    │
                          ▼                    ▼
        ┌─────────────────────────────────────────────────────┐
        │         Instagram Data Retrieval                    │
        │  • Profile metadata (name, bio, counts)             │
        │  • Profile picture URL                              │
        │  • Verification status                              │
        │  • Privacy status                                   │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │         Data Processing & Storage                   │
        │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
        │  │ Compute     │  │ Save Image  │  │ Update     │ │
        │  │ Image Hash  │  │ Locally     │  │ Metadata   │ │
        │  └─────────────┘  └─────────────┘  └────────────┘ │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │         Atomic Save with Backup                     │
        │  1. Write to temp file                              │
        │  2. Backup existing file                            │
        │  3. Atomic replace                                  │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │         Experimental: Username→ID Mapping           │
        │  propagate_followers_following_with_ids()           │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │         Output Results                              │
        │  • profiles_metadata.json (metadata)                │
        │  • profile_photos/*.jpg (images)                    │
        │  • Console summary                                  │
        └─────────────────────────────────────────────────────┘
```

## Function Call Flow

### Main Execution Flow

```
main()
  │
  ├─→ parse_arguments()
  │     └─→ Returns: args object with CLI options
  │
  ├─→ load_followers_from_export()
  │     └─→ Returns: Set[str] of follower usernames
  │
  ├─→ load_following_from_export()
  │     └─→ Returns: Set[str] of following usernames
  │
  ├─→ load_metadata()
  │     ├─→ normalize_metadata_keys()
  │     └─→ Returns: Dict with metadata
  │
  ├─→ get_existing_usernames()
  │     └─→ Returns: Set[str] of processed usernames
  │
  └─→ process_profiles_batch()
        │
        └─→ For each username:
              │
              ├─→ collect_profile_metadata()
              │     │
              │     ├─→ If method == INSTASCRAPER:
              │     │     └─→ download_with_instascraper()
              │     │           ├─→ Instaloader API calls
              │     │           ├─→ requests.get() for image
              │     │           ├─→ compute_image_hash()
              │     │           └─→ save_image_locally()
              │     │
              │     └─→ If method == GRAPHQL:
              │           └─→ fetch_profile_with_graphql()
              │                 ├─→ requests.get() for GraphQL API
              │                 └─→ download_profile_picture()
              │                       ├─→ requests.get() for image
              │                       ├─→ compute_image_hash()
              │                       └─→ save_image_locally()
              │
              └─→ save_metadata()
                    └─→ Atomic save with backup
```

## Data Flow Diagram

```
Instagram Export Files          User Input (CLI)
        │                              │
        ▼                              ▼
┌──────────────┐            ┌──────────────────┐
│ followers_1  │            │  CLI Arguments   │
│ .json        │◄───────────┤  • mode          │
│              │            │  • method        │
│ following    │            │  • limit         │
│ .json        │            │  • delays        │
└──────────────┘            └──────────────────┘
        │                              │
        └─────────────┬────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Target Username │
            │  Selection       │
            └──────────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │   Download Method Router   │
        │   (Instascraper/GraphQL)   │
        └────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌──────────────────┐
│  Instaloader  │          │  Instagram API   │
│  Library      │          │  (GraphQL)       │
└───────────────┘          └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Profile Data    │
            │  + Image URL     │
            └──────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌────────────────┐         ┌────────────────────┐
│  Metadata      │         │  Profile Image     │
│  Processing    │         │  Download          │
└────────────────┘         └────────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │   Atomic Save Operation    │
        │   1. Write to .tmp         │
        │   2. Backup to .bak        │
        │   3. Atomic replace        │
        └────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌────────────────┐         ┌────────────────────┐
│  profiles_     │         │  profile_photos/   │
│  metadata.json │         │  *.jpg             │
└────────────────┘         └────────────────────┘
```

## Module Organization

```
main_refactored.py (700 lines)
├── Imports & Setup (lines 1-30)
│   ├── Standard library
│   ├── Third-party (instaloader, requests)
│   └── Type hints
│
├── Enums (lines 31-40)
│   ├── CollectionMode
│   └── DownloadMethod
│
├── Utility Functions (lines 41-60)
│   ├── compute_image_hash()
│   └── save_image_locally()
│
├── Data Loading (lines 61-150)
│   ├── load_followers_from_export()
│   ├── load_following_from_export()
│   ├── load_metadata()
│   ├── normalize_metadata_keys()
│   └── save_metadata()
│
├── Metadata Management (lines 151-210)
│   ├── get_existing_usernames()
│   ├── find_record_key_by_username()
│   └── propagate_followers_following_with_ids()
│
├── Download Methods (lines 211-400)
│   ├── download_with_instascraper()
│   ├── fetch_profile_with_graphql()
│   └── download_profile_picture()
│
├── Profile Collection (lines 401-580)
│   ├── collect_profile_metadata()
│   └── process_profiles_batch()
│
├── CLI Interface (lines 581-650)
│   └── parse_arguments()
│
└── Main Entry Point (lines 651-700)
    └── main()
```

## Error Handling Flow

```
User Request
     │
     ▼
Try Block
     │
     ├─→ Network Error ──────────┐
     │                           │
     ├─→ Rate Limit Error ───────┤
     │                           │
     ├─→ Invalid Username ───────┤
     │                           │
     ├─→ Private Account ────────┤
     │                           │
     └─→ Timeout ────────────────┤
                                 │
                                 ▼
                         Exception Handler
                                 │
                                 ├─→ Log Error Message
                                 │
                                 ├─→ Update Metadata
                                 │   record["status"] = "failed"
                                 │   record["error"] = str(e)
                                 │
                                 ├─→ Save Metadata
                                 │
                                 └─→ Continue to Next Profile
```

## Rate Limiting Strategy

```
Profile Queue: [user1, user2, user3, ...]
                     │
                     ▼
            ┌─────────────────┐
            │ Process Profile │
            └─────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  Success?       │
            └─────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌───────┐              ┌──────────┐
    │  YES  │              │   NO     │
    └───────┘              └──────────┘
        │                         │
        │                         ▼
        │                  ┌──────────────┐
        │                  │ Retry Count  │
        │                  │ < 3?         │
        │                  └──────────────┘
        │                         │
        │                    ┌────┴────┐
        │                    │         │
        │                  YES        NO
        │                    │         │
        │                    ▼         ▼
        │            ┌──────────┐  ┌──────┐
        │            │Exponential│ │ Mark │
        │            │ Backoff  │  │Failed│
        │            └──────────┘  └──────┘
        │                    │
        │                    └─────┐
        │                          │
        └──────────────────────────┤
                                   │
                                   ▼
                        ┌────────────────────┐
                        │  Rate Limit Delay  │
                        │  (random.uniform)  │
                        │  min_delay...max   │
                        └────────────────────┘
                                   │
                                   ▼
                            Next Profile
```

## Comparison: Old vs New Architecture

### Old Architecture (Playwright-based)

```
┌────────────────────────────────────────┐
│  InstagramProfileDownloader (Class)    │
│  ┌──────────────────────────────────┐ │
│  │  __init__()                       │ │
│  │  _load_metadata()                 │ │
│  │  _save_metadata()                 │ │
│  │  load_export_files()              │ │
│  │  collect_profile_with_image()     │ │──┐
│  │  _mark_failure()                  │ │  │
│  │  (15+ methods)                    │ │  │
│  └──────────────────────────────────┘ │  │
└────────────────────────────────────────┘  │
                   │                        │
                   ▼                        │
┌────────────────────────────────────────┐  │
│  InstagramPlaywrightDownloader         │◄─┘
│  ┌──────────────────────────────────┐ │
│  │  start_browser()                  │ │
│  │  login_interactive()              │ │
│  │  extract_profile_image()          │ │
│  │  upload_to_r2()                   │ │
│  │  (10+ methods)                    │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
                   │
                   ▼
      ┌──────────────────────┐
      │  Playwright Browser  │
      │  (Chromium)          │
      └──────────────────────┘
```

### New Architecture (Function-based)

```
┌──────────────────────────────────────────────────┐
│  main_refactored.py (Modular Functions)          │
│                                                   │
│  ┌────────────────┐  ┌─────────────────────┐   │
│  │ Data Loading   │  │ Metadata Management │   │
│  │ (4 functions)  │  │ (4 functions)       │   │
│  └────────────────┘  └─────────────────────┘   │
│                                                   │
│  ┌────────────────┐  ┌─────────────────────┐   │
│  │ Download       │  │ Profile Collection  │   │
│  │ Methods        │  │ (2 functions)       │   │
│  │ (4 functions)  │  └─────────────────────┘   │
│  └────────────────┘                             │
│         │                                         │
│    ┌────┴────┐                                   │
│    │         │                                   │
│    ▼         ▼                                   │
│  ┌────┐  ┌────────┐                            │
│  │ IL │  │GraphQL │                            │
│  └────┘  └────────┘                            │
└──────────────────────────────────────────────────┘
          │            │
          ▼            ▼
    ┌──────────────────────┐
    │  Instagram API       │
    │  (Direct Calls)      │
    └──────────────────────┘
```

## Key Architectural Improvements

1. **Separation of Concerns**
   - Each function has one responsibility
   - Data loading separate from processing
   - Download methods independent

2. **Modularity**
   - Functions can be imported and reused
   - Easy to test individually
   - Easy to extend with new methods

3. **No Class Overhead**
   - Stateless functions where possible
   - Clearer data flow
   - Easier to reason about

4. **Lightweight**
   - No browser dependency
   - Direct API calls
   - Minimal memory footprint

5. **Extensibility**
   - Add new download methods easily
   - Add new data sources
   - Plug in database backends
