import { Capacitor } from '@capacitor/core';

/**
 * Feature 7 — Share Sheet.
 * Falls back to the Web Share API on non-native platforms.
 */
export async function shareText(title: string, text: string, url?: string) {
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text, url, dialogTitle: title });
  } else if (navigator.share) {
    await navigator.share({ title, text, url });
  }
}

export async function shareFiles(title: string, files: string[]) {
  if (!Capacitor.isNativePlatform()) return;
  const { Share } = await import('@capacitor/share');
  await Share.share({ title, files, dialogTitle: title });
}

/** Share the current page URL with a summary blurb. */
export async function sharePageSummary(
  pageTitle: string,
  summary: string,
) {
  const url = typeof window !== 'undefined' ? window.location.href : undefined;
  await shareText(`BizOS — ${pageTitle}`, summary, url);
}
