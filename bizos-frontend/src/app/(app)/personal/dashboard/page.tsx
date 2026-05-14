'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { foodVendorApi } from '@/lib/api/food-vendor';
import { titheApi } from '@/lib/api/tithe';
import { StatWidget } from '@/components/shared/StatWidget';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatNaira, formatProfit } from '@/lib/format';
import { stagger } from '@/lib/motion-variants';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from 'date-fns';
import { useState } from 'react';
import { Wallet } from 'lucide-react';

type Period = 'week' | 'month' | 'last_month' | 'year';

function getPeriodDates(period: Period) {
  const now = new Date();
  if (period === 'week') return { start: format(startOfWeek(now), 'yyyy-MM-dd'), end: format(endOfWeek(now), 'yyyy-MM-dd') };
  if (period === 'year') return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
  if (period === 'last_month') {
    const lastMonth = subMonths(now, 1);
    return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
  }
  return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'year', label: 'Year' },
];

export default function PersonalDashboard() {
  const [period, setPeriod] = useState<Period>('month');
  const { start, end } = getPeriodDates(period);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['personal-summary', start, end],
    queryFn: () => analyticsApi.personalSummary({ period_start: start, period_end: end }),
  });

  const { data: unpaidCredits } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn: () => foodVendorApi.credits.list({ paid: false }),
  });

  const { data: unpaidTithe } = useQuery({
    queryKey: ['tithe', 'personal', 'unpaid', start, end],
    queryFn: () => titheApi.list({ scope: 'personal', paid: false, date_from: start, date_to: end }),
  });

  const foodDebt = (unpaidCredits ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const titheDue = (unpaidTithe?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);
  const savingsInfo = summary ? formatProfit(summary.net_savings) : null;
  const netSavings = summary?.net_savings ?? 0;

  return (
    <div>
      <PageHeader title="Personal Finance" subtitle="Your financial overview" />

      {/* Period selector — glass pills */}
      <div style={{
        display: 'inline-flex', gap: 3, padding: 3, borderRadius: 50,
        background: 'var(--glass-bg-light)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        marginBottom: 'var(--space-5)',
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '7px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.02em',
              background: period === p.key ? 'var(--accent-gold)' : 'transparent',
              color: period === p.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: period === p.key ? '0 2px 8px rgba(212,165,53,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Hero net savings card */}
      <div className="liquid-card" style={{
        padding: 'var(--space-5)',
        marginBottom: 'var(--space-5)',
        background: netSavings >= 0
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))',
      }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 16,
            background: netSavings >= 0 ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wallet size={22} style={{ color: netSavings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {savingsInfo?.label ?? 'Net Savings'}
            </p>
            <h2 className="hero-amount" style={{
              fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'var(--font-mono)',
              color: netSavings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {summary ? savingsInfo!.formatted : '—'}
            </h2>
          </div>
        </div>
      </div>

      {/* Income / Expense stats */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}
        className="stat-grid"
      >
        <StatWidget label="Total Income" value={summary ? formatNaira(summary.total_income) : '—'} accent="profit" loading={isLoading} />
        <StatWidget label="Total Expenses" value={summary ? formatNaira(summary.total_expenses) : '—'} accent="loss" loading={isLoading} />
      </motion.div>

      {/* Obligations */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}
        className="stat-grid"
      >
        <StatWidget label="Food Debt" value={formatNaira(foodDebt)} accent="warning"
          sublabel="Outstanding food vendor credit" />
        <StatWidget label="Tithe Due" value={formatNaira(titheDue)} accent="warning" />
      </motion.div>
    </div>
  );
}

