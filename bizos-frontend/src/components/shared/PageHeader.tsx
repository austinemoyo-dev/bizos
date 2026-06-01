'use client';

import { LucideIcon, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePathname } from 'next/navigation';

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
  accentGlow  = 'rgba(200,16,46,0.12)',
}: PageHeaderProps) {
  const user       = useAuthStore((s) => s.user);
  const pathname   = usePathname();
  const isPersonal = pathname.startsWith('/personal');
  const initial    = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const scopeAccent = isPersonal ? '#7C3AED' : '#800000';

  return (
    <>
      <style>{`
        .ph-desktop        { display: flex; }
        .ph-mobile         { display: none; }
        .ph-mobile-actions { display: none; }
        @media (max-width: 767px) {
          .ph-desktop        { display: none !important; }
          .ph-mobile         { display: flex !important; }
          .ph-mobile-actions { display: flex !important; }
        }
      `}</style>

      {/* ── Desktop header ─────────────────────────────────────────── */}
      <motion.div
        className="page-header ph-desktop"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="page-header-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
          {Icon && (
            <div style={{
              width: 44, height: 44, borderRadius: 16, background: accentGlow,
              border: `1px solid ${accentColor}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accentColor,
              boxShadow: `0 4px 20px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
              flexShrink: 0, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}>
              <Icon size={20} strokeWidth={2.2} />
            </div>
          )}
          <div>
            <h1 className="page-title" style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}>{title}</h1>
            {subtitle && <p className="page-subtitle" style={{ marginTop: 3, lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="page-header-actions" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </motion.div>

      {/* ── Mobile header ──────────────────────────────────────────── */}
      <motion.div
        className="ph-mobile"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          alignItems: 'center', justifyContent: 'space-between', gap: 10,
          marginBottom: actions ? 10 : 'var(--space-5)',
          ...(isPersonal ? {
            background: 'linear-gradient(160deg, #1a1b6e 0%, #2e3fa0 55%, #1e2878 100%)',
            borderRadius: 20,
            padding: '16px 16px',
            marginBottom: actions ? 10 : 16,
          } : {}),
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: 'clamp(1.2rem, 5vw, 1.5rem)',
            fontWeight: 800,
            color: isPersonal ? '#fff' : 'var(--text-primary)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '0.65rem', color: isPersonal ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button style={{
            width: 38, height: 38, borderRadius: 19,
            background: isPersonal ? 'rgba(255,255,255,0.12)' : 'var(--bg-elevated)',
            border: isPersonal ? 'none' : '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Bell size={16} style={{ color: isPersonal ? '#fff' : 'var(--text-secondary)' }} />
          </button>
          <div style={{
            width: 38, height: 38, borderRadius: 19, flexShrink: 0,
            background: `linear-gradient(135deg, ${scopeAccent}, ${isPersonal ? '#5B21B6' : '#7B0018'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 800, color: '#fff',
          }}>
            {initial}
          </div>
        </div>
      </motion.div>

      {/* Mobile actions row */}
      {actions && (
        <div
          className="ph-mobile-actions"
          style={{ gap: 8, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}
        >
          {actions}
        </div>
      )}
    </>
  );
}
