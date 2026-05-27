import { Capacitor } from '@capacitor/core';
import { initPushNotifications } from './push';
import { initLocalNotificationChannels, scheduleWeeklySummary } from './localNotifications';
import { scheduleBackgroundSync } from './nativePlugin';

/**
 * Bootstrap all Android-specific features once the app has mounted.
 * Safe to call on every boot — each registration is idempotent.
 */
export async function initCapacitorFeatures() {
  if (!Capacitor.isNativePlatform()) return;

  await initLocalNotificationChannels(); // must come before scheduling
  await initPushNotifications();         // Feature 2: FCM registration
  await scheduleBackgroundSync();        // Feature 18: WorkManager periodic check
  await scheduleWeeklySummary();         // Feature 11: weekly Monday notification
}
