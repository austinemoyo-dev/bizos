'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../shared/Toast';
import { OfflineBanner } from '../shared/OfflineBanner';
import { InstallPrompt } from '../shared/InstallPrompt';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useSync } from '@/lib/hooks/useSync';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  useOnlineStatus();
  useSync();

  const pathname  = usePathname();
  const isPersonal = pathname.startsWith('/personal');

  /* ── Detect mobile once, keep in sync with resize ─────────────── */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    const mq = window.matchMedia('(max-width: 767px)');
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);

  return (
    <div
      className="app-shell"
      data-scope={isPersonal ? 'personal' : 'business'}
      style={{
        display: 'flex',
        width: '100%',
        minHeight: '100dvh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar — only mounted when NOT mobile, eliminating any layout impact */}
      {!isMobile && <Sidebar />}

      {/* ── Main column — fills ALL remaining width ─────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 0%',
          minWidth: 0,
          width: isMobile ? '100%' : undefined,
          /* Prevent x-overflow from inner content */
          overflowX: 'hidden',
        }}
      >
        <OfflineBanner />
        <TopBar />

        <main
          className="main-content"
          style={{
            flex: 1,
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <AnimatePresence mode="wait">
            {/* NO transform here — transforms break position:fixed inside (bottom search bar) */}
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              style={{ width: '100%', minWidth: 0, minHeight: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom tab bar — fixed, rendered at root so it's never clipped */}
      <MobileTabBar />
      <ToastContainer />
      <InstallPrompt />
    </div>
  );
}
