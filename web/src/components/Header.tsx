import Link from 'next/link';
import { Instagram } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-neutral-800">
      <div className="container flex h-16 items-center justify-center">
        <Link href="/" className="flex items-center gap-2">
          {/* Placeholder for Instagram-style logo/header */}
          <Instagram className="h-7 w-7 text-foreground" />
          <span className="text-2xl font-bold text-foreground">Wesleygram</span>
        </Link>
      </div>
    </header>
  );
}
