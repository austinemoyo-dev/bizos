'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { analyticsApi } from '@/lib/api/analytics';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatNaira, formatCompact } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { fadeUp } from '@/lib/motion-variants';
import {
  PiggyBank, TrendingDown, TrendingUp, Wallet, Target,
  CheckCircle, AlertTriangle, ArrowRight, Loader2, Banknote,
  Award, BarChart2, Zap, Activity, Calendar,
} from 'lucide-react';
import Link from 'next/link';

// ── Constants ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B', transport: '#3B82F6', data: '#8B5CF6',
  airtime: '#6366F1', bills: '#EF4444', savings: '#10B981',
  tithe: '#F472B6', debt_repayment: '#DC2626', miscellaneous: '#6B7280',
};
const getCatColor = (c: string) => CATEGORY_COLORS[c.toLowerCase()] ?? '#6B7280';

const CHART_THEME = {
  grid: '#1F2535', label: '#8B96A8',
  tooltipBg: '#181C24', tooltipBorder: '#2A3347',
};

const BUDGET_KEY = 'personal_category_budgets';

// ── Helpers ──────────────────────────────────────────────────────

function computeHealthScore(savingsRate: number, emergencyMonths: number, debtToIncome: number) {
  let s = 0;
  if (savingsRate >= 20) s += 40; else if (savingsRate >= 10) s += 28; else if (savingsRate >= 0) s += 14;
  if (emergencyMonths >= 6) s += 35; else if (emergencyMonths >= 3) s += 24; else if (emergencyMonths >= 1) s += 12;
  if (debtToIncome <= 0.1) s += 25; else if (debtToIncome <= 0.2) s += 18;
  else if (debtToIncome <= 0.35) s += 10; else if (debtToIncome <= 0.5) s += 4;
  return Math.max(0, Math.min(100, s));
}

function healthLabel(score: number) {
  if (score >= 80) return { label: 'Excellent', color: '#10B981' };
  if (score >= 60) return { label: 'Good', color: '#3B82F6' };
  if (score >= 40) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Needs Work', color: '#EF4444' };
}

function loadBudgets(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(BUDGET_KEY) ?? '{}'); } catch { return {}; }
}

function saveBudgets(b: Record<string, number>) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(b));
}

