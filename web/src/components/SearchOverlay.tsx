'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Search } from './Search';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
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
            <Search />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
