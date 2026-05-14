'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { initTheme } from '@/lib/stores/themeStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // offlineFirst: React Query still calls queryFn when offline.
        // withOfflineCache inside each queryFn returns Dexie data instead of throwing.
        // Without this, React Query pauses ALL queries when offline and pages
        // show infinite loading spinners instead of cached data.
        networkMode: 'offlineFirst',
        // No retry loops — withOfflineCache handles the fallback gracefully.
        // Retrying only hammers a server that isn't reachable.
        retry: 0,
        retryOnMount: false,
      },
    },
  }));

  useEffect(() => {
    initTheme();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
