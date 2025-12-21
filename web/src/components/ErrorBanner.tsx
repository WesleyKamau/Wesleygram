'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Triggers a toast error when the error query param is present, then cleans it.
export function ErrorBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) return;

    const messages: Record<string, string> = {
      'user-not-found': 'User not found',
    };

    const msg = messages[error] ?? 'Something went wrong';
    const id = toast.error(msg, {
      duration: 6000,
      action: {
        label: 'Dismiss',
        onClick: () => toast.dismiss(id),
      },
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete('error');
    router.replace(params.toString() ? `/?${params.toString()}` : '/');
  }, [searchParams, router]);

  return null;
}
