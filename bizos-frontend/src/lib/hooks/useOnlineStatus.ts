'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { flushSyncQueue, getPendingCount } from '@/lib/sync/syncQueue';

export function useOnlineStatus() {
  const { setIsOnline, addToast, setPendingSyncCount } = useUIStore();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      addToast({ type: 'info', title: 'Back online', message: 'Syncing pending changes...' });
      const result = await flushSyncQueue();
      if (result.synced > 0) {
        addToast({ type: 'success', title: `${result.synced} changes synced` });
      }
      const count = await getPendingCount();
      setPendingSyncCount(count);
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast({ type: 'warning', title: 'Offline mode', message: 'Changes will sync when reconnected.' });
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, addToast, setPendingSyncCount]);
}
