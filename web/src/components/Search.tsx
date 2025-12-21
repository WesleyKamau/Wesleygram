'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search as SearchIcon } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';
import { PROFILE_PREVIEW_SIZE } from '@/lib/constants';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SearchProps {
  profiles: Profile[];
}

export function Search({ profiles }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadedAvatars, setLoadedAvatars] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    if (query.length > 0) {
      const lowerQuery = query.toLowerCase().trim();
      // Split query into words, filter empty strings
      const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
      
      // Score each profile based on match quality
      const scored = profiles
        .map((p) => {
          const username = p.username.toLowerCase();
          // Strip underscores, dots, numbers for matching
          const usernameClean = username.replace(/[_.0-9]/g, '');
          const fullName = p.full_name.toLowerCase();
          // Combined searchable text
          const combined = `${username} ${usernameClean} ${fullName}`;
          let score = 0;

          // Single word query - use original logic + fuzzy
          if (queryWords.length === 1) {
            const word = queryWords[0];
            
            // Exact matches get highest priority
            if (username === word) score += 1000;
            if (fullName === word) score += 900;

            // Starts with query - very high priority
            if (username.startsWith(word)) score += 500;
            if (usernameClean.startsWith(word)) score += 450;
            if (fullName.startsWith(word)) score += 400;

            // Username contains query - medium priority
            if (username.includes(word)) {
              score += 200 - username.indexOf(word);
            }
            // Clean username contains (catches "jaywill" from "_jaywill25._")
            if (usernameClean.includes(word)) {
              score += 180 - usernameClean.indexOf(word);
            }

            // Full name contains query - lower priority
            if (fullName.includes(word)) {
              score += 100 - fullName.indexOf(word);
            }
          } else {
            // Multi-word query - all words must match somewhere
            let allMatch = true;
            let matchScore = 0;
            
            for (const word of queryWords) {
              const inUsername = username.includes(word);
              const inUsernameClean = usernameClean.includes(word);
              const inFullName = fullName.includes(word);
              const inCombined = combined.includes(word);
              
              if (!inCombined) {
                // Try fuzzy: check if letters appear in sequence
                const fuzzyMatch = fuzzyContains(combined, word);
                if (!fuzzyMatch) {
                  allMatch = false;
                  break;
                } else {
                  matchScore += 20; // Fuzzy match gets lower score
                }
              } else {
                // Direct match scoring
                if (inUsername) matchScore += 100;
                else if (inUsernameClean) matchScore += 80;
                else if (inFullName) matchScore += 60;
              }
            }
            
            if (allMatch) {
              score = matchScore;
              // Bonus if username starts with first query word
              if (username.startsWith(queryWords[0]) || usernameClean.startsWith(queryWords[0])) {
                score += 200;
              }
            }
          }

          return { profile: p, score };
        })
        .filter((item) => item.score > 0) // Only include matches
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 10) // Limit to 10 results
        .map((item) => item.profile);

      setResults(scored);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, profiles]);
  
  // Fuzzy match: checks if all chars of needle appear in haystack in order
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
    // Blur the input to prevent zoom persistence on mobile
    if (inputRef.current) {
      inputRef.current.blur();
    }
    // Scroll to top to reset any zoom
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push(`/profile/${profile.instagram_id}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search"
          className="w-full rounded-lg bg-neutral-100 py-2 pl-10 pr-4 text-base text-foreground placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:bg-neutral-900 dark:text-white dark:focus:ring-neutral-700"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          {results.map((profile) => (
            <button
              key={profile.instagram_id}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => handleSelect(profile)}
            >
              <div 
                className="relative overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                style={{ width: PROFILE_PREVIEW_SIZE, height: PROFILE_PREVIEW_SIZE }}
              >
                {!loadedAvatars[profile.instagram_id] && (
                  <Skeleton
                    height="100%"
                    width="100%"
                    circle
                    baseColor="#d6d6d6"
                    highlightColor="#e9e9e9"
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
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {profile.username}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {profile.full_name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
