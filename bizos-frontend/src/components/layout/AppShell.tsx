'use client';

import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../shared/Toast';
import { OfflineBanner } from '../shared/OfflineBanner';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useSync } from '@/lib/hooks/useSync';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  useOnlineStatus();
  useSync();
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <OfflineBanner />
        <TopBar />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} id="main-scroll">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{ padding: 'var(--space-5)', paddingBottom: 'calc(var(--space-5) + 80px)', minHeight: '100%' }}
              className="page-content"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <MobileTabBar />
      </div>

      <ToastContainer />

      <style>{`
        .desktop-sidebar { display: flex; flex-shrink: 0; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .page-content { padding: var(--space-4) !important; padding-bottom: calc(90px + env(safe-area-inset-bottom)) !important; }
        }
        @media (min-width: 769px) {
          #main-scroll { padding-bottom: 0; }
          .page-content { padding-bottom: var(--space-8) !important; }
        }
      `}</style>
    </div>
  );
}
