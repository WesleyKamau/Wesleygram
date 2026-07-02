'use client';

import { useCallback, useState } from 'react';
import type { HomeProfile } from '@/types';

// Module-level cache: the slim profile list is immutable per deployment, so
// one fetch serves every search surface (home dropdown, /search page) for the
// life of the tab. The /api/profiles response is also CDN-cached.
let cache: HomeProfile[] | null = null;
let inflight: Promise<HomeProfile[] | null> | null = null;

function fetchProfiles(): Promise<HomeProfile[] | null> {
  // Resolving from the cache (rather than early-returning in `load`) means a
  // hook instance that mounted before another consumer filled the cache still
  // receives the data instead of staying stuck on null.
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/profiles')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HomeProfile[] | null) => {
        if (data) cache = data;
        return data;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Lazily loads the slim profile dataset used by search. Call `load()` when
 * the user shows intent (focus / first keystroke) — or immediately on mount
 * for the dedicated search page. `profiles` is null until loaded; state is
 * only ever set asynchronously (React bails out on identical references, so
 * repeated `load()` calls are free), so there is no set-state-in-effect.
 */
export function useHomeProfiles(): {
  profiles: HomeProfile[] | null;
  load: () => void;
} {
  const [profiles, setProfiles] = useState<HomeProfile[] | null>(cache);

  const load = useCallback(() => {
    fetchProfiles().then((data) => {
      if (data) setProfiles(data);
    });
  }, []);

  return { profiles, load };
}
