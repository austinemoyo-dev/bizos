'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
  accentColor?: string;
}

export function Modal({ isOpen, onClose, title, children, width = 520, footer, accentColor = '#C8102E' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="modal-glass-sheet"
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', maxWidth: width,
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'blur(28px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
              border: '1px solid var(--glass-border-shine)',
              borderRadius: 'var(--card-radius-lg)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              margin: 'var(--space-4)',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle (visible on mobile via CSS) */}
            <div className="modal-drag-handle" />

            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${accentColor}80, ${accentColor}, ${accentColor}80, transparent)`,
              borderRadius: '28px 28px 0 0',
              pointerEvents: 'none',
            }} />

            {/* Shine overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 45%)',
              pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-5) var(--space-6)',
              borderBottom: '1px solid var(--glass-border)',
              position: 'relative', zIndex: 1,
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                  width: 4, height: 20, borderRadius: 2,
                  background: `linear-gradient(180deg, ${accentColor}, ${accentColor}80)`,
                  boxShadow: `0 0 8px ${accentColor}60`,
                  flexShrink: 0,
                }} />
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)',
                  fontWeight: 700, letterSpacing: '-0.01em',
                }}>
                  {title}
                </h2>
              </div>
              <button
                className="btn-icon"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 10,
                  width: 32, height: 32,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)', position: 'relative', zIndex: 1 }}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div style={{
                padding: 'var(--space-4) var(--space-6)',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end',
                position: 'relative', zIndex: 1,
                background: 'rgba(0,0,0,0.1)',
              }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
