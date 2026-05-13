'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion-variants';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatWidgetProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  accent?: 'profit' | 'loss' | 'warning' | 'neutral' | 'investment';
  icon?: React.ReactNode;
  loading?: boolean;
  sublabel?: string;
  onClick?: () => void;
}

const ACCENT_MAP = {
  profit:     { bar: 'linear-gradient(180deg,#10B981,#059669)', glow: 'rgba(16,185,129,0.1)',  text: '#10B981', shadow: 'rgba(16,185,129,0.2)' },
  loss:       { bar: 'linear-gradient(180deg,#EF4444,#DC2626)', glow: 'rgba(239,68,68,0.1)',   text: '#EF4444', shadow: 'rgba(239,68,68,0.2)' },
  warning:    { bar: 'linear-gradient(180deg,#F59E0B,#D97706)', glow: 'rgba(245,158,11,0.1)',  text: '#F59E0B', shadow: 'rgba(245,158,11,0.2)' },
  neutral:    { bar: 'linear-gradient(180deg,#C8102E,#9B0D22)', glow: 'rgba(200,16,46,0.1)',   text: '#C8102E', shadow: 'rgba(200,16,46,0.2)' },
  investment: { bar: 'linear-gradient(180deg,#D4A535,#A07820)', glow: 'rgba(212,165,53,0.1)',  text: '#D4A535', shadow: 'rgba(212,165,53,0.2)' },
};

function SkeletonPulse({ width, height }: { width: string; height: string }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 6 }} />;
}

export function StatWidget({ label, value, change, changePositive, accent = 'neutral', icon, loading, sublabel, onClick }: StatWidgetProps) {
  const colors = ACCENT_MAP[accent];

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      whileHover={{ y: -3, transition: { duration: 0.18, ease: [0.16,1,0.3,1] } }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      style={{
        background: 'var(--glass-bg-light)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--card-radius)',
        padding: 'var(--space-5)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.25s, box-shadow 0.3s',
        boxShadow: `var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border-shine)';
        (e.currentTarget as HTMLElement).style.boxShadow = `var(--glass-shadow-elevated), 0 0 0 1px ${colors.shadow}, inset 0 1px 0 rgba(255,255,255,0.08)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
        (e.currentTarget as HTMLElement).style.boxShadow = `var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.06)`;
      }}
    >
      {/* Gradient accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: colors.bar, borderRadius: '12px 0 0 12px',
        boxShadow: `2px 0 12px ${colors.shadow}`,
      }} />

      {/* Radial glow bg */}
      <div style={{
        position: 'absolute', top: -10, right: -10, width: 100, height: 100,
        background: `radial-gradient(circle at top right, ${colors.glow}, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Shine overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', position: 'relative' }}>
        <span style={{
          fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--text-muted)',
        }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: colors.glow,
            border: `1px solid ${colors.shadow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.text,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <SkeletonPulse width="65%" height="2rem" />
          <SkeletonPulse width="40%" height="0.75rem" />
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.16,1,0.3,1] }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(1.2rem, 2vw, 1.7rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: sublabel || change ? 'var(--space-2)' : 0,
              position: 'relative',
            }}
          >
            {value}
          </motion.div>

          {sublabel && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: change ? 4 : 0 }}>
              {sublabel}
            </p>
          )}

          {change && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.7rem', fontWeight: 600,
                color: changePositive === true ? '#10B981' : changePositive === false ? '#EF4444' : 'var(--text-secondary)',
                background: changePositive === true ? 'rgba(16,185,129,0.1)' : changePositive === false ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
                padding: '2px 7px', borderRadius: 20,
                border: `1px solid ${changePositive === true ? 'rgba(16,185,129,0.2)' : changePositive === false ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)'}`,
              }}
            >
              {changePositive === true && <TrendingUp size={10} />}
              {changePositive === false && <TrendingDown size={10} />}
              {changePositive === undefined && <Minus size={10} />}
              {change}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
