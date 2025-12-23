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
      const flag = sessionStorage.getItem('from-search');
      if (flag) {
        // Remove flag immediately after reading to prevent race conditions
        sessionStorage.removeItem('from-search');
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    // Handle navigation to ensure animation state is correct
    // Only check and update if pathname changes
    try {
      const flag = sessionStorage.getItem('from-search');
      if (flag) {
        sessionStorage.removeItem('from-search');
        setShouldAnimate(true);
      } else {
        setShouldAnimate(false);
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
