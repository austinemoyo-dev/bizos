'use client';

import { useUIStore } from '@/lib/stores/uiStore';
import { usePathname, useRouter } from 'next/navigation';

export function ScopeSwitcher() {
  const { activeScope, setActiveScope } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();

  const switchScope = (scope: 'business' | 'personal') => {
    setActiveScope(scope);
    if (scope === 'business' && !pathname.startsWith('/business')) {
      router.push('/business/dashboard');
    } else if (scope === 'personal' && !pathname.startsWith('/personal')) {
      router.push('/personal/dashboard');
    }
  };

  return (
    <div style={{ padding: 'var(--space-4) var(--space-3)' }}>
      <div className="tabs" style={{ width: '100%' }}>
        <button
          className={`tab ${activeScope === 'business' ? 'active' : ''}`}
          style={{ flex: 1, fontSize: 'var(--text-xs)' }}
          onClick={() => switchScope('business')}
        >
          Business
        </button>
        <button
          className={`tab ${activeScope === 'personal' ? 'active' : ''}`}
          style={{ flex: 1, fontSize: 'var(--text-xs)' }}
          onClick={() => switchScope('personal')}
        >
          Personal
        </button>
      </div>
    </div>
  );
}
