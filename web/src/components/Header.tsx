import Link from 'next/link';
import { Instagram } from 'lucide-react';

// Interim logo treatment (icon + text) — a proper artist-made Wesleygram
// wordmark is planned; drop it in here when it exists.
export function Header() {
  return (
    <header className="pt-safe sticky top-0 z-50 w-full border-b border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-neutral-800">
      <div className="flex h-16 items-center justify-center">
        <Link href="/" className="flex items-center gap-2">
          <Instagram className="h-7 w-7 text-foreground" />
          <span className="text-2xl font-bold text-foreground">Wesleygram</span>
        </Link>
      </div>
    </header>
  );
}
