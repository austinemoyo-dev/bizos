import { db } from './dexie';

/**
 * Wraps any async fetch function with offline-first caching.
 *
 * - On success: stores the result in IndexedDB (offlineCache table) keyed by `key`.
 * - On failure when offline: returns the last cached result for that key.
 * - On failure when online: rethrows (so React Query shows a real error).
 *
 * The write to IndexedDB is fire-and-forget (non-blocking) so it never slows
 * down the happy-path response.
 */
export async function withOfflineCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
): Promise<T> {
  try {
    const result = await fetchFn();
    // Seed cache in the background — don't await, never throws to caller
    db.offlineCache
      .put({ key, data: JSON.stringify(result), updated_at: Date.now() })
      .catch(() => {});
    return result;
  } catch (err) {
    // Two cases warrant reading from cache:
    //  1. navigator.onLine is false (device has no network interface)
    //  2. TypeError: fetch itself threw a network error (e.g., Wi-Fi connected but
    //     no internet — navigator.onLine is true but requests still fail)
    const isNetworkError =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      err instanceof TypeError;

    if (isNetworkError) {
      const cached = await db.offlineCache.get(key).catch(() => null);
      if (cached) return JSON.parse(cached.data) as T;
    }

    throw err;
  }
}
