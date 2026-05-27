import { Capacitor } from '@capacitor/core';

/**
 * Feature 17 — Deep Links.
 * Maps bizos:// URLs to Next.js routes. Call once after the router is ready.
 */
export function initDeepLinks(push: (path: string) => void) {
  if (!Capacitor.isNativePlatform()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', (event) => {
      const path = resolveDeepLink(event.url);
      if (path) push(path);
    });
  });

  // Also handle links fired from push notification taps (Feature 2)
  if (typeof window !== 'undefined') {
    window.addEventListener('bizos-deeplink', (e) => {
      const url = (e as CustomEvent<string>).detail;
      const path = resolveDeepLink(url);
      if (path) push(path);
    });
  }
}

const ROUTE_MAP: Record<string, string> = {
  'business/dashboard':  '/business/dashboard',
  'repairs/new':         '/business/repairs',
  'repairs':             '/business/repairs',
  'expenses/new':        '/business/expenses',
  'expenses':            '/business/expenses',
  'inventory':           '/business/inventory',
  'analytics':           '/business/analytics',
  'settings':            '/settings',
  'personal/dashboard':  '/personal/dashboard',
};

function resolveDeepLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'bizos:') return null;
    const key = `${url.hostname}${url.pathname}`.replace(/^\/|\/$/g, '');
    return ROUTE_MAP[key] ?? `/${key}`;
  } catch {
    return null;
  }
}
