'use client';

import { useEffect } from 'react';
import { getPendingCount } from '@/lib/sync/syncQueue';
import { useUIStore } from '@/lib/stores/uiStore';

export function useSync() {
  const { setPendingSyncCount } = useUIStore();

  useEffect(() => {
    const update = async () => {
      const count = await getPendingCount();
      setPendingSyncCount(count);
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [setPendingSyncCount]);
}
