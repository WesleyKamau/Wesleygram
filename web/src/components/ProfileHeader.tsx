'use client';

import Link from 'next/link';
import { Instagram, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileHeaderProps {
  onSearchClick: () => void;
  searchOpen: boolean;
}

export function ProfileHeader({ onSearchClick, searchOpen }: ProfileHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-neutral-800">
      <div className="container mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Instagram className="h-7 w-7 text-foreground" />
          <span className="text-2xl font-bold text-foreground">Wesleygram</span>
        </Link>
        <button
          type="button"
          onClick={onSearchClick}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label={searchOpen ? 'Close search' : 'Search profiles'}
        >
          <motion.div
            initial={false}
            animate={{ rotate: searchOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </motion.div>
        </button>
      </div>
    </header>
  );
}
