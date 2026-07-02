import { describe, expect, it } from 'vitest';
import { getCarouselProfiles, getHomeProfiles, getProfileById, getProfileByUsername } from '@/lib/profiles';
import { isKnownR2Key } from '@/lib/r2-keys';
import { WESLEY_ID } from '@/lib/images';

// These run against the real bundled dataset — they lock in the payload
// shape and the privacy guarantees of the stripped metadata.

const FORBIDDEN_FIELDS = [
  'local_path',
  'image_hash',
  'profile_pic_url',
  'is_private',
  'status',
  'error',
  'processed',
  'method',
  'last_processed_at',
  'r2_original_upload_status',
  'r2_original_error',
  'has_people',
  'v1_error',
  'v2_error',
  'v1_processed_at',
  'v2_processed_at',
];

describe('getHomeProfiles (slim search payload)', () => {
  const profiles = getHomeProfiles();

  it('returns the full visible dataset', () => {
    expect(profiles.length).toBeGreaterThan(3000);
  });

  it('never leaks scraper internals or dead CDN URLs', () => {
    const serialized = JSON.stringify(profiles.slice(0, 200));
    for (const field of FORBIDDEN_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }
  });

  it('excludes hidden profiles', () => {
    expect(profiles.every((p) => !p.hidden)).toBe(true);
  });

  it('gives every profile a servable image source', () => {
    const withImage = profiles.filter(
      (p) => p.v2_image_r2_key || p.v1_image_r2_key || p.original_image_r2_key
    );
    // At most a couple of scraped profiles have no image at all; those fall
    // back to the silhouette avatar in the UI.
    expect(profiles.length - withImage.length).toBeLessThanOrEqual(5);
  });
});

describe('profile lookups', () => {
  it('finds Wesley by ID and by username (case-insensitive)', () => {
    const wesley = getProfileById(WESLEY_ID);
    expect(wesley?.username).toBe('wesleykamau');
    expect(getProfileByUsername('WesleyKamau')?.instagram_id).toBe(WESLEY_ID);
  });

  it('returns undefined for unknown ids', () => {
    expect(getProfileById('000000000000')).toBeUndefined();
  });
});

describe('getCarouselProfiles', () => {
  it('only returns processed (or Wesley) profiles', () => {
    const carousel = getCarouselProfiles();
    expect(carousel.length).toBeGreaterThan(0);
    for (const p of carousel) {
      expect(
        p.instagram_id === WESLEY_ID || p.v2_image_r2_key || p.v1_image_r2_key
      ).toBeTruthy();
    }
  });
});

describe('isKnownR2Key (API allowlist)', () => {
  it('accepts a real key from the dataset', () => {
    const someKey = getHomeProfiles().find((p) => p.v2_image_r2_key)?.v2_image_r2_key;
    expect(someKey).toBeTruthy();
    expect(isKnownR2Key(someKey!)).toBe(true);
  });

  it('rejects arbitrary keys', () => {
    expect(isKnownR2Key('secrets/backup.sql')).toBe(false);
    expect(isKnownR2Key('')).toBe(false);
  });
});
