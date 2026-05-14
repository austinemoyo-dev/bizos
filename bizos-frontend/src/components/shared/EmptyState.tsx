'use client';

import { PackageOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 'var(--space-10) var(--space-6)',
        gap: 'var(--space-4)', textAlign: 'center',
      }}
    >
      {/* Icon container */}
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'var(--glass-bg-light)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)',
        boxShadow: 'var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        {icon ?? <PackageOpen size={28} strokeWidth={1.5} />}
      </div>

      <div style={{ maxWidth: 300 }}>
        <p style={{
          color: 'var(--text-primary)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}>
          {title}
        </p>
        {description && (
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-xs)',
            marginTop: 'var(--space-2)',
            lineHeight: 1.6,
          }}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
