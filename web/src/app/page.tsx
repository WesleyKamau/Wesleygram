import { getProfiles } from '@/lib/profiles';
import { Suspense } from 'react';
import { Search } from '@/components/Search';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ErrorBanner } from '@/components/ErrorBanner';

export default function Home() {
  const profiles = getProfiles();

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <Suspense fallback={null}>
          <ErrorBanner />
        </Suspense>
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-background px-4 py-3 dark:border-neutral-800">
          <div className="mx-auto w-full max-w-2xl">
            <Search profiles={profiles} />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="text-center text-neutral-400 dark:text-neutral-500">
            <p className="text-sm">Look yourself up (or someone else)</p>
            <p className="text-sm">Im still working on stuff to put here maybe liek a cool preview</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
