import type { Profile } from '@/types';

function normalizeQuery(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function fuzzyContains(haystack: string, needle: string): boolean {
  let hi = 0;
  for (let ni = 0; ni < needle.length; ni++) {
    const char = needle[ni];
    const found = haystack.indexOf(char, hi);
    if (found === -1) return false;
    hi = found + 1;
  }
  return true;
}

function computeScore(profile: Profile, queryWords: string[]): number {
  if (queryWords.length === 0) return 0;

  const username = profile.username.toLowerCase();
  const usernameClean = username.replace(/[_.0-9]/g, '');
  const fullName = profile.full_name.toLowerCase();
  const combined = `${username} ${usernameClean} ${fullName}`;

  let score = 0;

  if (queryWords.length === 1) {
    const word = queryWords[0];
    if (username === word) score += 1000;
    if (fullName === word) score += 900;
    if (username.startsWith(word)) score += 500;
    if (usernameClean.startsWith(word)) score += 450;
    if (fullName.startsWith(word)) score += 400;
    if (username.includes(word)) score += 200 - username.indexOf(word);
    if (usernameClean.includes(word)) score += 180 - usernameClean.indexOf(word);
    if (fullName.includes(word)) score += 100 - fullName.indexOf(word);
  } else {
    let allMatch = true;
    let matchScore = 0;
    for (const word of queryWords) {
      const inCombined = combined.includes(word);
      if (!inCombined) {
        const fuzzyMatch = fuzzyContains(combined, word);
        if (!fuzzyMatch) {
          allMatch = false;
          break;
        } else {
          matchScore += 20;
        }
      } else {
        if (username.includes(word)) matchScore += 100;
        else if (usernameClean.includes(word)) matchScore += 80;
        else if (fullName.includes(word)) matchScore += 60;
      }
    }
    if (allMatch) {
      score = matchScore;
      if (username.startsWith(queryWords[0]) || usernameClean.startsWith(queryWords[0])) {
        score += 200;
      }
    }
  }

  return score;
}

function compareProfiles(a: { profile: Profile; score: number }, b: { profile: Profile; score: number }): number {
  // 1) Search accuracy first - prioritize best matches
  if (b.score !== a.score) return b.score - a.score;

  // 2) Mutuals second
  const aMutual = a.profile.is_follower && a.profile.is_following;
  const bMutual = b.profile.is_follower && b.profile.is_following;
  if (aMutual !== bMutual) return aMutual ? -1 : 1;

  // 3) Followers (I don't follow them) next
  const aFollowerOnly = a.profile.is_follower && !a.profile.is_following;
  const bFollowerOnly = b.profile.is_follower && !b.profile.is_following;
  if (aFollowerOnly !== bFollowerOnly) return aFollowerOnly ? -1 : 1;

  // 4) People I follow (they don't follow me)
  const aFollowingOnly = !a.profile.is_follower && a.profile.is_following;
  const bFollowingOnly = !b.profile.is_follower && b.profile.is_following;
  if (aFollowingOnly !== bFollowingOnly) return aFollowingOnly ? -1 : 1;

  // 5) Follower count
  if (b.profile.follower_count !== a.profile.follower_count) {
    return b.profile.follower_count - a.profile.follower_count;
  }

  // 6) Alphabetical
  return a.profile.username.localeCompare(b.profile.username);
}

export function searchRankProfiles(profiles: Profile[], query: string, limit?: number): Profile[] {
  const words = normalizeQuery(query);
  if (words.length === 0) return [];

  // Filter out hidden profiles from search
  const visibleProfiles = profiles.filter(p => !p.hidden);

  const scored = visibleProfiles
    .map((p) => ({ profile: p, score: computeScore(p, words) }))
    .filter((item) => item.score > 0)
    .sort(compareProfiles)
    .map((item) => item.profile);

  return typeof limit === 'number' ? scored.slice(0, Math.max(0, limit)) : scored;
}
