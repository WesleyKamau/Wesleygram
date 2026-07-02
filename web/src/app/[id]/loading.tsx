import { Search } from 'lucide-react';
import { WesleygramWordmark } from '@/components/WesleygramWordmark';

// Shown instantly on navigation while the profile route streams from the
// server — gives the tap immediate feedback so it feels native. Mirrors the
// ProfileView layout so there's minimal shift when the real content arrives.
// The header chrome is static, so it renders for real (no skeleton) and the
// wordmark never flashes.
export default function Loading() {
  const block = 'bg-neutral-200 dark:bg-neutral-800 animate-pulse';

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="pt-safe sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <span className="text-foreground">
            <WesleygramWordmark className="h-[37px] w-auto" />
          </span>
          <span className="rounded-lg p-2 text-neutral-600 dark:text-neutral-400">
            <Search className="h-5 w-5" />
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-3 sm:pt-6 min-h-0 overflow-hidden">
        <div className="flex w-full max-w-md flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-20 w-20 shrink-0 rounded-full ${block}`} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`h-5 w-32 rounded ${block}`} />
              <div className={`h-4 w-24 rounded ${block}`} />
            </div>
          </div>

          <div className={`aspect-square w-full max-h-[50svh] sm:max-h-none rounded-lg ${block}`} />

          <div className="flex gap-4">
            <div className={`h-14 flex-1 rounded-lg ${block}`} />
            <div className={`h-14 flex-1 rounded-lg ${block}`} />
          </div>

          <div className={`h-24 w-full rounded-lg ${block}`} />
        </div>
      </main>
    </div>
  );
}
