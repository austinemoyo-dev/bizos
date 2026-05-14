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
  const isPersonal = pathname.startsWith('/personal');

  return (
    <div className="app-shell" data-scope={isPersonal ? 'personal' : 'business'}>
      <Sidebar />

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, height: '100dvh' }}>
        <OfflineBanner />
        <TopBar />

        <main className="main-content" style={{ flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{ minHeight: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileTabBar />
      <ToastContainer />
    </div>
  );
}
