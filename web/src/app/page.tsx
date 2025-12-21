import { getProcessedProfiles } from '@/lib/profiles';
import { Search } from '@/components/Search';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Home() {
  const profiles = getProcessedProfiles();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <h1 className="text-center text-2xl font-light">Search Profiles</h1>
          <Search profiles={profiles} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
