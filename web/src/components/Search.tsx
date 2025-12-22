'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search as SearchIcon } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';
import { selectProcessedKey } from '@/lib/images';
import { searchRankProfiles } from '@/lib/search';
import { PROFILE_PREVIEW_SIZE } from '@/lib/constants';
import { Checkmark } from './Checkmark';
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
  const anchorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [loadedAvatars, setLoadedAvatars] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (query.length > 0) {
      const ranked = searchRankProfiles(profiles, query, 10);
      setResults(ranked);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, profiles]);
  
  // Scoring/sorting moved to shared util

  const handleSelect = (profile: Profile) => {
    // Blur the input to prevent zoom persistence on mobile
    if (inputRef.current) {
      inputRef.current.blur();
    }
    // Flag that we navigated from search so the detail page can animate
    try {
      sessionStorage.setItem('from-search', '1');
    } catch (e) {
      // no-op if storage unavailable
    }
    // Scroll to top to reset any zoom
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push(`/${profile.instagram_id}`);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        // Navigate to search page with query
        if (inputRef.current) {
          inputRef.current.blur();
        }
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  return (
    <div className="relative w-full" ref={anchorRef}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search"
          className="w-full rounded-lg bg-neutral-100 py-2 pl-10 pr-4 text-base text-foreground placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:bg-neutral-900 dark:text-white dark:focus:ring-neutral-700"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {mounted && isOpen && results.length > 0 && createPortal(
        (
          <div
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 1000,
            }}
            className="mt-2 max-h-96 overflow-y-auto rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
          >
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
                <div className="flex flex-col">
                  <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {profile.username}
                    {profile.is_verified && (
                      <Checkmark size={16} />
                    )}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {profile.full_name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ),
        document.body
      )}
    </div>
  );
}
