'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Search } from './Search';
import { Profile } from '@/lib/profiles';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  profiles?: Profile[];
}

// Module-level cache so profiles are fetched once across all instances
let cachedProfiles: Profile[] | null = null;

export function SearchOverlay({ isOpen, onClose, profiles: profilesProp }: SearchOverlayProps) {
  const [fetchedProfiles, setFetchedProfiles] = useState<Profile[]>(cachedProfiles || []);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lazy-fetch profiles when opened if not provided as a prop
  useEffect(() => {
    if (profilesProp || cachedProfiles || fetchedRef.current) return;
    if (!isOpen) return;
    fetchedRef.current = true;

    fetch('/api/profiles')
      .then((res) => res.json())
      .then((data: Profile[]) => {
        cachedProfiles = data;
        setFetchedProfiles(data);
      })
      .catch(() => {});
  }, [isOpen, profilesProp]);

  const profiles = profilesProp || fetchedProfiles;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden border-b border-neutral-200 bg-background dark:border-neutral-800"
        >
          <div className="mx-auto max-w-2xl px-4 py-3">
            <Search profiles={profiles} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
