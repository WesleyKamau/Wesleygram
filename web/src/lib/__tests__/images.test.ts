import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_URL,
  WESLEY_ID,
  getImageUrl,
  getProfileImageUrl,
  selectProcessedKey,
} from '@/lib/images';

const base = {
  instagram_id: '1',
  v2_image_r2_key: null,
  v1_image_r2_key: null,
  original_image_r2_key: '',
};

describe('selectProcessedKey', () => {
  it('prefers v2 over v1', () => {
    expect(selectProcessedKey({ v2_image_r2_key: 'v2.png', v1_image_r2_key: 'v1.png' })).toBe('v2.png');
  });

  it('falls back to v1', () => {
    expect(selectProcessedKey({ v2_image_r2_key: null, v1_image_r2_key: 'v1.png' })).toBe('v1.png');
  });

  it('returns null when unprocessed', () => {
    expect(selectProcessedKey({ v2_image_r2_key: null, v1_image_r2_key: null })).toBeNull();
  });
});

describe('getImageUrl', () => {
  it('routes R2 keys through /api/image with encoding', () => {
    expect(getImageUrl('outputs/a b.png')).toBe('/api/image?key=outputs%2Fa%20b.png');
  });

  it('appends whitelisted width', () => {
    expect(getImageUrl('k.png', 320)).toBe('/api/image?key=k.png&w=320');
  });

  it('passes through absolute URLs and data URLs', () => {
    expect(getImageUrl('https://x/y.png')).toBe('https://x/y.png');
    expect(getImageUrl('data:image/svg+xml;utf8,x')).toBe('data:image/svg+xml;utf8,x');
  });

  it('returns empty string for missing keys', () => {
    expect(getImageUrl(null)).toBe('');
    expect(getImageUrl(undefined)).toBe('');
  });
});

describe('getProfileImageUrl', () => {
  it('serves Wesley from the local optimized asset', () => {
    const { url, unoptimized } = getProfileImageUrl({ ...base, instagram_id: WESLEY_ID });
    expect(url).toBe('/wesley_profile.jpg');
    expect(unoptimized).toBe(false);
  });

  it('prefers the processed image', () => {
    const { url } = getProfileImageUrl({ ...base, v2_image_r2_key: 'v2.png', original_image_r2_key: 'orig.png' }, 160);
    expect(url).toBe('/api/image?key=v2.png&w=160');
  });

  it('falls back to the R2 original when unprocessed', () => {
    const { url, unoptimized } = getProfileImageUrl({ ...base, original_image_r2_key: 'orig.png' });
    expect(url).toBe('/api/image?key=orig.png');
    expect(unoptimized).toBe(true);
  });

  it('falls back to the silhouette avatar when there is no image at all', () => {
    const { url, unoptimized } = getProfileImageUrl(base);
    expect(url).toBe(DEFAULT_AVATAR_URL);
    expect(unoptimized).toBe(true);
  });
});
