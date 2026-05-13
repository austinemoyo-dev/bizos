'use client';

import { WifiOff } from 'lucide-react';
import { useUIStore } from '@/lib/stores/uiStore';

export function OfflineBanner() {
  const { isOnline } = useUIStore();
  if (isOnline) return null;
  return (
    <div className="offline-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <WifiOff size={14} />
      You&apos;re offline — changes will sync when reconnected
    </div>
  );
}
