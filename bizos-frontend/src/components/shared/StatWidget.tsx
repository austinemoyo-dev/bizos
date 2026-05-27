'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion-variants';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatWidgetProps {
  label: string;
  value: string;
  numericValue?: number;
  numericFormat?: 'currency' | 'number' | 'compact';
  change?: string;
  changePositive?: boolean;
  accent?: 'profit' | 'loss' | 'warning' | 'neutral' | 'investment';
  icon?: React.ReactNode;
  loading?: boolean;
  sublabel?: string;
  onClick?: () => void;
}

const ACCENT_MAP = {
  profit:     { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.2)',  icon: '#22C55E', text: '#22C55E',  glow: 'rgba(34,197,94,0.18)'  },
  loss:       { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.22)',  icon: '#EF4444', text: '#EF4444',  glow: 'rgba(239,68,68,0.18)'  },
  warning:    { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.22)', icon: '#F59E0B', text: '#F59E0B',  glow: 'rgba(245,158,11,0.18)' },
  neutral:    { bg: 'rgba(139,0,24,0.12)',    border: 'rgba(139,0,24,0.22)',   icon: '#8B0018', text: '#8B0018',  glow: 'rgba(139,0,24,0.18)'   },
  investment: { bg: 'rgba(212,165,53,0.12)',  border: 'rgba(212,165,53,0.22)', icon: '#D4A535', text: '#D4A535',  glow: 'rgba(212,165,53,0.18)' },
};

function useCountUp(target: number, duration = 900, active = true) {
  const [display, setDisplay] = useState(0);
  const rafRef  = useRef<number>(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!active || isNaN(target)) { setDisplay(target); return; }
    const start    = performance.now();
    const from     = prevRef.current;
    const distance = target - from;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + distance * ease);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return display;
}

function formatLive(value: number, format: StatWidgetProps['numericFormat']): string {
  if (format === 'currency' || format === 'compact') {
    if (format === 'compact') {
      if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
      return new Intl.NumberFormat('en-NG', {
        style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', minimumFractionDigits: 2,
    }).format(value);
  }
  return Math.round(value).toLocaleString();
}

function SkeletonPulse({ width, height }: { width: string; height: string }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 8 }} />;
}

export function StatWidget({
  label, value, numericValue, numericFormat = 'currency',
  change, changePositive, accent = 'neutral',
  icon, loading, sublabel, onClick,
}: StatWidgetProps) {
  const colors     = ACCENT_MAP[accent];
  const countVal   = useCountUp(numericValue ?? 0, 950, !loading && numericValue != null);
  const displayValue = (numericValue != null && !loading)
    ? formatLive(countVal, numericFormat)
    : value;

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={onClick ? { scale: 0.97 } : {}}
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--card-radius)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = colors.border;
        el.style.boxShadow = `0 8px 28px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px ${colors.border}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border-subtle)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)';
      }}
    >
      {/* Subtle background glow from icon corner */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 90, height: 90,
        background: `radial-gradient(circle, ${colors.glow} 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Header: label + icon */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 14,
      }}>
        <span style={{
          fontSize: '0.65rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          lineHeight: 1.3,
        }}>
          {label}
        </span>

        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.icon,
            boxShadow: `0 4px 12px ${colors.glow}`,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonPulse width="72%" height="1.9rem" />
          <SkeletonPulse width="44%" height="0.75rem" />
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(1.25rem, 2.4vw, 1.85rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: sublabel || change ? 8 : 0,
              wordBreak: 'break-all',
            }}
          >
            {displayValue}
          </motion.div>

          {sublabel && (
            <p style={{
              fontSize: '0.65rem', color: 'var(--text-muted)',
              marginBottom: change ? 6 : 0, lineHeight: 1.4,
            }}>
              {sublabel}
            </p>
          )}

          {change && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: 0.14 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.62rem', fontWeight: 700,
                color: changePositive === true
                  ? 'var(--accent-green)'
                  : changePositive === false
                  ? 'var(--accent-red)'
                  : 'var(--text-secondary)',
                background: changePositive === true
                  ? 'rgba(34,197,94,0.1)'
                  : changePositive === false
                  ? 'rgba(239,68,68,0.1)'
                  : 'var(--bg-elevated)',
                padding: '3px 8px', borderRadius: 20,
                border: `1px solid ${changePositive === true
                  ? 'rgba(34,197,94,0.22)'
                  : changePositive === false
                  ? 'rgba(239,68,68,0.22)'
                  : 'var(--border-subtle)'}`,
              }}
            >
              {changePositive === true  && <TrendingUp  size={9} />}
              {changePositive === false && <TrendingDown size={9} />}
              {changePositive === undefined && <Minus    size={9} />}
              {change}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
