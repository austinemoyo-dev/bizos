'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useUIStore } from '@/lib/stores/uiStore';
import { flushSyncQueue, getPendingCount } from '@/lib/sync/syncQueue';

export function useOnlineStatus() {
  const { setIsOnline, addToast, setPendingSyncCount } = useUIStore();

  useEffect(() => {
    // Register service worker (web PWA only)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});

      // Listen for Background Sync trigger from SW
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'BIZOS_FLUSH_SYNC') {
          doFlush();
        }
      });
    }

    async function doFlush() {
      const result = await flushSyncQueue();
      if (result.synced > 0) {
        addToast({ type: 'success', title: `${result.synced} change${result.synced > 1 ? 's' : ''} synced` });
      }
      const count = await getPendingCount();
      setPendingSyncCount(count);
    }

    const handleOnline = () => {
      setIsOnline(true);
      addToast({ type: 'info', title: 'Back online', message: 'Syncing pending changes...' });
      doFlush();
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast({ type: 'warning', title: 'Offline mode', message: 'Changes will sync when reconnected.' });
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capacitor: appStateChange is more reliable than browser online/offline in WebView
    let removeAppListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && navigator.onLine) {
          doFlush();
        }
      }).then((handle) => {
        removeAppListener = () => handle.remove();
      });
    }

    // Periodic flush fallback — catches cases where online event doesn't fire
    const flushInterval = setInterval(() => {
      if (navigator.onLine) doFlush();
    }, 60_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      removeAppListener?.();
      clearInterval(flushInterval);
    };
  }, [setIsOnline, addToast, setPendingSyncCount]);
}
