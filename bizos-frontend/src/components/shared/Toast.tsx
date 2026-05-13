'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore, Toast as ToastType } from '@/lib/stores/uiStore';

const ICONS = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const COLORS = {
  success: 'var(--accent-green)',
  error: 'var(--accent-red)',
  warning: 'var(--accent-amber)',
  info: 'var(--accent-primary)',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useUIStore();

  useEffect(() => {
    const delay = toast.duration ?? (toast.type === 'error' ? 6000 : 4000);
    const t = setTimeout(() => removeToast(toast.id), delay);
    return () => clearTimeout(t);
  }, [toast.id, toast.type, toast.duration, removeToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`toast toast-${toast.type}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <span style={{ color: COLORS[toast.type], flexShrink: 0, marginTop: 2 }}>
          {ICONS[toast.type]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            {toast.title}
          </p>
          {toast.message && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
              style={{
                marginTop: 'var(--space-1)', background: 'none', border: 'none',
                padding: 0, cursor: 'pointer', fontSize: 'var(--text-xs)',
                fontWeight: 700, color: COLORS[toast.type], textDecoration: 'underline',
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          className="btn-icon"
          style={{ width: 24, height: 24, flexShrink: 0 }}
          onClick={() => removeToast(toast.id)}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();

  return (
    <div style={{
      position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
      pointerEvents: 'none',
    }}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
