'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search as SearchIcon } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';
import { PROFILE_PREVIEW_SIZE } from '@/lib/constants';

interface SearchProps {
  profiles: Profile[];
}

export function Search({ profiles }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (query.length > 0) {
      const lowerQuery = query.toLowerCase();
      
      // Score each profile based on match quality
      const scored = profiles
        .map((p) => {
          const username = p.username.toLowerCase();
          const fullName = p.full_name.toLowerCase();
          let score = 0;

          // Exact matches get highest priority
          if (username === lowerQuery) score += 1000;
          if (fullName === lowerQuery) score += 900;

          // Starts with query - very high priority
          if (username.startsWith(lowerQuery)) score += 500;
          if (fullName.startsWith(lowerQuery)) score += 400;

          // Username contains query - medium priority
          const usernameIndex = username.indexOf(lowerQuery);
          if (usernameIndex !== -1) {
            score += 200 - usernameIndex; // Earlier matches score higher
          }

          // Full name contains query - lower priority
          const fullNameIndex = fullName.indexOf(lowerQuery);
          if (fullNameIndex !== -1) {
            score += 100 - fullNameIndex; // Earlier matches score higher
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

  const handleSelect = (profile: Profile) => {
    router.push(`/profile/${profile.instagram_id}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-lg bg-neutral-100 py-2 pl-10 pr-4 text-sm text-foreground placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:bg-neutral-900 dark:text-white dark:focus:ring-neutral-700"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
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
                <Image
                  src={
                    profile.v1_image_r2_key
                      ? getImageUrl(profile.v1_image_r2_key)
                      : profile.profile_pic_url
                  }
                  alt={profile.username}
                  fill
                  className="object-cover"
                  unoptimized={!!profile.v1_image_r2_key}
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
