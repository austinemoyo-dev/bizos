export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notify(title: string, body: string, options?: { tag?: string; icon?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: options?.icon ?? '/icons/icon-192.png',
    tag: options?.tag,
    badge: '/icons/icon-192.png',
  });
}

export function notifyLowStock(count: number) {
  notify('⚠️ Low Stock Alert', `${count} item${count > 1 ? 's' : ''} need restocking`, { tag: 'low-stock' });
}

export function notifyTitheDue(amount: string) {
  notify('🙏 Tithe Due', `${amount} tithe is waiting to be paid`, { tag: 'tithe-due' });
}

export function notifyNewJob(jobNumber: number, customer: string) {
  notify('🔧 New Repair Job', `Job #${jobNumber} — ${customer}`, { tag: `job-${jobNumber}` });
}

export function notifyProfitMilestone(profit: string) {
  notify('🎉 Profit Milestone!', `Net profit this month: ${profit}`, { tag: 'profit' });
}
