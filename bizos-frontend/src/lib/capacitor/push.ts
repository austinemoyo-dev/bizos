import { Capacitor } from '@capacitor/core';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;

  await PushNotifications.register();

  // FCM token — save to backend when available
  PushNotifications.addListener('registration', async (token) => {
    await saveFcmToken(token.value);
  });

  // Tap on a background notification → navigate via deep link
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url: string | undefined = action.notification.data?.url;
    if (url && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bizos-deeplink', { detail: url }));
    }
  });
}

async function saveFcmToken(token: string) {
  try {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
    await fetch(`${base}/notifications/fcm-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform: 'android' }),
    });
  } catch { /* endpoint may not exist yet */ }
}
