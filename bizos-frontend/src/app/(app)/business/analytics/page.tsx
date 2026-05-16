'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { analyticsApi, TopItemData, RepairStatData } from '@/lib/api/analytics';
import { ComparisonLineChart, ComparisonPoint } from '@/components/charts/ComparisonLineChart';
import { ProfitLossBar } from '@/components/charts/ProfitLossBar';
import { formatNaira, formatCompact } from '@/lib/format';
import { RevenueTrendPoint, ExpenseBreakdownItem } from '@/types/api';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, subDays, eachDayOfInterval, parseISO, differenceInDays,
} from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, DollarSign, ShoppingBag, Wrench, Flame, BarChart2, Target, Loader2 } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { useUIStore } from '@/lib/stores/uiStore';
import { AIAnalyticsPanel } from '@/components/shared/AIAnalyticsPanel';
import { fadeUp, stagger } from '@/lib/motion-variants';

// ── Period definitions ──────────────────────────────────────────────────────

type PeriodKey = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

interface PeriodRange { start: string; end: string; label: string }

function fmt(d: Date) { return format(d, 'yyyy-MM-dd'); }

function getPeriods(key: PeriodKey, customStart: string, customEnd: string): { current: PeriodRange; previous: PeriodRange } {
  const now = new Date();
  switch (key) {
    case 'this_week': {
      const s = startOfWeek(now, { weekStartsOn: 1 });
      const e = endOfWeek(now, { weekStartsOn: 1 });
      const ps = subWeeks(s, 1);
      const pe = subWeeks(e, 1);
      return {
        current:  { start: fmt(s),  end: fmt(e),  label: 'This Week' },
        previous: { start: fmt(ps), end: fmt(pe), label: 'Last Week' },
      };
    }
    case 'last_week': {
      const s = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const e = endOfWeek(subWeeks(now, 1),   { weekStartsOn: 1 });
      const ps = subWeeks(s, 1);
      const pe = subWeeks(e, 1);
      return {
        current:  { start: fmt(s),  end: fmt(e),  label: 'Last Week' },
        previous: { start: fmt(ps), end: fmt(pe), label: 'Prev Week' },
      };
    }
    case 'this_month': {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      const ps = startOfMonth(subMonths(now, 1));
      const pe = endOfMonth(subMonths(now, 1));
      return {
        current:  { start: fmt(s),  end: fmt(e),  label: 'This Month' },
        previous: { start: fmt(ps), end: fmt(pe), label: 'Last Month' },
      };
    }
    case 'last_month': {
      const s = startOfMonth(subMonths(now, 1));
      const e = endOfMonth(subMonths(now, 1));
      const ps = startOfMonth(subMonths(now, 2));
      const pe = endOfMonth(subMonths(now, 2));
      return {
        current:  { start: fmt(s),  end: fmt(e),  label: 'Last Month' },
        previous: { start: fmt(ps), end: fmt(pe), label: 'Prev Month' },
      };
    }
    case 'custom': {
      if (!customStart || !customEnd) {
        const s = startOfMonth(now);
        return {
          current:  { start: fmt(s), end: fmt(now), label: 'Custom' },
          previous: { start: fmt(subMonths(s,1)), end: fmt(subMonths(now,1)), label: 'Prior Period' },
        };
      }
      const cs = parseISO(customStart);
      const ce = parseISO(customEnd);
      const days = differenceInDays(ce, cs);
      const ps = subDays(cs, days + 1);
      const pe = subDays(cs, 1);
      return {
        current:  { start: customStart, end: customEnd, label: 'Custom Range' },
        previous: { start: fmt(ps), end: fmt(pe), label: 'Prior Period' },
      };
    }
  }
}

