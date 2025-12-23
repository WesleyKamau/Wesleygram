'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [shouldAnimate, setShouldAnimate] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      // Just peek at the flag, don't remove it yet to be safe with Strict Mode
      const flag = sessionStorage.getItem('from-search');
      return !!flag;
    } catch (e) {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    // Remove the flag after we've decided to animate
    if (shouldAnimate) {
      try {
        sessionStorage.removeItem('from-search');
      } catch (e) {
        // ignore
      }
    }
  }, [shouldAnimate]);

  useEffect(() => {
    // If navigation happens without flag, ensure we don't animate
    // This handles cases where we might navigate within the same component instance
    try {
      const flag = sessionStorage.getItem('from-search');
      if (flag) {
        setShouldAnimate(true);
        sessionStorage.removeItem('from-search');
      }
    } catch (e) {
      // ignore
    }
  }, [pathname]);

  if (!shouldAnimate) {
    return <div className="h-full w-full">{children}</div>;
  }

  return (
    <div className="w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{
            type: 'tween',
            ease: 'easeInOut',
            duration: 0.3,
          }}
          className="h-full w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
