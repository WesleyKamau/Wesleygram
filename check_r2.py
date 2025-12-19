import json

with open('instagram_downloader/data/profiles_metadata.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

profiles = data['profiles']
total = len(profiles)
r2_keys = [p.get('original_image_r2_key') for p in profiles.values()]
r2_present = sum(1 for k in r2_keys if k)
r2_missing = sum(1 for k in r2_keys if not k)

print(f'Total profiles: {total}')
print(f'R2 keys present: {r2_present}')
print(f'R2 keys missing: {r2_missing}')

# Find profiles without R2 keys
missing = [p for p in profiles.values() if not p.get('original_image_r2_key')]
if missing:
    print(f'\nProfiles without R2 keys:')
    for p in missing:
        print(f"  - {p.get('username')} (id: {p.get('instagram_id')}, status: {p.get('status')}, r2_status: {p.get('r2_upload_status')})")
