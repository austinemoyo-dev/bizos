'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  accentColor?: string;
  accentGlow?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
  accentColor = 'var(--accent-primary)',
  accentGlow = 'rgba(200,16,46,0.12)',
}: PageHeaderProps) {
  return (
    <motion.div
      className="page-header"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {Icon && (
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: accentGlow,
            border: `1px solid ${accentColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accentColor,
            boxShadow: `0 4px 16px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
            flexShrink: 0,
          }}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
        <div>
          <h1 className="page-title" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
          {subtitle && (
            <p className="page-subtitle" style={{ marginTop: 2 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </motion.div>
  );
}
