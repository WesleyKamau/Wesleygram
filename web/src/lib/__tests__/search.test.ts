import { describe, expect, it } from 'vitest';
import { searchRankProfiles } from '@/lib/search';
import type { HomeProfile } from '@/types';

function profile(overrides: Partial<HomeProfile>): HomeProfile {
  return {
    instagram_id: overrides.username ?? 'id',
    username: 'user',
    full_name: 'Full Name',
    biography: '',
    is_verified: false,
    original_image_r2_key: 'orig.png',
    v1_image_r2_key: null,
    v2_image_r2_key: null,
    featured: undefined,
    hidden: undefined,
    is_follower: false,
    is_following: false,
    follower_count: 0,
    ...overrides,
  };
}

describe('searchRankProfiles', () => {
  it('returns empty for a blank query', () => {
    expect(searchRankProfiles([profile({ username: 'wesley' })], '   ')).toEqual([]);
  });

  it('ranks exact username match above prefix and substring matches', () => {
    const profiles = [
      profile({ username: 'wes_fan' }),
      profile({ username: 'wes' }),
      profile({ username: 'awesome' }),
    ];
    const results = searchRankProfiles(profiles, 'wes');
    expect(results.map((p) => p.username)).toEqual(['wes', 'wes_fan', 'awesome']);
  });

  it('matches on full name too', () => {
    const results = searchRankProfiles(
      [profile({ username: 'xyz', full_name: 'Wesley Kamau' })],
      'wesley'
    );
    expect(results).toHaveLength(1);
  });

  it('ignores separators/digits in usernames for clean prefix matches', () => {
    const results = searchRankProfiles([profile({ username: 'w_e_sley99' })], 'wesley');
    expect(results).toHaveLength(1);
  });

  it('supports multi-word queries across username and name', () => {
    const results = searchRankProfiles(
      [profile({ username: 'wkamau', full_name: 'Wesley Kamau' })],
      'wesley kamau'
    );
    expect(results).toHaveLength(1);
  });

  it('excludes hidden profiles', () => {
    const results = searchRankProfiles(
      [profile({ username: 'wesley', hidden: true })],
      'wesley'
    );
    expect(results).toEqual([]);
  });

  it('excludes non-matches entirely', () => {
    expect(searchRankProfiles([profile({ username: 'bob' })], 'zzz')).toEqual([]);
  });

  it('breaks score ties by relationship: mutuals, then followers, then following', () => {
    const mutual = profile({ username: 'aaa1', is_follower: true, is_following: true });
    const follower = profile({ username: 'aaa2', is_follower: true });
    const following = profile({ username: 'aaa3', is_following: true });
    const stranger = profile({ username: 'aaa4' });
    // All share the same prefix score for query 'aaa'.
    const results = searchRankProfiles([stranger, following, follower, mutual], 'aaa');
    expect(results.map((p) => p.username)).toEqual(['aaa1', 'aaa2', 'aaa3', 'aaa4']);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => profile({ username: `wes${i}` }));
    expect(searchRankProfiles(many, 'wes', 10)).toHaveLength(10);
  });
});