const PERIOD_BTNS: { key: PeriodKey; label: string }[] = [
  { key: 'this_week',   label: 'This Week' },
  { key: 'last_week',   label: 'Last Week' },
  { key: 'this_month',  label: 'This Month' },
  { key: 'last_month',  label: 'Last Month' },
  { key: 'custom',      label: 'Custom' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(current: number, previous: number) {
  if (previous === 0 || isNaN(current) || isNaN(previous)) return null;
  const result = ((current - previous) / Math.abs(previous)) * 100;
  return isFinite(result) ? result : null;
}

function buildMap(points: RevenueTrendPoint[] | undefined | null, days: string[]) {
  const map: Record<string, { revenue: number; expenses: number; profit: number }> = {};
  for (const d of days) map[d] = { revenue: 0, expenses: 0, profit: 0 };
  for (const p of (Array.isArray(points) ? points : [])) {
    const key = p.date?.slice(0, 10) ?? '';
    if (key in map) map[key] = { revenue: p.revenue, expenses: p.expenses, profit: p.revenue - p.expenses };
  }
  return map;
}

function buildCharts(
  curPoints: RevenueTrendPoint[] | undefined | null,
  prevPoints: RevenueTrendPoint[] | undefined | null,
  curDays: string[],
  prevDays: string[],
  labelFn: (d: string) => string,
) {
  const cur  = buildMap(curPoints,  curDays);
  const prev = buildMap(prevPoints, prevDays);
  const n = Math.max(curDays.length, prevDays.length);

  const revenue:  ComparisonPoint[] = [];
  const expenses: ComparisonPoint[] = [];
  const profit:   ComparisonPoint[] = [];

  for (let i = 0; i < n; i++) {
    const label = labelFn(curDays[i] ?? prevDays[i] ?? '');
    const ck = curDays[i] ?? '';
    const pk = prevDays[i] ?? '';
    revenue.push({ label, current: cur[ck]?.revenue  ?? 0, previous: prev[pk]?.revenue  ?? 0 });
    expenses.push({ label, current: cur[ck]?.expenses ?? 0, previous: prev[pk]?.expenses ?? 0 });
    profit.push({ label, current: cur[ck]?.profit   ?? 0, previous: prev[pk]?.profit   ?? 0 });
  }
  return { revenue, expenses, profit };
}

function makeDays(start: string, end: string): string[] {
  try {
    const s = parseISO(start), e = parseISO(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return [];
    return eachDayOfInterval({ start: s, end: e }).map(d => fmt(d));
  } catch { return []; }
}

// ── Trend chip ─────────────────────────────────────────────────────────────

function TrendChip({ label, current, previous }: { label: string; current: number; previous: number }) {
  const change = pct(current, previous);
  const up = current >= previous;
  const color = change === null ? '#8B96A8' : up ? '#10B981' : '#EF4444';
  return (
    <div className="glass-stat">
      <p style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {formatCompact(Math.abs(current))}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {change !== null ? (
          <>
            {up ? <TrendingUp size={11} style={{ color }} /> : <TrendingDown size={11} style={{ color }} />}
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{up ? '+' : ''}{change.toFixed(1)}%</span>
          </>
        ) : <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>No prior data</span>}
      </div>
      <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>prev {formatCompact(Math.abs(previous))}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [metric, setMetric] = useState<'revenue' | 'expenses' | 'profit'>('profit');
  const [showCustom, setShowCustom] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(0);
  const [goalProfit, setGoalProfit] = useState(0);
  const [savingGoals, setSavingGoals] = useState(false);
  const thisMonth = new Date().getMonth() + 1;
  const thisYear  = new Date().getFullYear();

  const { current, previous } = useMemo(
    () => getPeriods(periodKey, customStart, customEnd),
    [periodKey, customStart, customEnd],
  );

  const { data: curSummary }  = useQuery({ queryKey: ['summary', current.start,  current.end],  queryFn: () => analyticsApi.businessSummary({ period_start: current.start,  period_end: current.end  }) });
  const { data: prevSummary } = useQuery({ queryKey: ['summary', previous.start, previous.end], queryFn: () => analyticsApi.businessSummary({ period_start: previous.start, period_end: previous.end }) });
  const { data: curTrend }    = useQuery({ queryKey: ['trend',   current.start,  current.end],  queryFn: () => analyticsApi.revenueTrend({ period_start: current.start,  period_end: current.end  }) });
  const { data: prevTrend }   = useQuery({ queryKey: ['trend',   previous.start, previous.end], queryFn: () => analyticsApi.revenueTrend({ period_start: previous.start, period_end: previous.end }) });
  const { data: topItems }    = useQuery({ queryKey: ['top-items', current.start, current.end], queryFn: () => analyticsApi.topItems({ period_start: current.start, period_end: current.end, limit: 8 }) });
  const { data: repairStats } = useQuery({ queryKey: ['repair-stats', current.start, current.end], queryFn: () => analyticsApi.repairStats({ period_start: current.start, period_end: current.end }) });
  const { data: expBreakdown }= useQuery({ queryKey: ['exp-breakdown', current.start, current.end], queryFn: () => analyticsApi.expenseBreakdown({ period_start: current.start, period_end: current.end }) });

  const { data: monthlyGoal } = useQuery({
    queryKey: ['monthly-goal', thisMonth, thisYear],
    queryFn: () => analyticsApi.getMonthlyGoal({ month: thisMonth, year: thisYear }),
  });

  const curDays  = useMemo(() => makeDays(current.start,  current.end),  [current.start,  current.end]);
  const prevDays = useMemo(() => makeDays(previous.start, previous.end), [previous.start, previous.end]);

  const isLong = curDays.length > 14;
  const labelFn = (d: string) => {
    try {
      const p = parseISO(d);
      return isLong ? format(p, 'd MMM') : format(p, 'EEE d');
    } catch { return d; }
  };

  const charts = useMemo(() => {
    if (!curDays.length || !prevDays.length) return null;
    return buildCharts(curTrend, prevTrend, curDays, prevDays, labelFn);
  }, [curTrend, prevTrend, curDays, prevDays, isLong]);

  // 6-month bar chart
  const now = new Date();
  const monthProfits = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      return { label: format(d, 'MMM'), start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)) };
    }), []);

  const monthQueries = monthProfits.map(m =>
    useQuery({ queryKey: ['summary', m.start, m.end], queryFn: () => analyticsApi.businessSummary({ period_start: m.start, period_end: m.end }) })
  );
  const profitBarData = monthProfits.map((m, i) => ({ label: m.label, profit: monthQueries[i].data?.net_profit ?? 0 }));

  const curProfit    = curSummary?.net_profit  ?? 0;
  const prevProfit   = prevSummary?.net_profit ?? 0;
  const profitChange = pct(curProfit, prevProfit);
  const isBetter     = curProfit >= prevProfit;

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    try {
      await analyticsApi.updateMonthlyGoal(thisMonth, thisYear, { revenue_target: goalRevenue, profit_target: goalProfit });
      qc.invalidateQueries({ queryKey: ['monthly-goal'] });
      addToast({ type: 'success', title: 'Monthly goals updated' });
      setShowGoals(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save goals', message: err instanceof Error ? err.message : '' });
    } finally {
      setSavingGoals(false);
    }
  };

  const openGoals = () => {
    setGoalRevenue(monthlyGoal?.revenue_target ?? 0);
    setGoalProfit(monthlyGoal?.profit_target ?? 0);
    setShowGoals(true);
  };

  return (
    <div className="analytics-page">
      {/* Header */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Business</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800 }}>Analytics</h2>
        </div>
        <button className="btn-ghost" onClick={openGoals} style={{ gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
          <Target size={14} /> Set Monthly Goals
        </button>
      </motion.div>

      {/* Period selector */}
      <div>
        <div className="period-scroll">
          {PERIOD_BTNS.map(p => (
            <button key={p.key} className={`period-pill ${periodKey === p.key ? 'active' : ''}`}
              onClick={() => { setPeriodKey(p.key); setShowCustom(p.key === 'custom'); }}>
              {p.key === 'custom' && <Calendar size={12} />}
              {p.label}
            </button>
          ))}
        </div>

        {showCustom && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">From</label>
              <input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">To</label>
              <input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </motion.div>
        )}

        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{current.start} → {current.end}</span>
          {' '}vs <span>{previous.start} → {previous.end}</span>
        </p>
      </div>

      {/* Monthly goals progress */}
      {monthlyGoal && (monthlyGoal.revenue_target > 0 || monthlyGoal.profit_target > 0) && periodKey === 'this_month' && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
          {monthlyGoal.revenue_target > 0 && (
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Revenue Goal</span>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {formatNaira(curSummary?.total_revenue ?? 0)} / {formatNaira(monthlyGoal.revenue_target)}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width 0.6s ease',
                  width: `${Math.min(100, ((curSummary?.total_revenue ?? 0) / monthlyGoal.revenue_target) * 100)}%`,
                  background: (curSummary?.total_revenue ?? 0) >= monthlyGoal.revenue_target ? 'var(--accent-green)' : 'var(--accent-primary)',
                }} />
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                {Math.min(100, ((curSummary?.total_revenue ?? 0) / monthlyGoal.revenue_target * 100)).toFixed(0)}%
              </p>
            </div>
          )}
          {monthlyGoal.profit_target > 0 && (
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Profit Goal</span>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {formatNaira(curSummary?.net_profit ?? 0)} / {formatNaira(monthlyGoal.profit_target)}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width 0.6s ease',
                  width: `${Math.min(100, ((curSummary?.net_profit ?? 0) / monthlyGoal.profit_target) * 100)}%`,
                  background: (curSummary?.net_profit ?? 0) >= monthlyGoal.profit_target ? 'var(--accent-green)' : 'var(--accent-amber)',
                }} />
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                {Math.min(100, ((curSummary?.net_profit ?? 0) / monthlyGoal.profit_target * 100)).toFixed(0)}%
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── AI Analytics Report ──────────────────────────────────── */}
      <AIAnalyticsPanel
        summary={curSummary ?? null}
        prevSummary={prevSummary ?? null}
        expenseBreakdown={expBreakdown ?? []}
        topItems={topItems ?? []}
        repairStats={repairStats ?? []}
        periodLabel={current.label}
        prevPeriodLabel={previous.label}
      />

      {/* ── Hero: Revenue as primary ─────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        className={`glass-panel-hero ${isBetter ? '' : 'loss'}`}>

        {/* Revenue — primary metric */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
            <div className="section-icon" style={{ background: 'rgba(200,16,46,0.25)' }}>
              <DollarSign size={15} style={{ color: '#fff' }} />
            </div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Total Revenue · {current.label}
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.6rem,6vw,2.4rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {formatNaira(curSummary?.total_revenue ?? 0)}
          </p>
          {(() => {
            const c = pct(curSummary?.total_revenue ?? 0, prevSummary?.total_revenue ?? 0);
            const up = (curSummary?.total_revenue ?? 0) >= (prevSummary?.total_revenue ?? 0);
            return c !== null ? (
              <p style={{ fontSize: '0.62rem', color: up ? 'rgba(52,211,153,0.9)' : 'rgba(248,113,113,0.9)', marginTop: 4, fontWeight: 700 }}>
                {up ? '↑' : '↓'} {Math.abs(c).toFixed(1)}% vs {previous.label.toLowerCase()}
              </p>
            ) : null;
          })()}
        </div>

        {/* Secondary metrics row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 1, marginTop: 'var(--space-4)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 14, overflow: 'hidden',
          position: 'relative', zIndex: 1,
        }}>
          {([
            ['Expenses',   curSummary?.total_expenses ?? 0, prevSummary?.total_expenses ?? 0, false],
            ['Net Profit', curSummary?.net_profit     ?? 0, prevSummary?.net_profit     ?? 0, true ],
            ['Balance',    curSummary?.available_balance ?? 0, prevSummary?.available_balance ?? 0, true],
          ] as [string, number, number, boolean][]).map(([lbl, cur, prev, positiveIsGood]) => {
            const c   = pct(cur, prev);
            const up  = cur >= prev;
            const col = positiveIsGood
              ? (up ? 'rgba(52,211,153,0.85)' : 'rgba(248,113,113,0.85)')
              : (up ? 'rgba(248,113,113,0.85)' : 'rgba(52,211,153,0.85)');
            return (
              <div key={lbl} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)' }}>
                <p style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {lbl}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatCompact(Math.abs(cur))}
                </p>
                {c !== null && (
                  <p style={{ fontSize: '0.52rem', fontWeight: 700, color: col, marginTop: 2 }}>
                    {up ? '↑' : '↓'}{Math.abs(c).toFixed(1)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Profit verdict badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 'var(--space-3)', position: 'relative', zIndex: 1,
          background: isBetter ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${isBetter ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 20, padding: '4px 12px',
          fontSize: '0.6rem', fontWeight: 700, color: '#fff',
        }}>
          {isBetter ? <TrendingUp size={11} style={{ color: '#10B981' }} /> : <TrendingDown size={11} style={{ color: '#EF4444' }} />}
          {isBetter ? 'Profitable' : 'Under Pressure'} — Net {formatCompact(Math.abs(curProfit))}
          {profitChange !== null && ` (${isBetter ? '+' : ''}${profitChange.toFixed(1)}%)`}
        </div>
      </motion.div>

      {/* Expenses explanation note */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderLeft: '3px solid var(--accent-amber)',
        borderRadius: 12, padding: '10px 14px',
        marginBottom: 'var(--space-3)',
      }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--accent-amber)' }}>About Expenses: </strong>
          Total expenses include inventory restocks, damage losses, and <em>paid tithe</em> (tithe is recorded as an expense only when marked paid).
          Net profit = Revenue − expenses (excluding unpaid tithe). Available balance = Profit − paid tithe.
        </p>
      </div>

      {/* Metric selector + chart */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'capitalize' }}>{metric} Trend</p>
            <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {current.label} <span style={{ color: '#C8102E' }}>——</span> vs {previous.label} <span style={{ color: '#3E4558' }}>- - -</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['revenue','expenses','profit'] as const).map(m => (
              <button key={m} className={`metric-pill ${metric === m ? 'active' : ''}`} onClick={() => setMetric(m)}>{m}</button>
            ))}
          </div>
        </div>
        <div className="analytics-chart-wrap">
          {charts ? (
            <ComparisonLineChart data={charts[metric]} currentLabel={current.label} previousLabel={previous.label} height={200} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 24, height: 24, border: '2px solid #21242C', borderTopColor: '#C8102E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="initial" animate="animate"
        className="analytics-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)' }}>
        <TrendChip label="Revenue"  current={curSummary?.total_revenue  ?? 0} previous={prevSummary?.total_revenue  ?? 0} />
        <TrendChip label="Expenses" current={curSummary?.total_expenses ?? 0} previous={prevSummary?.total_expenses ?? 0} />
        <TrendChip label="Profit"   current={curSummary?.net_profit     ?? 0} previous={prevSummary?.net_profit     ?? 0} />
      </motion.div>

      {/* ── BREAK-EVEN ANALYSIS ── */}
      {(() => {
        const rev = curSummary?.total_revenue ?? 0;
        const exp = curSummary?.total_expenses ?? 0;
        const profit = curSummary?.net_profit ?? 0;
        const beTarget = exp || 1;
        const beProgress = Math.min((rev / beTarget) * 100, 150);
        const pastBE = rev >= exp;
        const surplus = rev - exp;

        return (
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
              <div className="section-icon" style={{ background: pastBE ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }}>
                <DollarSign size={18} style={{ color: pastBE ? '#10B981' : '#F59E0B' }} />
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Break-Even Analysis</p>
                <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Revenue vs. expenses · {current.label}</p>
              </div>
            </div>

            <div className="status-badge" style={{
              background: pastBE ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${pastBE ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
              color: pastBE ? '#10B981' : '#F59E0B', marginBottom: 'var(--space-4)',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
              {pastBE ? 'Break-Even Passed ✓' : 'Below Break-Even'}
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Revenue Progress</span>
                <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {exp > 0 ? `${Math.min(beProgress, 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              <div className="be-progress-track">
                <div className="be-progress-fill" style={{
                  width: `${Math.min(beProgress, 100)}%`,
                  background: pastBE ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #F59E0B, #D97706)',
                }} />
                {exp > 0 && <div className="be-marker" style={{ left: `${Math.min(100, (exp / Math.max(rev, exp)) * 100)}%` }} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>₦0</span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Break-even: {formatCompact(exp)}</span>
              </div>
            </div>

            <div className="analytics-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
              <div className="glass-stat">
                <p style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Revenue</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#10B981' }}>{formatCompact(rev)}</p>
              </div>
              <div className="glass-stat">
                <p style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Expenses</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#EF4444' }}>{formatCompact(exp)}</p>
              </div>
              <div className="glass-stat">
                <p style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{pastBE ? 'Surplus' : 'Deficit'}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: pastBE ? '#10B981' : '#EF4444' }}>{pastBE ? '+' : ''}{formatCompact(surplus)}</p>
              </div>
            </div>
          </motion.div>
        );
      })()}

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="glass-panel">
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 4 }}>Monthly Profit / Loss</p>
        <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Last 6 months — green = profit, red = loss</p>
        <div className="analytics-chart-wrap">
          <ProfitLossBar data={profitBarData} height={180} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
          <div className="section-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
            <TrendingUp size={18} style={{ color: '#10B981' }} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Top Money Makers</p>
            <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Items & repairs generating the most income · {current.label}</p>
          </div>
        </div>

        {/* Top selling items */}
        {topItems && topItems.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShoppingBag size={12} /> Product Sales
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topItems.map((item, i) => {
                const maxRev = topItems[0]?.total_revenue || 1;
                const pctWidth = Math.max((item.total_revenue / maxRev) * 100, 4);
                return (
                  <div key={item.item_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', width: 18, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item_name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10B981', flexShrink: 0, marginLeft: 8 }}>{formatNaira(item.total_revenue)}</span>
                      </div>
                      <div className="rank-bar-track">
                        <div className="rank-bar-fill" style={{ width: `${pctWidth}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{item.total_quantity} units sold</span>
                        <span style={{ fontSize: '0.55rem', color: item.total_profit >= 0 ? '#10B981' : '#EF4444' }}>Profit: {formatNaira(item.total_profit)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {repairStats && repairStats.length > 0 && (
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wrench size={12} /> Repair Revenue by Device
            </p>
            <div className="repair-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
              {repairStats.map((rs) => (
                <div key={rs.device_type} className="repair-stat-card">
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-secondary)', marginBottom: 6 }}>{rs.device_type.replace('_', ' ')}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#10B981' }}>{formatNaira(rs.total_revenue)}</p>
                  <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 3 }}>{rs.job_count} job{rs.job_count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!topItems || topItems.length === 0) && (!repairStats || repairStats.length === 0) && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>No income data for this period.</p>
        )}
      </motion.div>

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
          <div className="section-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <Flame size={18} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Where Your Money Goes</p>
            <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Expense categories ranked by spend · {current.label}</p>
          </div>
        </div>

        {expBreakdown && expBreakdown.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...expBreakdown].sort((a, b) => b.amount - a.amount).map((cat, i) => {
              const ECOLORS = ['#EF4444','#F59E0B','#8B5CF6','#3B82F6','#06B6D4','#EC4899','#84CC16','#10B981','#D4A535','#6B7280'];
              const color = ECOLORS[i % ECOLORS.length];
              return (
                <div key={cat.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'capitalize' }}>{cat.category.replace('_', ' ')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)' }}>{cat.percentage.toFixed(1)}%</span>
                      <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{formatNaira(cat.amount)}</span>
                    </div>
                  </div>
                  <div className="expense-bar-track">
                    <div style={{ height: '100%', width: `${Math.max(cat.percentage, 2)}%`, borderRadius: 5, background: color, opacity: 0.85, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>No expenses recorded for this period.</p>
        )}
      </motion.div>

      <Modal
        isOpen={showGoals}
        onClose={() => setShowGoals(false)}
        title={`Monthly Goals — ${new Date().toLocaleString('default', { month: 'long' })} ${thisYear}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowGoals(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveGoals} disabled={savingGoals}>
              {savingGoals && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Save Goals
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Set targets for this month. Progress bars will appear on the analytics page when goals are active.
          </p>
          <CurrencyInput label="Revenue Target" value={goalRevenue} onChange={setGoalRevenue} />
          <CurrencyInput label="Profit Target" value={goalProfit} onChange={setGoalProfit} />
        </div>
      </Modal>
    </div>
  );
}
