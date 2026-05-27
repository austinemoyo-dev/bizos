import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativePluginDef {
  updateWidgetData(data: { balance: string; repairs: string; hasPending: boolean }): Promise<void>;
  setPendingSyncFlag(data: { pending: boolean }): Promise<void>;
  scheduleBackgroundSync(): Promise<void>;
  saveAuthToken(data: { token: string | null }): Promise<void>;
  showSyncNotification(data: { count: number }): Promise<void>;
}

const NativePlugin = registerPlugin<NativePluginDef>('NativePlugin');

function isNative() {
  return Capacitor.isNativePlatform();
}

/** Feature 4: push current financial snapshot into the home-screen widget. */
export async function updateWidgetData(
  balance: string,
  repairs: string,
  hasPending: boolean,
) {
  if (!isNative()) return;
  try { await NativePlugin.updateWidgetData({ balance, repairs, hasPending }); } catch { /* no-op */ }
}

/** Features 5 & 18: flag whether unsynced Dexie mutations exist. */
export async function setPendingSyncFlag(pending: boolean) {
  if (!isNative()) return;
  try { await NativePlugin.setPendingSyncFlag({ pending }); } catch { /* no-op */ }
}

/** Feature 18: schedule WorkManager periodic background sync check. */
export async function scheduleBackgroundSync() {
  if (!isNative()) return;
  try { await NativePlugin.scheduleBackgroundSync(); } catch { /* no-op */ }
}

/** Feature 1 helper: persist access token so WorkManager can read it. */
export async function saveAuthTokenNative(token: string | null) {
  if (!isNative()) return;
  try { await NativePlugin.saveAuthToken({ token }); } catch { /* no-op */ }
}

/** Feature 5: show/cancel the persistent Android sync notification. */
export async function showSyncNotification(count: number) {
  if (!isNative()) return;
  try { await NativePlugin.showSyncNotification({ count }); } catch { /* no-op */ }
}
