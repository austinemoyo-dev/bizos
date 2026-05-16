'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { foodVendorApi } from '@/lib/api/food-vendor';
import { titheApi } from '@/lib/api/tithe';
import { StatWidget } from '@/components/shared/StatWidget';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatNaira, formatProfit } from '@/lib/format';
import { stagger, scrollFadeUp } from '@/lib/motion-variants';
import { motion } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  startOfYear, endOfYear,
  subMonths,
} from 'date-fns';
import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

type Period = 'week' | 'month' | 'last_month' | 'year';

function getPeriodDates(period: Period) {
  const now = new Date();
  if (period === 'week')       return { start: format(startOfWeek(now),  'yyyy-MM-dd'), end: format(endOfWeek(now),  'yyyy-MM-dd') };
  if (period === 'year')       return { start: format(startOfYear(now),  'yyyy-MM-dd'), end: format(endOfYear(now),  'yyyy-MM-dd') };
  if (period === 'last_month') {
    const lm = subMonths(now, 1);
    return { start: format(startOfMonth(lm), 'yyyy-MM-dd'), end: format(endOfMonth(lm), 'yyyy-MM-dd') };
  }
  return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week',       label: 'Week'       },
  { key: 'month',      label: 'Month'      },
  { key: 'last_month', label: 'Last Month' },
  { key: 'year',       label: 'Year'       },
];

export default function PersonalDashboard() {
  const [period, setPeriod] = useState<Period>('month');
  const { start, end } = getPeriodDates(period);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['personal-summary', start, end],
    queryFn:  () => analyticsApi.personalSummary({ period_start: start, period_end: end }),
  });

  const { data: unpaidCredits } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn:  () => foodVendorApi.credits.list({ paid: false }),
  });

  const { data: unpaidTithe } = useQuery({
    queryKey: ['tithe', 'personal', 'unpaid', start, end],
    queryFn:  () => titheApi.list({ scope: 'personal', paid: false, date_from: start, date_to: end }),
  });

  const foodDebt   = (unpaidCredits ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const titheDue   = (unpaidTithe?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);
  const netSavings = summary?.net_savings ?? 0;
  const isPositive = netSavings >= 0;
  const savingsInfo = summary ? formatProfit(summary.net_savings) : null;

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <PageHeader title="Personal Finance" subtitle="Your financial overview" />

      {/* ── Period selector — full-width scrollable row ─────────── */}
      <div style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        paddingBottom: 4,
        marginBottom: 'var(--space-5)',
        width: '100%',
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              flexShrink: 0,
              padding: '8px 20px',
              borderRadius: 50,
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              background: period === p.key ? 'var(--accent-gold)' : 'var(--bg-elevated)',
              color:      period === p.key ? '#fff' : 'var(--text-secondary)',
              boxShadow:  period === p.key ? '0 2px 10px rgba(212,165,53,0.4)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Hero net savings card — full width ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          background: isPositive
            ? 'linear-gradient(135deg, rgba(5,150,105,0.15) 0%, rgba(16,185,129,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(239,68,68,0.08) 100%)',
          border: `1px solid ${isPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 'var(--card-radius)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-4)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 130, height: 130,
          borderRadius: '50%',
          background: isPositive
            ? 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 18, flexShrink: 0,
              background: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${isPositive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPositive
                ? <TrendingUp  size={22} style={{ color: 'var(--accent-green)' }} />
                : <TrendingDown size={22} style={{ color: 'var(--accent-red)'   }} />
              }
            </div>
            <div>
              <p style={{
                fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                marginBottom: 3,
              }}>
                {savingsInfo?.label ?? 'Net Savings'}
              </p>
              <div className="hero-amount" style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(1.6rem, 8vw, 2.2rem)',
                fontWeight: 800, lineHeight: 1,
                color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                letterSpacing: '-0.03em',
              }}>
                {summary ? savingsInfo!.formatted : (
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>—</span>
                )}
              </div>
            </div>
          </div>

          <Link href="/personal/analytics" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: isPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${isPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            fontSize: '0.65rem', fontWeight: 700,
            color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
            textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Analytics →
          </Link>
        </div>

        {/* Income / Expense sub-row */}
        {summary && (
          <div style={{
            display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-4)',
            borderTop: `1px solid ${isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
            position: 'relative', zIndex: 1,
          }}>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Income</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-green)' }}>
                {formatNaira(summary.total_income)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Expenses</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-red)' }}>
                {formatNaira(summary.total_expenses)}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Primary stat grid ───────────────────────────────────── */}
      <motion.div
        variants={stagger} initial="initial" animate="animate"
        className="stat-grid"
        style={{ marginBottom: 'var(--space-4)', width: '100%' }}
      >
        <StatWidget
          label="Total Income"
          value={summary ? formatNaira(summary.total_income) : '—'}
          numericValue={summary?.total_income}
          numericFormat="currency"
          accent="profit"
          loading={isLoading}
        />
        <StatWidget
          label="Total Expenses"
          value={summary ? formatNaira(summary.total_expenses) : '—'}
          numericValue={summary?.total_expenses}
          numericFormat="currency"
          accent="loss"
          loading={isLoading}
        />
      </motion.div>

      {/* ── Obligations ─────────────────────────────────────────── */}
      <motion.div
        variants={stagger} initial="initial" animate="animate"
        className="stat-grid"
        style={{ marginBottom: 'var(--space-5)', width: '100%' }}
      >
        <StatWidget
          label="Food Debt"
          value={formatNaira(foodDebt)}
          numericValue={foodDebt}
          numericFormat="currency"
          accent="warning"
          sublabel="Outstanding food vendor credit"
        />
        <StatWidget
          label="Tithe Due"
          value={formatNaira(titheDue)}
          numericValue={titheDue}
          numericFormat="currency"
          accent="warning"
        />
      </motion.div>

      {/* ── Quick links row ──────────────────────────────────────── */}
      <motion.div {...scrollFadeUp} style={{ width: '100%' }}>
        <div className="stat-grid" style={{ width: '100%' }}>
          {[
            { label: 'Transactions', href: '/personal/transactions', color: 'var(--accent-gold)' },
            { label: 'Food Vendor',  href: '/personal/food-vendor',  color: 'var(--accent-primary)' },
            { label: 'Savings',      href: '/personal/savings',      color: 'var(--accent-green)'   },
          ].map(({ label, href, color }) => (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              padding: 'var(--space-4) var(--space-2)',
              borderRadius: 16, textDecoration: 'none',
              background: 'var(--glass-bg-light)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              transition: 'all 0.18s',
              boxSizing: 'border-box',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: `${color}18`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wallet size={18} style={{ color }} />
              </div>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700,
                color: 'var(--text-secondary)',
                textAlign: 'center', lineHeight: 1.3,
                wordBreak: 'break-word',
              }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