// ── Chart tooltip ────────────────────────────────────────────────

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}`, borderRadius: 12, padding: '10px 14px' }}>
      <p style={{ color: CHART_THEME.label, fontSize: '0.65rem', marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: p.color ?? '#A78BFA' }}>
          {p.name}: {formatNaira(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Shared style objects ─────────────────────────────────────────

const card = {
  background: 'var(--bg-surface)', borderRadius: 20,
  padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
  marginBottom: 'var(--space-5)',
} as React.CSSProperties;

const statBox = {
  textAlign: 'center' as const, padding: 'var(--space-3)',
  background: 'var(--bg-elevated)', borderRadius: 12,
};

const statLabel = {
  fontSize: '0.6rem', color: 'var(--text-muted)',
  marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
};

// ── Sub-components ───────────────────────────────────────────────

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
      <span style={{ color: '#A78BFA' }}>{icon}</span>
      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>{label}</p>
    </div>
  );
}

function MetricCard({
  label, value, sub, icon, color, bg, onClick,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: string; bg: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      padding: 'var(--space-4)', background: 'var(--bg-surface)', borderRadius: 16,
      border: '1px solid var(--border-subtle)', cursor: onClick ? 'pointer' : 'default',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>{label}</p>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color, lineHeight: 1, margin: 0 }}>{value}</p>
      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function PersonalPlanningPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showSetBalance, setShowSetBalance] = useState(false);
  const [showSetBudgets, setShowSetBudgets] = useState(false);
  const [obAmount, setObAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [budgetDraft, setBudgetDraft] = useState<Record<string, number>>({});

  useEffect(() => { setBudgets(loadBudgets()); }, []);

  // ── Queries ────────────────────────────────────────────────────
  const { data: burnRate, isLoading: burnLoading } = useQuery({
    queryKey: ['personal-burn-rate'],
    queryFn: () => cashFlowApi.getBurnRate(3),
  });
  const { data: debtPlan, isLoading: debtLoading } = useQuery({
    queryKey: ['personal-debt-plan'],
    queryFn: () => cashFlowApi.getDebtPlan(),
  });
  const { data: cashPos } = useQuery({
    queryKey: ['cash-position', 'personal'],
    queryFn: () => cashFlowApi.getPosition('personal'),
  });
  const { data: netWorth } = useQuery({
    queryKey: ['net-worth'],
    queryFn: () => cashFlowApi.getNetWorth(),
  });
  const { data: forecast } = useQuery({
    queryKey: ['liquidity-forecast', 'personal'],
    queryFn: () => cashFlowApi.getForecast('personal', 30),
  });
  const mStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const mEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: personalSummary } = useQuery({
    queryKey: ['personal-summary', mStart, mEnd],
    queryFn: () => analyticsApi.personalSummary({ period_start: mStart, period_end: mEnd }),
  });

  // ── Derived values ─────────────────────────────────────────────
  const isLoading = burnLoading || debtLoading;
  const thisMonth = burnRate?.this_month;
  const avgBurn = burnRate?.average_monthly_burn ?? 1;
  const overSpending = thisMonth ? thisMonth.projected_total > avgBurn : false;
  const monthProgress = thisMonth ? Math.min(100, (thisMonth.spent_so_far / avgBurn) * 100) : 0;

  const avgIncome = debtPlan?.avg_monthly_income ?? 0;
  const avgExpenses = debtPlan?.avg_monthly_expenses ?? 0;
  const savingsRate = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;
  const currentBal = cashPos?.current_balance ?? personalSummary?.available_balance ?? 0;
  const emergencyMonths = avgBurn > 0 ? currentBal / avgBurn : 0;
  const totalDebt = debtPlan?.total_personal_debt ?? 0;
  const debtToIncome = avgIncome > 0 ? totalDebt / avgIncome : 0;
  const healthScore = computeHealthScore(savingsRate, emergencyMonths, debtToIncome);
  const health = healthLabel(healthScore);
  const dailyBurn = avgBurn / 30;

  // Category chart data
  const categoryData = Object.entries(burnRate?.category_breakdown ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([cat, avg]) => ({
      name: cat.replace(/_/g, ' '),
      avg,
      budget: budgets[cat] ?? 0,
      color: getCatColor(cat),
      key: cat,
    }));

  // Forecast area chart — cumulative running balance
  const forecastChart = (() => {
    if (!forecast) return [];
    const sorted = [...forecast.items].sort((a, b) => a.date.localeCompare(b.date));
    let balance = forecast.current_balance;
    const pts: { label: string; balance: number }[] = [{ label: 'Today', balance }];
    for (const item of sorted) {
      let label = item.date;
      try { label = format(parseISO(item.date), 'MMM d'); } catch { /* */ }
      balance += item.direction === 'in' ? item.expected_amount : -item.expected_amount;
      const last = pts[pts.length - 1];
      if (last.label === label) { last.balance = balance; } else { pts.push({ label, balance }); }
    }
    return pts;
  })();

  // Budget modal helpers
  const openBudgetModal = () => { setBudgetDraft({ ...budgets }); setShowSetBudgets(true); };
  const saveBudgetModal = () => {
    setBudgets(budgetDraft);
    saveBudgets(budgetDraft);
    setShowSetBudgets(false);
    addToast({ type: 'success', title: 'Budgets saved', message: 'Per-category budgets updated.' });
  };

  const handleSetBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await cashFlowApi.setOpeningBalance({ scope: 'personal', opening_balance: obAmount });
      qc.invalidateQueries({ queryKey: ['cash-position', 'personal'] });
      addToast({ type: 'success', title: 'Balance set', message: 'Personal cash tracking is now active.' });
      setShowSetBalance(false);
    } catch (err: unknown) {
      addToast({ type: 'error', title: 'Failed', message: (err as { message?: string })?.message });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title="Personal Planning"
        subtitle="Financial health · Budget tracker · Debt payoff · 30-day forecast"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }} onClick={openBudgetModal}>
              <Target size={14} /> Set Budgets
            </button>
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setShowSetBalance(true)}>
              <Wallet size={14} /> Set Balance
            </button>
          </div>
        }
      />

      {/* ══ FINANCIAL HEALTH SCORE ══════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
        background: 'linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(99,102,241,0.06) 100%)',
        border: '1px solid rgba(139,92,246,0.25)', borderRadius: 20,
        padding: 'var(--space-5)', marginBottom: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-5)',
      }}>
        {/* SVG ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={84} height={84} viewBox="0 0 84 84">
            <circle cx={42} cy={42} r={34} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
            <circle cx={42} cy={42} r={34} fill="none"
              stroke={health.color} strokeWidth={9}
              strokeDasharray={`${(healthScore / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 42 42)"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color: health.color, lineHeight: 1, margin: 0 }}>{healthScore}</p>
            <p style={{ fontSize: '0.5rem', color: 'var(--text-muted)', margin: 0 }}>/ 100</p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>
            Financial Health Score
          </p>
          <p style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: health.color, marginBottom: 'var(--space-3)', lineHeight: 1 }}>
            {health.label}
          </p>
          {/* Three sub-bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'Savings Rate', pct: Math.min(100, Math.max(0, savingsRate * 5)), display: `${savingsRate.toFixed(1)}%`, color: '#A78BFA' },
              { label: 'Emergency Fund', pct: Math.min(100, emergencyMonths * 16.67), display: `${emergencyMonths.toFixed(1)}mo`, color: '#34D399' },
              { label: 'Debt Ratio', pct: Math.max(0, 100 - debtToIncome * 200), display: `${(debtToIncome * 100).toFixed(0)}% DTI`, color: '#F59E0B' },
            ].map(({ label, pct, display, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', width: 86, flexShrink: 0, margin: 0 }}>{label}</p>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                </div>
                <p style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color, width: 48, textAlign: 'right', flexShrink: 0, margin: 0 }}>{display}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ══ KEY METRICS GRID ════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <MetricCard
          label="Cash in Hand"
          value={formatNaira(currentBal)}
          sub={cashPos ? `In: ${formatNaira(cashPos.total_in)} · Out: ${formatNaira(cashPos.total_out)}` : 'Tap to set opening balance'}
          icon={<Wallet size={17} style={{ color: '#A78BFA' }} />}
          color="#A78BFA" bg="rgba(139,92,246,0.12)"
          onClick={() => setShowSetBalance(true)}
        />
        <MetricCard
          label="Daily Burn Rate"
          value={formatNaira(dailyBurn)}
          sub="avg spend per day (3-mo)"
          icon={<Activity size={17} style={{ color: '#F59E0B' }} />}
          color="#F59E0B" bg="rgba(245,158,11,0.12)"
        />
        <MetricCard
          label="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          sub={savingsRate >= 20 ? 'Excellent — keep it up' : savingsRate >= 10 ? 'Good — aim for 20%+' : 'Below target'}
          icon={<PiggyBank size={17} style={{ color: '#34D399' }} />}
          color={savingsRate >= 20 ? '#34D399' : savingsRate >= 10 ? '#F59E0B' : '#EF4444'}
          bg="rgba(52,211,153,0.1)"
        />
        <MetricCard
          label="Emergency Runway"
          value={`${emergencyMonths.toFixed(1)} mo`}
          sub={emergencyMonths >= 6 ? '6+ months — excellent' : emergencyMonths >= 3 ? 'Aim for 6 months' : 'Build emergency fund'}
          icon={<Award size={17} style={{ color: '#60A5FA' }} />}
          color={emergencyMonths >= 6 ? '#34D399' : emergencyMonths >= 3 ? '#F59E0B' : '#EF4444'}
          bg="rgba(96,165,250,0.1)"
        />
      </motion.div>

      {/* ══ MONTHLY BURN RATE ═══════════════════════════════════════ */}
      {isLoading ? (
        <div className="skeleton" style={{ height: 340, borderRadius: 20, marginBottom: 'var(--space-5)' }} />
      ) : burnRate && thisMonth && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <SectionTitle icon={<BarChart2 size={14} />}>Monthly Burn Rate</SectionTitle>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: '3-Mo Average', value: avgBurn, color: 'var(--text-primary)' },
              { label: 'Spent So Far', value: thisMonth.spent_so_far, color: overSpending ? '#EF4444' : '#F59E0B' },
              { label: 'Projected Total', value: thisMonth.projected_total, color: overSpending ? '#EF4444' : 'var(--text-primary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={statBox}>
                <p style={statLabel}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color, margin: 0 }}>{formatNaira(value)}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                Day {thisMonth.days_elapsed} / {thisMonth.days_elapsed + thisMonth.days_remaining} · {formatNaira(thisMonth.remaining_estimated)} est. remaining
              </p>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: overSpending ? '#EF4444' : 'var(--text-muted)', margin: 0 }}>
                {monthProgress.toFixed(0)}%
              </p>
            </div>
            <div style={{ height: 10, background: 'var(--bg-overlay)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 5, transition: 'width 0.6s ease',
                background: overSpending ? 'linear-gradient(90deg,#EF4444,#DC2626)' : 'linear-gradient(90deg,#8B5CF6,#6D28D9)',
                width: `${monthProgress}%`,
              }} />
            </div>
            {overSpending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 'var(--text-xs)', color: '#EF4444' }}>
                <AlertTriangle size={12} />
                Projected overspend: {formatNaira(thisMonth.projected_total - avgBurn)}
              </div>
            )}
          </div>

          {/* Category bar chart */}
          {categoryData.length > 0 && (
            <>
              <p style={{ ...statLabel, marginBottom: 'var(--space-3)' }}>Avg Spend by Category (3-mo)</p>
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: CHART_THEME.label, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fill: CHART_THEME.label, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Bar dataKey="avg" name="Spent" radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Budget vs actual rows */}
              <p style={{ ...statLabel, marginBottom: 'var(--space-3)' }}>Budget vs Actual</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categoryData.map(({ name, avg, budget, color, key }) => {
                  const hasBudget = budget > 0;
                  const pct = hasBudget
                    ? Math.min(100, (avg / budget) * 100)
                    : (avgBurn > 0 ? (avg / avgBurn) * 100 : 0);
                  const over = hasBudget && avg > budget;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize', margin: 0 }}>{name}</p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {hasBudget && (
                            <p style={{ fontSize: '0.6rem', color: over ? '#EF4444' : 'var(--text-muted)', margin: 0 }}>
                              {over ? `+${formatNaira(avg - budget)} over` : `${formatNaira(budget - avg)} left`}
                            </p>
                          )}
                          <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: over ? '#EF4444' : color, margin: 0 }}>
                            {formatNaira(avg)}{hasBudget ? ` / ${formatNaira(budget)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: over ? '#EF4444' : color, width: `${Math.max(0, Math.min(100, pct))}%`, opacity: 0.85 }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(budgets).length === 0 && (
                  <button onClick={openBudgetModal} style={{
                    fontSize: '0.6rem', color: '#A78BFA', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginTop: 2,
                  }}>
                    <Target size={10} /> Set category budgets to track budget vs actual
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* ══ INCOME & SAVINGS ANALYSIS ═══════════════════════════════ */}
      {debtPlan && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <SectionTitle icon={<TrendingUp size={14} />}>Income &amp; Savings Analysis</SectionTitle>

          {/* Three stat boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Avg Income', value: avgIncome, color: '#10B981' },
              { label: 'Avg Expenses', value: avgExpenses, color: '#EF4444' },
              { label: 'Disposable', value: debtPlan.monthly_disposable, color: debtPlan.monthly_disposable > 0 ? '#A78BFA' : '#EF4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={statBox}>
                <p style={statLabel}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color, margin: 0 }}>{formatNaira(value)}</p>
              </div>
            ))}
          </div>

          {/* Income allocation stacked bar */}
          {avgIncome > 0 && (
            <>
              <p style={{ ...statLabel, marginBottom: 8 }}>Income Allocation</p>
              <div style={{ height: 20, borderRadius: 10, overflow: 'hidden', display: 'flex', marginBottom: 8, background: 'var(--bg-overlay)' }}>
                <div style={{ width: `${Math.min(100, (avgExpenses / avgIncome) * 100)}%`, background: '#EF4444' }} />
                <div style={{ width: `${Math.max(0, Math.min(100 - (avgExpenses / avgIncome) * 100, (debtPlan.monthly_disposable / avgIncome) * 100))}%`, background: '#A78BFA' }} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <Legend color="#EF4444" label={`Expenses ${((avgExpenses / avgIncome) * 100).toFixed(0)}%`} />
                <Legend color="#A78BFA" label={`Disposable ${Math.max(0, (debtPlan.monthly_disposable / avgIncome) * 100).toFixed(0)}%`} />
              </div>
            </>
          )}

          {/* Savings rate + Emergency fund boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14 }}>
              <p style={statLabel}>Monthly Savings Rate</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 800, lineHeight: 1, margin: '4px 0', color: savingsRate >= 20 ? '#10B981' : savingsRate >= 10 ? '#F59E0B' : '#EF4444' }}>
                {savingsRate.toFixed(1)}%
              </p>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                {savingsRate >= 20 ? 'Building real wealth' : savingsRate >= 10 ? 'Good — push toward 20%' : savingsRate >= 0 ? 'Low — cut expenses' : 'Spending exceeds income'}
              </p>
            </div>
            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14 }}>
              <p style={statLabel}>Emergency Runway</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 800, lineHeight: 1, margin: '4px 0', color: emergencyMonths >= 6 ? '#10B981' : emergencyMonths >= 3 ? '#F59E0B' : '#EF4444' }}>
                {emergencyMonths.toFixed(1)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>months</span>
              </p>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                {emergencyMonths >= 6 ? '6+ months — excellent buffer' : emergencyMonths >= 3 ? 'Solid — aim for 6 months' : 'Low — prioritize building fund'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══ DEBT PAYOFF PLAN ════════════════════════════════════════ */}
      {debtPlan && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <SectionTitle icon={<Banknote size={14} />}>Debt Payoff Plan</SectionTitle>

          {/* Recommendation banner */}
          <div style={{
            padding: 'var(--space-4)', borderRadius: 14, marginBottom: 'var(--space-4)',
            background: totalDebt > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)',
            border: `1px solid ${totalDebt > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
          }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{debtPlan.recommendation}</p>
          </div>

          {totalDebt > 0 ? (
            <>
              {/* Debt summary */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14, marginBottom: 'var(--space-3)' }}>
                <div>
                  <p style={statLabel}>Total Personal Debt</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 800, color: '#EF4444', margin: 0 }}>{formatNaira(totalDebt)}</p>
                </div>
                {debtPlan.months_to_clear_all !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={statLabel}>Debt-free in</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 800, color: '#A78BFA', margin: 0 }}>
                      {debtPlan.months_to_clear_all} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>mo</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Debt-to-Income ratio */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>Debt-to-Income Ratio</p>
                  <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, margin: 0, color: debtToIncome > 0.35 ? '#EF4444' : debtToIncome > 0.2 ? '#F59E0B' : '#10B981' }}>
                    {(debtToIncome * 100).toFixed(0)}%
                  </p>
                </div>
                <div style={{ height: 8, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, debtToIncome * 200)}%`, background: debtToIncome > 0.35 ? '#EF4444' : debtToIncome > 0.2 ? '#F59E0B' : '#10B981' }} />
                </div>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0 0' }}>
                  {debtToIncome <= 0.1 ? 'Excellent — very low debt burden' : debtToIncome <= 0.2 ? 'Healthy — manageable level' : debtToIncome <= 0.35 ? 'Moderate — work to reduce' : 'High — prioritize repayment'}
                </p>
              </div>

              {/* Strategy tip */}
              <div style={{ padding: 'var(--space-3)', background: 'rgba(139,92,246,0.07)', borderRadius: 12, marginBottom: 'var(--space-4)', display: 'flex', gap: 10 }}>
                <Zap size={14} style={{ color: '#A78BFA', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#A78BFA', marginBottom: 3 }}>Recommended: Avalanche Method</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Apply your disposable income ({formatNaira(debtPlan.monthly_disposable)}) to the debt with the earliest due date first while making minimum payments on others. This eliminates debt fastest overall.
                  </p>
                </div>
              </div>

              {/* Individual debts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {debtPlan.debts.map((d) => (
                  <div key={d.id} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Banknote size={14} style={{ color: '#EF4444' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{d.creditor_name}</p>
                        {d.due_date && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>Due {d.due_date}</p>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#EF4444', margin: 0 }}>{formatNaira(d.outstanding)}</p>
                      {d.months_to_clear_at_current_rate !== null && (
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>{d.months_to_clear_at_current_rate}mo to clear</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              <CheckCircle size={32} style={{ color: '#10B981', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#10B981', margin: '0 0 4px' }}>Debt-free!</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>No outstanding personal debts. Keep it up!</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ══ PERSONAL CASH POSITION ══════════════════════════════════ */}
      {netWorth && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#A78BFA' }}><Award size={14} /></span>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                Personal Cash Position
              </p>
            </div>
            <Link href="/overview/net-worth" style={{ fontSize: '0.6rem', color: '#A78BFA', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
              Combined net worth →
            </Link>
          </div>

          {/* Personal cash hero */}
          <div style={{
            padding: 'var(--space-4)', borderRadius: 14, marginBottom: 'var(--space-4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: netWorth.personal_cash >= 0 ? 'rgba(167,139,250,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${netWorth.personal_cash >= 0 ? 'rgba(167,139,250,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            <div>
              <p style={statLabel}>Personal Cash</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.1rem,3.5vw,1.5rem)', fontWeight: 800, color: netWorth.personal_cash >= 0 ? '#A78BFA' : '#EF4444', lineHeight: 1, margin: 0 }}>
                {formatNaira(netWorth.personal_cash)}
              </p>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'right', margin: 0 }}>Income − Expenses</p>
          </div>

          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
            Business accounts, inventory, loans, and debts are excluded here. View the{' '}
            <Link href="/overview/net-worth" style={{ color: '#A78BFA', textDecoration: 'none' }}>combined overview</Link>{' '}
            for full net worth across all accounts.
          </p>
        </motion.div>
      )}

      {/* ══ 30-DAY LIQUIDITY FORECAST ═══════════════════════════════ */}
      {forecast && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <SectionTitle icon={<Calendar size={14} />}>30-Day Liquidity Forecast</SectionTitle>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Projected:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: forecast.projected_balance >= 0 ? '#A78BFA' : '#EF4444' }}>
                {formatNaira(forecast.projected_balance)}
              </span>
            </span>
          </div>

          {/* Inflow / Outflow / Projected summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Current Balance', value: forecast.current_balance, color: '#A78BFA' },
              { label: 'Expected In', value: forecast.expected_inflows, color: '#10B981' },
              { label: 'Expected Out', value: forecast.expected_outflows, color: '#EF4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={statBox}>
                <p style={statLabel}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color, margin: 0 }}>{formatNaira(value)}</p>
              </div>
            ))}
          </div>

          {/* Running balance area chart */}
          {forecastChart.length > 1 && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={forecastChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fcastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: CHART_THEME.label, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: CHART_THEME.label, fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip content={<MoneyTooltip />} />
                  <Area type="monotone" dataKey="balance" name="Balance" stroke="#8B5CF6" strokeWidth={2} fill="url(#fcastGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Upcoming events */}
          {forecast.items.length > 0 ? (
            <>
              <p style={{ ...statLabel, marginBottom: 'var(--space-3)' }}>Upcoming Events</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {forecast.items.slice(0, 8).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.direction === 'in' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                      {item.direction === 'in' ? <TrendingUp size={12} style={{ color: '#10B981' }} /> : <TrendingDown size={12} style={{ color: '#EF4444' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{item.description}</p>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>{item.date}</p>
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: item.direction === 'in' ? '#10B981' : '#EF4444', flexShrink: 0, margin: 0 }}>
                      {item.direction === 'in' ? '+' : '−'}{formatNaira(item.expected_amount)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)', margin: 0 }}>
              No upcoming expected events in the next 30 days.
            </p>
          )}
        </motion.div>
      )}

      {/* ══ QUICK LINKS ═════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)' }}>
        {[
          { label: 'Transactions', href: '/personal/transactions', color: '#A78BFA', desc: 'Add income & expenses' },
          { label: 'Savings Goals', href: '/personal/savings', color: '#34D399', desc: 'Track your goals' },
          { label: 'Loan Tracker', href: '/personal/loans', color: '#F59E0B', desc: 'Debts & lending' },
          { label: 'Analytics', href: '/personal/analytics', color: '#60A5FA', desc: 'AI insights & charts' },
        ].map(({ label, href, color, desc }) => (
          <Link key={label} href={href} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-4)', borderRadius: 14, textDecoration: 'none',
            background: `${color}10`, border: `1px solid ${color}22`,
          }}>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color, margin: 0 }}>{label}</p>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
            </div>
            <ArrowRight size={14} style={{ color, flexShrink: 0 }} />
          </Link>
        ))}
      </motion.div>

      {/* ══ SET BALANCE MODAL ═══════════════════════════════════════ */}
      <Modal isOpen={showSetBalance} onClose={() => setShowSetBalance(false)} title="Set Personal Opening Balance"
        footer={<>
          <button className="btn-ghost" onClick={() => setShowSetBalance(false)}>Cancel</button>
          <button className="btn-primary" form="personal-ob-form" type="submit" disabled={saving}>
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />} Confirm
          </button>
        </>}>
        <form id="personal-ob-form" onSubmit={handleSetBalance}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
            Enter how much cash you currently have. Every income and expense you record will update this balance in real time.
          </p>
          <CurrencyInput label="Current Personal Cash" value={obAmount} onChange={setObAmount} />
        </form>
      </Modal>

      {/* ══ SET BUDGETS MODAL ═══════════════════════════════════════ */}
      <Modal isOpen={showSetBudgets} onClose={() => setShowSetBudgets(false)} title="Set Monthly Category Budgets"
        footer={<>
          <button className="btn-ghost" onClick={() => setShowSetBudgets(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveBudgetModal}>Save Budgets</button>
        </>}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
          Set monthly spending limits per category. These are saved locally and used to track budget vs. actual spending.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Object.keys(CATEGORY_COLORS).map((cat) => (
            <CurrencyInput
              key={cat}
              label={cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              value={budgetDraft[cat] ?? 0}
              onChange={(v) => setBudgetDraft((prev) => ({ ...prev, [cat]: v }))}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
}
