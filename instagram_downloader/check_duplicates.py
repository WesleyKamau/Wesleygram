import json
from collections import Counter

with open('instagram_downloader/data/profiles_metadata.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

profiles = data['profiles']
r2_keys = [p.get('original_image_r2_key') for p in profiles.values() if p.get('original_image_r2_key')]

print(f'Total profiles: {len(profiles)}')
print(f'Total R2 keys: {len(r2_keys)}')
print(f'Unique R2 keys: {len(set(r2_keys))}')

# Find duplicates
counts = Counter(r2_keys)
duplicates = {k: v for k, v in counts.items() if v > 1}

if duplicates:
    print(f'\nDuplicate R2 keys found:')
    for key, count in duplicates.items():
        print(f'  {key}: {count} times')
        # Find which profiles share this key
        matching = [p for p in profiles.values() if p.get('original_image_r2_key') == key]
        for p in matching:
            print(f'    - {p.get("username")} (id: {p.get("instagram_id")})')
else:
    print('\nNo duplicate R2 keys found - all 971 keys are unique')
    print('The missing object in R2 might be a sync/upload issue, not a duplicate.')
