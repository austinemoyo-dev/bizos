import { db, PendingSync } from '@/lib/db/dexie';
import { setPendingSyncFlag, showSyncNotification } from '@/lib/capacitor/nativePlugin';

async function notifyNativeOfCount(count: number) {
  await setPendingSyncFlag(count > 0);
  await showSyncNotification(count);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bizos-sync-count', { detail: count }));
  }
}

export async function queueMutation(
  endpoint: string,
  method: PendingSync['method'],
  payload?: object,
  optimistic_id?: string,
): Promise<void> {
  await db.pendingSync.add({
    endpoint,
    method,
    payload,
    optimistic_id,
    created_at: Date.now(),
    retries: 0,
  });

  const count = await db.pendingSync.count();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('bizos-sync-queue-changed'));
  await notifyNativeOfCount(count);

  // Web Background Sync (service worker)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('bizos-sync');
    } catch { /* not supported */ }
  }
}

export async function flushSyncQueue(): Promise<{ synced: number; failed: number }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!token) return { synced: 0, failed: 0 };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
  const pending = await db.pendingSync.orderBy('created_at').toArray();

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.retries >= 5) {
      await db.pendingSync.delete(item.id!);
      failed++;
      continue;
    }

    try {
      const res = await fetch(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: item.payload ? JSON.stringify(item.payload) : undefined,
      });

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await db.pendingSync.delete(item.id!);
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('bizos-sync-queue-changed'));
        if (res.ok) synced++;
        else failed++;
      } else {
        await db.pendingSync.update(item.id!, { retries: item.retries + 1 });
        failed++;
      }
    } catch {
      // Network error — increment retries and continue to next item
      await db.pendingSync.update(item.id!, { retries: item.retries + 1 });
      failed++;
    }
  }

  // Update native state after flush
  const remaining = await db.pendingSync.count();
  await notifyNativeOfCount(remaining);

  return { synced, failed };
}

export async function getPendingCount(): Promise<number> {
  return db.pendingSync.count();
}
