import Link from 'next/link';
import { Instagram } from 'lucide-react';

// Global 404 in the style of Instagram's own error page. (Unknown profile
// IDs never land here — the [id] route redirects those to /?error=user-not-found
// with a toast; this catches everything else.)
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="pt-safe sticky top-0 z-50 w-full border-b border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-neutral-800">
        <div className="flex h-16 items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Instagram className="h-7 w-7 text-foreground" />
            <span className="text-2xl font-bold text-foreground">Wesleygram</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <h1 className="mb-4 text-2xl font-bold">
          Sorry, this page isn&apos;t available.
        </h1>
        <p className="max-w-md text-base text-neutral-500 dark:text-neutral-400">
          The link you followed may be broken, or the page may have been
          removed.{' '}
          <Link
            href="/"
            className="font-medium text-blue-600 no-underline hover:underline dark:text-blue-500"
          >
            Go back to Wesleygram.
          </Link>
        </p>
      </main>
    </div>
  );
}
