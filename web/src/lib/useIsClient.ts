'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Returns `false` during SSR and the initial hydration render, then `true`
 * once mounted on the client. Use it to gate client-only work (Math.random,
 * `window` reads) inside `useMemo` so it never runs on the server — avoiding
 * hydration mismatches without a set-state-in-effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
