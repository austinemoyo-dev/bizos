'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';
import { authenticateWithBiometric } from '@/lib/capacitor/biometric';
import { initDeepLinks } from '@/lib/capacitor/deepLinks';

// How long (ms) the app can be backgrounded before requiring biometric again
const BIO_TIMEOUT_MS = 5 * 60 * 1000;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loadFromStorage } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    const ok = loadFromStorage();
    if (!ok) {
      router.replace('/login');
      return;
    }

    // Feature 1 — Biometric gate on first app open
    // Race with 12s timeout — if native dialog never appears, let user in
    const biometricTimeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 12_000));
    Promise.race([authenticateWithBiometric(), biometricTimeout]).then((passed) => {
      if (!passed) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });

    // Feature 17 — Deep link routing
    initDeepLinks((path) => router.push(path));
  }, []);

  useEffect(() => {
    if (!ready) return;

    // Feature 1 — Re-prompt biometric after app resumes from background > 5 min
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastActiveRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed > BIO_TIMEOUT_MS) {
          authenticateWithBiometric().then((passed) => {
            if (!passed) router.replace('/login');
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [ready]);

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0C0D0F',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid #222',
          borderTopColor: '#C8102E',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
