'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Route template for the profile screen. Unlike a layout, a template gets a
 * fresh instance on every navigation, and — crucially — it wraps the route's
 * `loading.tsx` (it sits OUTSIDE the Suspense boundary). That means the slide
 * plays on the skeleton the instant you tap, and the real content just fills
 * in underneath with no second animation. Tap -> the screen slides in -> done.
 *
 * The slide only runs for in-app forward navigation (a card/search tap sets
 * the `from-search` flag); direct loads and back navigation render instantly.
 */
export default function ProfileTemplate({ children }: { children: React.ReactNode }) {
  const [animate] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (sessionStorage.getItem('from-search')) {
        sessionStorage.removeItem('from-search');
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  });

  if (!animate) {
    return <div className="h-full w-full">{children}</div>;
  }

  return (
    // Local clip so the off-screen start doesn't create a horizontal scrollbar.
    <div className="h-svh w-full overflow-hidden">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
        className="h-full w-full bg-background will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}
