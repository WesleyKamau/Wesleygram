"use client";

import { useRouter } from 'next/navigation';

export function Footer() {
  const router = useRouter();

  const handleClick = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('from-search', '1');
      }
    } catch {}
    router.push('/290944620');
  };

  return (
    <footer className="w-full border-t border-neutral-200 bg-background py-4 sm:py-5 dark:border-neutral-800">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 md:flex-row md:gap-8">
        <p className="text-center text-sm text-neutral-500 md:text-left dark:text-neutral-400">
          Made by{' '}
          <button
            type="button"
            onClick={handleClick}
            className="font-medium underline decoration-neutral-400 underline-offset-2 hover:text-neutral-900 hover:decoration-neutral-900 dark:hover:text-neutral-200 dark:hover:decoration-neutral-200"
            aria-label="View Wesley's profile"
          >
            Wesley Kamau
          </button>
        </p>
      </div>
    </footer>
  );
}
