import { describe, expect, it } from 'vitest';
import { filterHomepageProfiles, splitIntoRows } from '@/lib/homepage';
import { WESLEY_ID } from '@/lib/images';
import type { HomeProfile } from '@/types';

function profile(overrides: Partial<HomeProfile>): HomeProfile {
  return {
    // Explicit id wins; otherwise fall back to the username so fixtures in a
    // list get unique, deterministic ids without every test spelling them out.
    instagram_id: overrides.instagram_id ?? overrides.username ?? 'id',
    username: 'user',
    full_name: 'Full Name',
    biography: '',
    is_verified: false,
    original_image_r2_key: 'orig.png',
    v1_image_r2_key: null,
    v2_image_r2_key: 'v2.png',
    featured: undefined,
    hidden: undefined,
    is_follower: false,
    is_following: false,
    follower_count: 0,
    ...overrides,
  };
}

describe('filterHomepageProfiles', () => {
  it('excludes hidden, unprocessed, and Wesley himself', () => {
    const profiles = [
      profile({ username: 'visible' }),
      profile({ username: 'ghost', hidden: true }),
      profile({ username: 'raw', v2_image_r2_key: null }),
      profile({ username: 'wesley', instagram_id: WESLEY_ID }),
    ];
    const result = filterHomepageProfiles({ profiles, bypassFilter: true });
    expect(result.map((p) => p.username)).toEqual(['visible']);
  });

  it('repeats featured profiles to fill rows when there are enough of them', () => {
    const profiles = [
      ...Array.from({ length: 6 }, (_, i) => profile({ username: `feat${i}`, featured: true })),
      profile({ username: 'plain' }),
    ];
    const result = filterHomepageProfiles({ profiles, minFeatured: 4, targetRows: 2 });
    // 2 rows × 30 slots, filled only from the featured pool.
    expect(result).toHaveLength(60);
    expect(result.every((p) => p.featured)).toBe(true);
  });

  it('falls back to all eligible profiles when there are too few featured', () => {
    const profiles = [
      profile({ username: 'feat', featured: true }),
      profile({ username: 'plain' }),
    ];
    const result = filterHomepageProfiles({ profiles, minFeatured: 4 });
    expect(result.map((p) => p.username).sort()).toEqual(['feat', 'plain']);
  });
});

describe('splitIntoRows', () => {
  it('splits into the requested rows and injects Wesley at position 3 of row 0', () => {
    const wesley = profile({ username: 'wesley', instagram_id: WESLEY_ID });
    const pool = Array.from({ length: 60 }, (_, i) => profile({ username: `p${i}` }));
    const rows = splitIntoRows(pool, 2, 30, [...pool, wesley]);
    expect(rows).toHaveLength(2);
    expect(rows[0][3].instagram_id).toBe(WESLEY_ID);
    expect(rows[0]).toHaveLength(31); // 30 + injected Wesley
    expect(rows[1]).toHaveLength(30);
  });

  it('removes accidental Wesley duplicates from the distributed pool', () => {
    const wesley = profile({ username: 'wesley', instagram_id: WESLEY_ID });
    const pool = [wesley, ...Array.from({ length: 5 }, (_, i) => profile({ username: `p${i}` }))];
    const rows = splitIntoRows(pool, 1, 6, pool);
    const wesleyCount = rows[0].filter((p) => p.instagram_id === WESLEY_ID).length;
    expect(wesleyCount).toBe(1);
  });

  it('handles Wesley being absent from the source list', () => {
    const pool = Array.from({ length: 4 }, (_, i) => profile({ username: `p${i}` }));
    const rows = splitIntoRows(pool, 2, 2, pool);
    expect(rows[0]).toHaveLength(2);
    expect(rows[1]).toHaveLength(2);
  });
});
