'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user dismissed within last 7 days
    const dismissed = localStorage.getItem('bizos-install-dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay banner by 3 s so it doesn't interrupt the first page load
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') {
      localStorage.setItem('bizos-install-dismissed', String(Date.now()));
    }
    setDeferredPrompt(null);
    setVisible(false);
    setInstalling(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('bizos-install-dismissed', String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            left: 'var(--space-4)',
            right: 'var(--space-4)',
            zIndex: 900,
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'blur(28px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
            border: '1px solid var(--glass-border-shine)',
            borderRadius: 20,
            padding: 'var(--space-4)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          {/* Top accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, #C8102E, #D4A535, #C8102E, transparent)',
            borderRadius: '20px 20px 0 0', pointerEvents: 'none',
          }} />

          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #C8102E, #7B0018)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(200,16,46,0.4)',
          }}>
            <Smartphone size={20} color="#fff" />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Install BizOS
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
              Add to home screen for the full app experience
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button
              onClick={handleInstall}
              disabled={installing}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, #C8102E, #9B0D22)',
                border: 'none', color: '#fff',
                fontSize: 'var(--text-xs)', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(200,16,46,0.4)',
                opacity: installing ? 0.7 : 1,
              }}
            >
              <Download size={13} />
              {installing ? 'Installing…' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              style={{
                width: 32, height: 32, borderRadius: 10, border: 'none',
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
              aria-label="Dismiss install prompt"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
