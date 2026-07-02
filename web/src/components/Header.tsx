import Link from 'next/link';
import { WesleygramWordmark } from './WesleygramWordmark';

export function Header() {
  return (
    <header className="pt-safe sticky top-0 z-50 w-full border-b border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-neutral-800">
      <div className="container mx-auto flex h-16 max-w-2xl items-center px-4">
        <Link href="/" aria-label="Wesleygram home" className="text-foreground">
          <WesleygramWordmark className="h-[37px] w-auto" />
        </Link>
      </div>
    </header>
  );
}
