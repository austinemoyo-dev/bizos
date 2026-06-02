'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths, getDaysInMonth, getDate } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api/analytics';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { lendingApi } from '@/lib/api/lending';
import { PageHeader } from '@/components/shared/PageHeader';
import { fadeUp } from '@/lib/motion-variants';
import {
  Wrench, TrendingUp, TrendingDown, Target, AlertTriangle,
  CheckCircle, Clock, Banknote, ArrowRight, Shield,
  BarChart2, Package, Zap, Activity, Award,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight,
  DollarSign, Users, Repeat,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

type Momentum = 'GROWING' | 'DECLINING' | 'STABLE' | 'VOLATILE';

interface TrendSeries {
  values: number[];
  latest: number;
  mom: number;
  avg4: number;
  direction: Momentum;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function n(v: number) {
  return `₦${Number(v ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
}

function pct(v: number, decimals = 1) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;
}

function buildTrend(values: (number | undefined)[]): TrendSeries {
  const vals = values.map((v) => v ?? 0);
  const latest   = vals[0] ?? 0;
  const previous = vals[1] ?? 0;
  const mom      = previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : 0;
  const avg4     = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  let gains = 0, drops = 0;
  for (let i = 0; i < vals.length - 1; i++) {
    if (vals[i] > vals[i + 1] * 1.02) gains++;
    else if (vals[i] < vals[i + 1] * 0.98) drops++;
  }
  const direction: Momentum =
    gains >= 2 ? 'GROWING' : drops >= 2 ? 'DECLINING' : Math.abs(mom) < 8 ? 'STABLE' : 'VOLATILE';
  return { values: vals, latest, mom, avg4, direction };
}

const MOMENTUM_COLORS: Record<Momentum, string> = {
  GROWING: '#10B981', DECLINING: '#EF4444', STABLE: '#60A5FA', VOLATILE: '#F59E0B',
};

// ── Shared styles ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 20,
  padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
  marginBottom: 'var(--space-5)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 var(--space-4)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function MomentumBadge({ direction }: { direction: Momentum }) {
  const color = MOMENTUM_COLORS[direction];
  const Icon  = direction === 'GROWING' ? ArrowUpRight : direction === 'DECLINING' ? ArrowDownRight : Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.5rem', fontWeight: 800, color, background: `${color}18`, padding: '1px 6px', borderRadius: 20 }}>
      <Icon size={9} />{direction}
    </span>
  );
}

function StatRow({ label, value, valueColor, sub }: { label: string; value: string; valueColor?: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{sub}</p>}
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: valueColor || 'var(--text-primary)', margin: 0 }}>{value}</p>
    </div>
  );
}

function ProgressBar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.06)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 14px', fontSize: 'var(--text-xs)' }}>
      <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.color, marginLeft: 'auto' }}>{n(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BusinessRecoveryPage() {
  const now          = new Date();
  const daysElapsed  = getDate(now);
  const daysInMonth  = getDaysInMonth(now);
  const daysLeft     = daysInMonth - daysElapsed;

  const periods = [0, 1, 2, 3].map((i) => {
    const d = subMonths(now, i);
    return {
      start: format(startOfMonth(d), 'yyyy-MM-dd'),
      end:   format(endOfMonth(d),   'yyyy-MM-dd'),
      label: format(d, 'MMM yy'),
    };
  });

  // ── Queries ──────────────────────────────────────────────────────
  const { data: recovery, isLoading } = useQuery({
    queryKey: ['business-recovery'],
    queryFn: () => cashFlowApi.getBusinessRecovery(),
    refetchInterval: 60_000,
  });

  const { data: biz0 } = useQuery({ queryKey: ['biz-sum', periods[0].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[0].start, period_end: periods[0].end }) });
  const { data: biz1 } = useQuery({ queryKey: ['biz-sum', periods[1].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[1].start, period_end: periods[1].end }) });
  const { data: biz2 } = useQuery({ queryKey: ['biz-sum', periods[2].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[2].start, period_end: periods[2].end }) });
  const { data: biz3 } = useQuery({ queryKey: ['biz-sum', periods[3].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[3].start, period_end: periods[3].end }) });

  const { data: expenses }    = useQuery({ queryKey: ['biz-exp', periods[0].start],  queryFn: () => analyticsApi.expenseBreakdown({ period_start: periods[0].start, period_end: periods[0].end }) });
  const { data: repairStats } = useQuery({ queryKey: ['repair-stats', periods[0].start], queryFn: () => analyticsApi.repairStats({ period_start: periods[0].start, period_end: periods[0].end }) });
  const { data: debtors }     = useQuery({ queryKey: ['biz-debtors'],                queryFn: () => analyticsApi.debtors() });
  const { data: netWorth }    = useQuery({ queryKey: ['net-worth'],                  queryFn: () => cashFlowApi.getNetWorth() });
  const { data: forecast }    = useQuery({ queryKey: ['liquidity-forecast', 'biz'], queryFn: () => cashFlowApi.getForecast('business', 30) });
  const { data: cashPos }     = useQuery({ queryKey: ['cash-pos-biz'],              queryFn: () => cashFlowApi.getPosition('business') });

  // ── Core values ──────────────────────────────────────────────────
  const isLoss        = recovery?.profit_status === 'loss';
  const revMtd        = recovery?.revenue_mtd ?? 0;
  const expMtd        = recovery?.expenses_mtd ?? 0;
  const profitMtd     = recovery?.profit_mtd ?? 0;
  const avgJobRev     = recovery?.avg_job_revenue ?? 0;
  const recentJobs    = recovery?.recent_job_count ?? 0;
  const pendingJobs   = recovery?.pending_jobs ?? 0;
  const bizDebt       = recovery?.business_debt_outstanding ?? 0;
  const inventoryVal  = netWorth?.inventory_value ?? biz0?.inventory_value ?? 0;
  const businessCash  = netWorth?.business_cash ?? cashPos?.current_balance ?? 0;
  const lowStock      = biz0?.low_stock_count ?? 0;
  const repairCount   = biz0?.repair_count ?? 0;
  const saleCount     = biz0?.sale_count ?? 0;
  const titheDue      = biz0?.tithe_due ?? 0;
  const tithePaid     = biz0?.tithe_paid ?? 0;
  const titheExpected = profitMtd > 0 ? profitMtd * 0.1 : 0;

  // ── Revenue velocity ─────────────────────────────────────────────
  const dailyRevRate    = daysElapsed > 0 ? revMtd / daysElapsed : 0;
  const dailyExpRate    = daysElapsed > 0 ? expMtd / daysElapsed : 0;
  const projectedRev    = dailyRevRate * daysInMonth;
  const projectedExp    = dailyExpRate * daysInMonth;
  const projectedProfit = projectedRev - projectedExp;
  const targetRev       = recovery?.target_revenue ?? projectedRev * 1.2;
  const targetGap       = Math.max(0, targetRev - revMtd);
  const targetPct       = targetRev > 0 ? (revMtd / targetRev) * 100 : 0;
  const breakEvenGap    = isLoss ? Math.abs(profitMtd) : 0;
  const daysToBreakEven = dailyRevRate > dailyExpRate && isLoss
    ? Math.ceil(breakEvenGap / (dailyRevRate - dailyExpRate)) : null;
  const profitMargin    = revMtd > 0 ? (profitMtd / revMtd) * 100 : 0;
  const cashRunwayDays  = dailyExpRate > 0 ? Math.floor(businessCash / dailyExpRate) : null;

  // ── Trend series ─────────────────────────────────────────────────
  const revTrend    = buildTrend([biz0?.total_revenue, biz1?.total_revenue, biz2?.total_revenue, biz3?.total_revenue]);
  const expTrend    = buildTrend([biz0?.total_expenses, biz1?.total_expenses, biz2?.total_expenses, biz3?.total_expenses]);
  const profitTrend = buildTrend([biz0?.net_profit, biz1?.net_profit, biz2?.net_profit, biz3?.net_profit]);
  const jobRevTrend = buildTrend([
    recentJobs > 0 ? avgJobRev : undefined,
    biz1 ? (biz1.total_revenue / Math.max(1, biz1.repair_count + biz1.sale_count)) : undefined,
    biz2 ? (biz2.total_revenue / Math.max(1, biz2.repair_count + biz2.sale_count)) : undefined,
    biz3 ? (biz3.total_revenue / Math.max(1, biz3.repair_count + biz3.sale_count)) : undefined,
  ]);

  // ── 4-Month chart data (oldest first for left→right) ─────────────
  const trendChartData = [biz3, biz2, biz1, biz0].map((b, i) => ({
    month:    periods[3 - i].label,
    revenue:  b?.total_revenue  ?? 0,
    expenses: b?.total_expenses ?? 0,
    profit:   b?.net_profit     ?? 0,
  }));

  // ── Expense breakdown chart data ─────────────────────────────────
  const expChartData = (expenses ?? [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((e) => ({ category: e.category.replace(/_/g, ' '), amount: e.amount }));

  // ── Repair stats chart data ───────────────────────────────────────
  const repairChartData = (repairStats ?? [])
    .sort((a, b) => b.job_count - a.job_count)
    .slice(0, 5)
    .map((r) => ({ device: r.device_type, jobs: r.job_count, revenue: r.total_revenue }));

  // ── Business Health Score (0-100) ─────────────────────────────────
  const scoreProfit = isLoss ? 0 : profitMargin > 20 ? 30 : profitMargin > 10 ? 20 : 10;
  const scoreGrowth = revTrend.direction === 'GROWING' ? 20 : revTrend.direction === 'STABLE' ? 12 : revTrend.direction === 'VOLATILE' ? 6 : 0;
  const cashMonths  = dailyExpRate > 0 ? businessCash / (dailyExpRate * 30) : 0;
  const scoreCash   = cashMonths >= 3 ? 20 : cashMonths >= 2 ? 14 : cashMonths >= 1 ? 7 : 0;
  const scoreDebt   = bizDebt === 0 ? 15 : bizDebt < revMtd ? 10 : bizDebt < revMtd * 3 ? 5 : 0;
  const scoreInv    = lowStock === 0 ? 15 : lowStock <= 3 ? 8 : 0;
  const healthScore = scoreProfit + scoreGrowth + scoreCash + scoreDebt + scoreInv;
  const healthColor = healthScore >= 70 ? '#10B981' : healthScore >= 45 ? '#F59E0B' : '#EF4444';
  const healthLabel = healthScore >= 70 ? 'Healthy' : healthScore >= 45 ? 'At Risk' : 'Critical';

  // ── Debtors summary ───────────────────────────────────────────────
  const totalDebtorBalance = (debtors ?? []).reduce((s, d) => s + d.balance, 0);
  const topDebtors         = (debtors ?? []).sort((a, b) => b.balance - a.balance).slice(0, 4);

  // ── Profitable months in last 3 ───────────────────────────────────
  const profitableMonths = [biz0, biz1, biz2].filter((b) => (b?.net_profit ?? 0) > 0).length;

  // ── Color helpers ─────────────────────────────────────────────────
  const profitColor = isLoss ? '#EF4444' : '#10B981';

  // ── Chart colors ──────────────────────────────────────────────────
  const EXPENSE_COLORS = ['#8B0018', '#EF4444', '#F59E0B', '#A78BFA', '#60A5FA', '#34D399'];

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Business Recovery" subtitle="Loading financial data…" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 18 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Business Recovery"
        subtitle="Revenue velocity · 4-month trends · Break-even · Job analytics · Cash runway"
      />

      {/* ══ HEALTH SCORE + STATUS BANNER ═════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
        background: isLoss
          ? 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.04))'
          : 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.04))',
        border: `1px solid ${isLoss ? 'rgba(239,68,68,0.22)' : 'rgba(16,185,129,0.22)'}`,
        borderLeft: `4px solid ${profitColor}`,
        borderRadius: 20, padding: 'var(--space-5)',
        marginBottom: 'var(--space-5)',
        display: 'flex', alignItems: 'center', gap: 20,
        flexWrap: 'wrap' as const,
      }}>
        {/* Health ring */}
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={36} cy={36} r={28} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <circle cx={36} cy={36} r={28} fill="none" stroke={healthColor}
              strokeWidth={6} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - healthScore / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color: healthColor, margin: 0, lineHeight: 1 }}>{healthScore}</p>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' as const }}>
            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {recovery?.summary ?? 'Business Overview'}
            </p>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: healthColor, background: `${healthColor}18`, padding: '2px 10px', borderRadius: 20 }}>
              {healthLabel}
            </span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '0 0 10px' }}>
            Period: {recovery?.period.start} → {recovery?.period.end} · Profitable {profitableMonths}/3 recent months
          </p>
          {/* Score breakdown */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {[
              { label: 'Profitability', score: scoreProfit, max: 30 },
              { label: 'Growth',        score: scoreGrowth, max: 20 },
              { label: 'Cash',          score: scoreCash,   max: 20 },
              { label: 'Debt',          score: scoreDebt,   max: 15 },
              { label: 'Inventory',     score: scoreInv,    max: 15 },
            ].map(({ label, score, max }) => {
              const c = score >= max * 0.7 ? '#10B981' : score >= max * 0.4 ? '#F59E0B' : '#EF4444';
              return (
                <div key={label} style={{ textAlign: 'center', minWidth: 44 }}>
                  <p style={{ fontSize: '0.46rem', color: 'var(--text-muted)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 800, color: c, margin: 0 }}>{score}/{max}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-2)', minWidth: 220 }}>
          {[
            { label: 'Revenue MTD', value: n(revMtd), color: '#10B981' },
            { label: 'Expenses MTD', value: n(expMtd), color: '#EF4444' },
            { label: isLoss ? 'Loss MTD' : 'Profit MTD', value: n(Math.abs(profitMtd)), color: profitColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '8px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <p style={{ fontSize: '0.48rem', color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══ P&L COMMAND CENTER ══════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        {[
          {
            label: 'Revenue MTD', value: n(revMtd),
            sub: `${n(dailyRevRate)}/day · ${recentJobs + repairCount + saleCount} transactions`,
            color: '#10B981', Icon: TrendingUp as React.ElementType,
            trend: revTrend.direction,
          },
          {
            label: 'Expenses MTD', value: n(expMtd),
            sub: `${n(dailyExpRate)}/day · ${expTrend.direction.toLowerCase()}`,
            color: '#EF4444', Icon: TrendingDown as React.ElementType,
            trend: expTrend.direction,
          },
          {
            label: isLoss ? 'Net Loss MTD' : 'Net Profit MTD',
            value: `${isLoss ? '−' : '+'}${n(Math.abs(profitMtd))}`,
            sub: `${profitMargin.toFixed(1)}% margin · trend ${profitTrend.direction.toLowerCase()}`,
            color: profitColor, Icon: (isLoss ? TrendingDown : TrendingUp) as React.ElementType,
            trend: profitTrend.direction,
          },
          {
            label: 'Avg Job Revenue', value: n(avgJobRev),
            sub: `${recentJobs} recent jobs · ${pendingJobs} pending`,
            color: '#A78BFA', Icon: Wrench as React.ElementType,
            trend: jobRevTrend.direction,
          },
        ].map(({ label, value, sub, color, Icon, trend }) => (
          <div key={label} style={{ padding: 'var(--space-4)', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MomentumBadge direction={trend} />
                <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={12} style={{ color }} />
                </div>
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color, lineHeight: 1, margin: '0 0 4px' }}>{value}</p>
            <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* ══ REVENUE VELOCITY ════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Zap size={14} style={{ color: '#F59E0B' }} />
          <p style={sectionLabel}>Revenue Velocity</p>
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 20 }}>
            Day {daysElapsed} of {daysInMonth} · {daysLeft} days left
          </span>
        </div>

        {/* Projected month-end vs target */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>
              Target progress — {n(revMtd)} of {n(targetRev)}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 800, color: targetPct >= 100 ? '#10B981' : targetPct >= 70 ? '#F59E0B' : '#EF4444', margin: 0 }}>
              {targetPct.toFixed(0)}%
            </p>
          </div>
          <ProgressBar value={revMtd} max={targetRev} color={targetPct >= 100 ? '#10B981' : targetPct >= 70 ? '#F59E0B' : '#EF4444'} height={8} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>₦0</span>
            <span style={{ fontSize: '0.55rem', color: '#60A5FA' }}>
              Current pace → {n(projectedRev)} by month end
            </span>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{n(targetRev)} target</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)' }}>
          {[
            { label: 'Daily Revenue Run Rate', value: n(dailyRevRate), color: '#10B981', sub: `${n(dailyRevRate * 7)}/week at current pace` },
            { label: 'Projected Month-End Rev', value: n(projectedRev), color: projectedRev >= targetRev ? '#10B981' : '#F59E0B', sub: `vs ${n(targetRev)} target` },
            { label: 'Projected Month-End Profit', value: `${projectedProfit >= 0 ? '+' : '−'}${n(Math.abs(projectedProfit))}`, color: projectedProfit >= 0 ? '#10B981' : '#EF4444', sub: `${(projectedRev > 0 ? projectedProfit / projectedRev * 100 : 0).toFixed(1)}% projected margin` },
            {
              label: daysToBreakEven !== null ? 'Days to Break-Even' : 'Revenue Still Needed',
              value: daysToBreakEven !== null
                ? `${daysToBreakEven} days`
                : isLoss ? n(breakEvenGap) : 'PROFITABLE',
              color: !isLoss ? '#10B981' : daysToBreakEven !== null && daysToBreakEven <= daysLeft ? '#F59E0B' : '#EF4444',
              sub: daysToBreakEven !== null
                ? daysToBreakEven <= daysLeft ? `${daysLeft - daysToBreakEven} days spare this month` : 'May not break even this month'
                : isLoss ? 'to cover current losses' : 'Above break-even',
            },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color, margin: '0 0 3px' }}>{value}</p>
              <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══ 4-MONTH REVENUE TREND ════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap' as const, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={14} style={{ color: '#60A5FA' }} />
            <p style={sectionLabel}>4-Month Performance Trend</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[{ label: 'Revenue', color: '#8B0018' }, { label: 'Expenses', color: '#EF4444' }, { label: 'Profit', color: '#10B981' }].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 3, borderRadius: 2, background: color }} />
                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trendChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {[
                { id: 'revGrad',  color: '#8B0018' },
                { id: 'expGrad',  color: '#EF4444' },
                { id: 'profGrad', color: '#10B981' },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} width={46} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenue"  stroke="#8B0018" strokeWidth={2} fill="url(#revGrad)"  name="revenue"  />
            <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#expGrad)"  name="expenses" />
            <Area type="monotone" dataKey="profit"   stroke="#10B981" strokeWidth={2} fill="url(#profGrad)" name="profit"   />
          </AreaChart>
        </ResponsiveContainer>

        {/* MoM summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { label: 'Revenue MoM', trend: revTrend,    color: '#8B0018' },
            { label: 'Expenses MoM', trend: expTrend,   color: '#EF4444' },
            { label: 'Profit MoM',  trend: profitTrend, color: '#10B981' },
          ].map(({ label, trend, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.52rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 800, color: trend.mom >= 0 ? '#10B981' : '#EF4444', margin: '0 0 3px' }}>{pct(trend.mom)}</p>
              <MomentumBadge direction={trend.direction} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══ BREAK-EVEN & JOB TARGETS ════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Target size={14} style={{ color: '#F59E0B' }} />
          <p style={sectionLabel}>Break-Even & Job Targets</p>
        </div>

        {/* Break-even progress */}
        {isLoss && (
          <div style={{ padding: 'var(--space-4)', background: 'rgba(239,68,68,0.07)', borderRadius: 14, border: '1px solid rgba(239,68,68,0.15)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#EF4444', margin: 0 }}>Loss Recovery Progress</p>
              <p style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#EF4444', margin: 0 }}>−{n(Math.abs(profitMtd))}</p>
            </div>
            <ProgressBar value={revMtd} max={expMtd} color="#EF4444" height={6} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>Revenue covers {expMtd > 0 ? (revMtd / expMtd * 100).toFixed(0) : 0}% of expenses</span>
              <span style={{ fontSize: '0.52rem', color: '#F59E0B', fontWeight: 700 }}>Need {n(breakEvenGap)} more to break even</span>
            </div>
          </div>
        )}

        {!isLoss && (
          <div style={{ padding: 'var(--space-4)', background: 'rgba(16,185,129,0.07)', borderRadius: 14, border: '1px solid rgba(16,185,129,0.15)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#10B981', margin: 0 }}>Profitability Status</p>
              <p style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10B981', margin: 0 }}>+{n(profitMtd)}</p>
            </div>
            <ProgressBar value={profitMtd} max={revMtd} color="#10B981" height={6} />
            <p style={{ fontSize: '0.52rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {profitMargin.toFixed(1)}% net margin · {n(profitMtd * 0.1)} tithe due on this profit
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            recovery?.jobs_to_break_even != null && {
              label: 'Jobs to Break Even',
              count: recovery.jobs_to_break_even,
              sub: `At ${n(avgJobRev)}/job avg revenue`,
              color: '#F59E0B',
              Icon: Target as React.ElementType,
            },
            recovery?.jobs_to_hit_target != null && recovery?.target_revenue != null && {
              label: 'Jobs to Hit Monthly Target',
              count: recovery.jobs_to_hit_target,
              sub: `Target: ${n(recovery.target_revenue)} (${n(targetGap)} remaining)`,
              color: '#60A5FA',
              Icon: Award as React.ElementType,
            },
            bizDebt > 0 && recovery?.jobs_to_clear_business_debt != null && {
              label: 'Jobs to Clear Business Debt',
              count: recovery.jobs_to_clear_business_debt,
              sub: `Outstanding debt: ${n(bizDebt)}`,
              color: '#EF4444',
              Icon: Banknote as React.ElementType,
            },
            {
              label: 'Pending Jobs (In Queue)',
              count: pendingJobs,
              sub: `Potential revenue: ${n(pendingJobs * avgJobRev)} if completed`,
              color: '#A78BFA',
              Icon: Clock as React.ElementType,
            },
          ].filter(Boolean).map((item) => {
            if (!item) return null;
            const { label, count, sub, color, Icon } = item as { label: string; count: number; sub: string; color: string; Icon: React.ElementType };
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{count}</p>
                  <p style={{ fontSize: '0.5rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>jobs</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ══ JOB ANALYTICS ════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Wrench size={14} style={{ color: '#8B0018' }} />
          <p style={sectionLabel}>Job Analytics</p>
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 20 }}>
            {periods[0].label}
          </span>
        </div>

        {/* Job volume summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {[
            { label: 'Repairs', value: repairCount, color: '#8B0018', Icon: Wrench as React.ElementType },
            { label: 'Sales', value: saleCount, color: '#D4A535', Icon: DollarSign as React.ElementType },
            { label: 'Pending', value: pendingJobs, color: '#A78BFA', Icon: Clock as React.ElementType },
            { label: 'Avg Revenue', value: n(avgJobRev), color: '#10B981', Icon: TrendingUp as React.ElementType },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                <Icon size={12} style={{ color }} />
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color, margin: '0 0 2px' }}>{value}</p>
              <p style={{ fontSize: '0.52rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Avg job revenue trend */}
        <div style={{ padding: 'var(--space-3)', background: 'rgba(139,0,24,0.07)', borderRadius: 12, border: '1px solid rgba(139,0,24,0.15)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', margin: 0 }}>Avg Job Revenue — 4-month trend</p>
            <MomentumBadge direction={jobRevTrend.direction} />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 32 }}>
            {[biz3, biz2, biz1, biz0].map((b, i) => {
              const total = b?.total_revenue ?? 0;
              const jobs  = Math.max(1, (b?.repair_count ?? 0) + (b?.sale_count ?? 0));
              const avg   = total / jobs;
              const maxAvg = Math.max(...[biz0, biz1, biz2, biz3].map(bx => {
                const t = bx?.total_revenue ?? 0;
                const j = Math.max(1, (bx?.repair_count ?? 0) + (bx?.sale_count ?? 0));
                return t / j;
              }), 1);
              const h = Math.max(4, (avg / maxAvg) * 32);
              const isLatest = i === 3;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', height: h, background: isLatest ? '#8B0018' : 'rgba(139,0,24,0.35)', borderRadius: 3 }} />
                  <p style={{ fontSize: '0.42rem', color: 'var(--text-muted)', margin: 0 }}>{periods[3 - i].label}</p>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.55rem', color: '#8B0018', fontWeight: 700, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            4-mo avg: {n(jobRevTrend.avg4)}/job · Current: {n(avgJobRev)}/job ({pct(jobRevTrend.mom)} MoM)
          </p>
        </div>

        {/* Device type breakdown */}
        {repairChartData.length > 0 && (
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 var(--space-3)' }}>
              Jobs by Device Type
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {repairChartData.map(({ device, jobs, revenue }, i) => {
                const maxJobs = repairChartData[0].jobs;
                return (
                  <div key={device} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', width: 90, flexShrink: 0, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, textTransform: 'capitalize' }}>
                      {device.replace(/_/g, ' ')}
                    </p>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(jobs / maxJobs) * 100}%`, background: EXPENSE_COLORS[i % EXPENSE_COLORS.length], borderRadius: 3 }} />
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length], width: 28, textAlign: 'right', flexShrink: 0, margin: 0 }}>{jobs}</p>
                    <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', width: 80, textAlign: 'right', flexShrink: 0, margin: 0, fontFamily: 'var(--font-mono)' }}>{n(revenue)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ══ EXPENSE BREAKDOWN ════════════════════════════════════════ */}
      {expChartData.length > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <TrendingDown size={14} style={{ color: '#EF4444' }} />
            <p style={sectionLabel}>Expense Breakdown</p>
            <span style={{ fontSize: '0.52rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>
              {n(expMtd)} MTD
            </span>
          </div>

          <ResponsiveContainer width="100%" height={expChartData.length * 34 + 20}>
            <BarChart data={expChartData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                formatter={(value: number) => [n(value), 'Amount']}
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 11 }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => n(v), fill: 'var(--text-muted)', fontSize: 9 }}>
                {expChartData.map((_, i) => (
                  <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Top expense insight */}
          {expChartData[0] && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(239,68,68,0.06)', borderRadius: 10 }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                <span style={{ fontWeight: 700, color: '#EF4444' }}>{expChartData[0].category}</span>{' '}
                is your largest expense at{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#EF4444' }}>{n(expChartData[0].amount)}</span>
                {' '}({expMtd > 0 ? ((expChartData[0].amount / expMtd) * 100).toFixed(0) : 0}% of total expenses)
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ══ TITHE TRACKER ════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Award size={14} style={{ color: '#D4A535' }} />
          <p style={sectionLabel}>Tithe Tracker</p>
          {titheDue > 0 && (
            <span style={{ fontSize: '0.52rem', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>
              {n(titheDue)} outstanding
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {[
            { label: '10% of This Month Profit', value: n(titheExpected), color: '#D4A535', sub: `Due on ${n(Math.max(0, profitMtd))} profit` },
            { label: 'Tithe Paid This Period',   value: n(tithePaid),     color: '#10B981', sub: 'Cleared from obligations' },
            { label: 'All Outstanding Tithe',    value: n(titheDue),      color: titheDue > 0 ? '#EF4444' : '#10B981', sub: titheDue > 0 ? 'Unpaid across all time' : 'All clear' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <p style={{ fontSize: '0.52rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color, margin: '0 0 3px' }}>{value}</p>
              <p style={{ fontSize: '0.52rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>

        {tithePaid + titheExpected > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: 0 }}>Tithe paid this period</p>
              <p style={{ fontSize: '0.56rem', fontFamily: 'var(--font-mono)', color: '#D4A535', fontWeight: 700, margin: 0 }}>
                {titheExpected > 0 ? ((tithePaid / titheExpected) * 100).toFixed(0) : 100}%
              </p>
            </div>
            <ProgressBar value={tithePaid} max={titheExpected || tithePaid} color="#D4A535" height={6} />
          </div>
        )}

        {titheDue > 0 && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(245,158,11,0.07)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: '#F59E0B', fontWeight: 700, margin: 0 }}>
              Clear {n(titheDue)} outstanding tithe —{' '}
              {avgJobRev > 0 ? Math.ceil(titheDue / (avgJobRev * 0.1)) : '?'} completed jobs would generate enough at 10% reserve
            </p>
          </div>
        )}
      </motion.div>

      {/* ══ CASH & ASSETS ════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} style={{ color: '#60A5FA' }} />
            <p style={sectionLabel}>Cash & Business Assets</p>
          </div>
          <Link href="/overview/net-worth" style={{ fontSize: '0.6rem', color: '#60A5FA', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            Combined net worth <ArrowRight size={10} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {[
            {
              label: 'Business Cash', value: n(businessCash),
              sub: cashRunwayDays != null ? `${cashRunwayDays} days runway at current burn` : 'Cash on hand',
              color: '#10B981',
            },
            {
              label: 'Inventory (at cost)', value: n(inventoryVal),
              sub: lowStock > 0 ? `${lowStock} items low stock` : 'Stock levels OK',
              color: lowStock > 0 ? '#F59E0B' : '#60A5FA',
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14 }}>
              <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color, margin: '0 0 3px' }}>{value}</p>
              <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Cash runway indicator */}
        {cashRunwayDays != null && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', margin: 0 }}>Cash runway vs 90-day target</p>
              <p style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                color: cashRunwayDays >= 90 ? '#10B981' : cashRunwayDays >= 30 ? '#F59E0B' : '#EF4444', margin: 0 }}>
                {cashRunwayDays} / 90 days
              </p>
            </div>
            <ProgressBar value={cashRunwayDays} max={90} color={cashRunwayDays >= 90 ? '#10B981' : cashRunwayDays >= 30 ? '#F59E0B' : '#EF4444'} height={6} />
          </div>
        )}

        {/* Asset total */}
        <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Total Business Assets</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color: '#10B981', margin: 0 }}>
            {n(businessCash + inventoryVal)}
          </p>
        </div>

        {bizDebt > 0 && (
          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#EF4444', margin: '0 0 2px' }}>Business Debt Outstanding</p>
              <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: 0 }}>
                {recovery?.jobs_to_clear_business_debt != null ? `${recovery.jobs_to_clear_business_debt} jobs at ${n(avgJobRev)} avg to clear` : 'Debt load active'}
              </p>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color: '#EF4444', margin: 0 }}>
              −{n(bizDebt)}
            </p>
          </div>
        )}

        <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', margin: 'var(--space-3) 0 0', lineHeight: 1.5 }}>
          Personal accounts excluded. <Link href="/overview/net-worth" style={{ color: '#60A5FA', textDecoration: 'none' }}>Combined net worth →</Link>
        </p>
      </motion.div>

      {/* ══ DEBTORS / OUTSTANDING BALANCES ════════════════════════════ */}
      {totalDebtorBalance > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={14} style={{ color: '#F59E0B' }} />
              <p style={sectionLabel}>Outstanding Balances (Debtors)</p>
            </div>
            <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '2px 10px', borderRadius: 20 }}>
              {n(totalDebtorBalance)} owed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {topDebtors.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Banknote size={13} style={{ color: '#F59E0B' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.customer_name}</p>
                  <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: 0 }}>
                    {d.type} · {d.reference} · {d.date}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 800, color: '#F59E0B', margin: '0 0 1px' }}>{n(d.balance)}</p>
                  <p style={{ fontSize: '0.5rem', color: 'var(--text-muted)', margin: 0 }}>of {n(d.total_amount)}</p>
                </div>
              </div>
            ))}
          </div>

          {(debtors?.length ?? 0) > 4 && (
            <Link href="/business/loans" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: '#F59E0B', textDecoration: 'none', fontWeight: 700 }}>
              View all {debtors?.length} debtors ({n(totalDebtorBalance)} total) <ChevronRight size={12} />
            </Link>
          )}
        </motion.div>
      )}

      {/* ══ 30-DAY LIQUIDITY FORECAST ════════════════════════════════ */}
      {forecast && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <Activity size={14} style={{ color: '#34D399' }} />
            <p style={sectionLabel}>30-Day Liquidity Forecast</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Expected Inflows', value: n(forecast.expected_inflows), color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
              { label: 'Expected Outflows', value: n(forecast.expected_outflows), color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
              { label: 'Projected Balance', value: n(forecast.projected_balance), color: forecast.projected_balance >= 0 ? '#10B981' : '#EF4444', bg: 'var(--bg-elevated)' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: bg, borderRadius: 12 }}>
                <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: '0 0 5px' }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color, margin: 0, fontSize: 'var(--text-xs)' }}>{value}</p>
              </div>
            ))}
          </div>

          {forecast.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {forecast.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: item.direction === 'in' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.direction === 'in'
                      ? <TrendingUp  size={11} style={{ color: '#10B981' }} />
                      : <TrendingDown size={11} style={{ color: '#EF4444' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, margin: 0 }}>{item.description}</p>
                    <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: '1px 0 0' }}>{item.date}</p>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: item.direction === 'in' ? '#10B981' : '#EF4444', flexShrink: 0, margin: 0 }}>
                    {item.direction === 'in' ? '+' : '−'}{n(item.expected_amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ══ QUICK LINKS ══════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)' }}>
        {[
          { label: 'View All Repairs', href: '/business/repairs', color: '#8B0018', Icon: Wrench as React.ElementType },
          { label: 'Lending Ledger',   href: '/business/loans',   color: '#10B981', Icon: Banknote as React.ElementType },
          { label: 'Inventory',        href: '/business/inventory', color: '#60A5FA', Icon: Package as React.ElementType },
          { label: 'AI Advisor',       href: '/overview/advisor',   color: '#A78BFA', Icon: Repeat as React.ElementType },
        ].map(({ label, href, color, Icon }) => (
          <Link key={label} href={href} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 'var(--space-3)', borderRadius: 14,
            background: `${color}10`, border: `1px solid ${color}22`,
            color, fontSize: 'var(--text-xs)', fontWeight: 700, textDecoration: 'none',
          }}>
            <Icon size={13} /> {label} <ArrowRight size={11} />
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
