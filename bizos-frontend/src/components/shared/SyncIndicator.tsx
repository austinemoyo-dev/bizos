'use client';

import { useUIStore } from '@/lib/stores/uiStore';

export function SyncIndicator() {
  const { isOnline, pendingSyncCount } = useUIStore();

  const status = !isOnline ? 'offline' : pendingSyncCount > 0 ? 'pending' : 'synced';
  const label = !isOnline ? 'Offline' : pendingSyncCount > 0 ? `${pendingSyncCount} pending` : 'Synced';

  return (
    <div className="sync-status">
      <div className={`sync-dot ${status}`} />
      <span>{label}</span>
    </div>
  );
}
