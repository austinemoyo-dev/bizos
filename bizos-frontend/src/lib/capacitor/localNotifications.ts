import { Capacitor } from '@capacitor/core';

async function getPlugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

export async function initLocalNotificationChannels() {
  if (!Capacitor.isNativePlatform()) return;
  const plugin = await getPlugin();
  await plugin.requestPermissions();

  await plugin.createChannel({
    id: 'bizos_sync',
    name: 'Sync Status',
    importance: 2,
    description: 'Pending offline changes',
    vibration: false,
    sound: undefined,
  });

  await plugin.createChannel({
    id: 'bizos_weekly',
    name: 'Weekly Summary',
    importance: 3,
    description: 'Weekly business summary',
  });
}

/**
 * Feature 11 — schedule a weekly Monday 8am summary notification.
 * Safe to call multiple times — cancels any previous weekly notification first.
 */
export async function scheduleWeeklySummary() {
  if (!Capacitor.isNativePlatform()) return;
  const plugin = await getPlugin();

  // Cancel any existing schedule
  try { await plugin.cancel({ notifications: [{ id: 8800 }] }); } catch { /* ok */ }

  const at = nextWeekday(1, 8, 0); // Monday 08:00

  await plugin.schedule({
    notifications: [{
      id: 8800,
      title: 'BizOS — Weekly Summary',
      body: 'Check your business performance for the week',
      channelId: 'bizos_weekly',
      schedule: { at, every: 'week', allowWhileIdle: true },
      extra: { url: 'bizos://analytics' },
    }],
  });
}

function nextWeekday(weekday: number, hour: number, minute: number): Date {
  const now = new Date();
  const result = new Date(now);
  const diff = (weekday - now.getDay() + 7) % 7 || 7;
  result.setDate(now.getDate() + diff);
  result.setHours(hour, minute, 0, 0);
  return result;
}
