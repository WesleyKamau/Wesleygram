'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Instagram, ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';
import { PROFILE_PREVIEW_SIZE } from '@/lib/constants';
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
  const [results, setResults] = useState<Profile[]>([]);
  const [loadedAvatars, setLoadedAvatars] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  // Update URL when query changes to keep state in sync
  useEffect(() => {
    const currentQuery = searchParams.get('q') || '';
    if (query !== currentQuery) {
      if (query) {
        router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
      } else {
        router.replace('/search', { scroll: false });
      }
    }
  }, [query, searchParams, router]);

  useEffect(() => {
    if (query.length > 0) {
      const lowerQuery = query.toLowerCase().trim();
      const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
      
      const scored = profiles
        .map((p) => {
          const username = p.username.toLowerCase();
          const usernameClean = username.replace(/[_.0-9]/g, '');
          const fullName = p.full_name.toLowerCase();
          const combined = `${username} ${usernameClean} ${fullName}`;
          let score = 0;

          if (queryWords.length === 1) {
            const word = queryWords[0];
            
            if (username === word) score += 1000;
            if (fullName === word) score += 900;
            if (username.startsWith(word)) score += 500;
            if (usernameClean.startsWith(word)) score += 450;
            if (fullName.startsWith(word)) score += 400;

            if (username.includes(word)) {
              score += 200 - username.indexOf(word);
            }
            if (usernameClean.includes(word)) {
              score += 180 - usernameClean.indexOf(word);
            }
            if (fullName.includes(word)) {
              score += 100 - fullName.indexOf(word);
            }
          } else {
            let allMatch = true;
            let matchScore = 0;
            
            for (const word of queryWords) {
              const inUsername = username.includes(word);
              const inUsernameClean = usernameClean.includes(word);
              const inFullName = fullName.includes(word);
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
                if (inUsername) matchScore += 100;
                else if (inUsernameClean) matchScore += 80;
                else if (inFullName) matchScore += 60;
              }
            }
            
            if (allMatch) {
              score = matchScore;
              if (username.startsWith(queryWords[0]) || usernameClean.startsWith(queryWords[0])) {
                score += 200;
              }
            }
          }

          return { profile: p, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => {
          // First: sort by match score
          if (b.score !== a.score) return b.score - a.score;
          
          // Then: apply hierarchy
          const aMutual = a.profile.is_follower && a.profile.is_following;
          const bMutual = b.profile.is_follower && b.profile.is_following;
          if (aMutual !== bMutual) return aMutual ? -1 : 1;
          
          // Then: followers (but not following)
          const aFollower = a.profile.is_follower && !a.profile.is_following;
          const bFollower = b.profile.is_follower && !b.profile.is_following;
          if (aFollower !== bFollower) return aFollower ? -1 : 1;
          
          // Then: by follower count
          if (b.profile.follower_count !== a.profile.follower_count) {
            return b.profile.follower_count - a.profile.follower_count;
          }
          
          // Finally: alphabetical by username
          return a.profile.username.localeCompare(b.profile.username);
        })
        .map((item) => item.profile);

      setResults(scored);
    } else {
      setResults([]);
    }
  }, [query, profiles]);
  
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

  const handleSelect = (profile: Profile) => {
    try {
      sessionStorage.setItem('from-search', '1');
    } catch (e) {}
    router.push(`/profile/${profile.instagram_id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Just blur the input to dismiss keyboard
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-neutral-800">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link
            href="/"
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
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
                        profile.v1_image_r2_key
                          ? getImageUrl(profile.v1_image_r2_key)
                          : profile.profile_pic_url
                      }
                      alt={profile.username}
                      fill
                      className={`object-cover ${loadedAvatars[profile.instagram_id] ? '' : 'invisible'}`}
                      unoptimized={!!profile.v1_image_r2_key}
                      onLoadingComplete={() =>
                        setLoadedAvatars((prev) => ({ ...prev, [profile.instagram_id]: true }))
                      }
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-semibold text-foreground">
                      {profile.username}
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
