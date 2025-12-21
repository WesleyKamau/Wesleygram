export function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200 bg-background py-6 dark:border-neutral-800">
      <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
        <p className="text-center text-sm leading-loose text-neutral-500 md:text-left dark:text-neutral-400">
          Made by{' '}
          <a
            href="https://wesleykamau.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline decoration-neutral-400 underline-offset-2 hover:text-neutral-900 hover:decoration-neutral-900 dark:hover:text-neutral-200 dark:hover:decoration-neutral-200"
          >
            Wesley Kamau
          </a>
        </p>
      </div>
    </footer>
  );
}
