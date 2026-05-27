'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { initTheme } from '@/lib/stores/themeStore';
import { initCapacitorFeatures } from '@/lib/capacitor/init';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        networkMode: 'offlineFirst',
        retry: 0,
        retryOnMount: false,
      },
    },
  }));

  useEffect(() => {
    initTheme();
    initCapacitorFeatures(); // Features 2, 11, 18 — Android native bootstrap
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
