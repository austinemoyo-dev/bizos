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
  profit:     { topBar: 'linear-gradient(90deg,#10B981,#059669)', glow: 'rgba(16,185,129,0.1)',  text: '#10B981', shadow: 'rgba(16,185,129,0.18)', dot: '#10B981' },
  loss:       { topBar: 'linear-gradient(90deg,#EF4444,#DC2626)', glow: 'rgba(239,68,68,0.1)',   text: '#EF4444', shadow: 'rgba(239,68,68,0.18)',  dot: '#EF4444' },
  warning:    { topBar: 'linear-gradient(90deg,#F59E0B,#D97706)', glow: 'rgba(245,158,11,0.1)',  text: '#F59E0B', shadow: 'rgba(245,158,11,0.18)', dot: '#F59E0B' },
  neutral:    { topBar: 'linear-gradient(90deg,#C8102E,#9B0D22)', glow: 'rgba(200,16,46,0.1)',   text: '#C8102E', shadow: 'rgba(200,16,46,0.18)',  dot: '#C8102E' },
  investment: { topBar: 'linear-gradient(90deg,#D4A535,#A07820)', glow: 'rgba(212,165,53,0.1)',  text: '#D4A535', shadow: 'rgba(212,165,53,0.18)', dot: '#D4A535' },
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
      if (value >= 1_000)     return `₦${(value / 1_000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', minimumFractionDigits: 2,
    }).format(value);
  }
  return Math.round(value).toLocaleString();
}

function SkeletonPulse({ width, height }: { width: string; height: string }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 6 }} />;
}

export function StatWidget({
  label, value, numericValue, numericFormat = 'currency',
  change, changePositive, accent = 'neutral',
  icon, loading, sublabel, onClick,
}: StatWidgetProps) {
  const colors   = ACCENT_MAP[accent];
  const countVal = useCountUp(numericValue ?? 0, 950, !loading && numericValue != null);
  const displayValue = (numericValue != null && !loading)
    ? formatLive(countVal, numericFormat)
    : value;

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      whileHover={{ y: -3, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--card-radius)',
        padding: 'var(--space-5)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border-default)';
        el.style.boxShadow = `0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1), 0 0 0 1px ${colors.shadow}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border-subtle)';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)';
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: colors.topBar,
        borderRadius: 'var(--card-radius) var(--card-radius) 0 0',
      }} />

      {/* Subtle corner glow */}
      <div style={{
        position: 'absolute', top: -8, right: -8, width: 80, height: 80,
        background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 'var(--space-4)', marginTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: 2,
            background: colors.dot, flexShrink: 0,
            boxShadow: `0 0 6px ${colors.dot}80`,
          }} />
          <span style={{
            fontSize: 'var(--text-xs)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--text-muted)',
          }}>
            {label}
          </span>
        </div>

        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: colors.glow,
            border: `1px solid ${colors.shadow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.text, flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <SkeletonPulse width="68%" height="1.75rem" />
          <SkeletonPulse width="40%" height="0.75rem" />
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(1.2rem, 2.2vw, 1.75rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: sublabel || change ? 'var(--space-2)' : 0,
              wordBreak: 'break-all',
            }}
          >
            {displayValue}
          </motion.div>

          {sublabel && (
            <p style={{
              fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
              marginBottom: change ? 4 : 0, lineHeight: 1.4,
            }}>
              {sublabel}
            </p>
          )}

          {change && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: 0.12 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.65rem', fontWeight: 700,
                color: changePositive === true
                  ? '#10B981' : changePositive === false
                    ? '#EF4444' : 'var(--text-secondary)',
                background: changePositive === true
                  ? 'rgba(16,185,129,0.1)' : changePositive === false
                    ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
                padding: '2px 8px', borderRadius: 20,
                border: `1px solid ${changePositive === true
                  ? 'rgba(16,185,129,0.2)' : changePositive === false
                    ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)'}`,
              }}
            >
              {changePositive === true  && <TrendingUp size={10} />}
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
