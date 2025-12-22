'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Instagram, ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';
import { selectProcessedKey } from '@/lib/images';
import { searchRankProfiles } from '@/lib/search';
import { PROFILE_PREVIEW_SIZE } from '@/lib/constants';
import { Checkmark } from './Checkmark';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SearchPageClientProps {
  profiles: Profile[];
}

function SearchContent({ profiles }: SearchPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<Profile[]>([]);
  const [loadedAvatars, setLoadedAvatars] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCanGoBack(window.history.length > 1);
    }
  }, []);

  // Debounce the query to avoid lag on rapid keystrokes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Update URL when debounced query changes to keep state in sync
  useEffect(() => {
    const currentQuery = searchParams.get('q') || '';
    if (debouncedQuery !== currentQuery) {
      if (debouncedQuery) {
        router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false });
      } else {
        router.replace('/search', { scroll: false });
      }
    }
  }, [debouncedQuery, searchParams, router]);

  // Search only when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      const ranked = searchRankProfiles(profiles, debouncedQuery);
      setResults(ranked);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, profiles]);
  
  // Scoring/sorting moved to shared util

  const handleSelect = (profile: Profile) => {
    try {
      sessionStorage.setItem('from-search', '1');
    } catch (e) {}
    router.push(`/${profile.instagram_id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Just blur the input to dismiss keyboard
      inputRef.current?.blur();
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-neutral-800">
        <div className="container flex h-16 items-center gap-4 px-4">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label={canGoBack ? 'Go back' : 'Back to home'}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search profiles..."
              enterKeyHint="search"
              className="w-full rounded-lg bg-neutral-100 py-2 pl-10 pr-4 text-base text-foreground placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {query.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Instagram className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-700" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">Search Wesleygram</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Find profiles by username or name
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchIcon className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-700" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">No results found</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
              </p>
              {results.map((profile) => (
                <button
                  key={profile.instagram_id}
                  className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => handleSelect(profile)}
                >
                  <div 
                    className="relative shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                    style={{ width: PROFILE_PREVIEW_SIZE, height: PROFILE_PREVIEW_SIZE }}
                  >
                    {!loadedAvatars[profile.instagram_id] && (
                      <Skeleton
                        height="100%"
                        width="100%"
                        baseColor="#d6d6d6"
                        highlightColor="#e9e9e9"
                        containerClassName="absolute inset-0 block h-full w-full leading-none"
                        className="block h-full w-full"
                      />
                    )}
                    <Image
                      src={
                        selectProcessedKey(profile)
                          ? getImageUrl(selectProcessedKey(profile)!)
                          : profile.profile_pic_url
                      }
                      alt={profile.username}
                      fill
                      className={`object-cover ${loadedAvatars[profile.instagram_id] ? '' : 'invisible'}`}
                      unoptimized={!!selectProcessedKey(profile)}
                      onLoadingComplete={() =>
                        setLoadedAvatars((prev) => ({ ...prev, [profile.instagram_id]: true }))
                      }
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1 truncate text-base font-semibold text-foreground">
                      {profile.username}
                      {profile.is_verified && (
                        <Checkmark size={18} className="shrink-0" />
                      )}
                    </span>
                    <span className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {profile.full_name}
                    </span>
                    {profile.biography && (
                      <span className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-500">
                        {profile.biography}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function SearchPageClient({ profiles }: SearchPageClientProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent profiles={profiles} />
    </Suspense>
  );
}
