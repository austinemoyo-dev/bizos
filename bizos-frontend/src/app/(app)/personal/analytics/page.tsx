'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, PersonalSpendingPoint, PersonalCategoryItem } from '@/lib/api/analytics';
import { ComparisonLineChart, ComparisonPoint } from '@/components/charts/ComparisonLineChart';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatWidget } from '@/components/shared/StatWidget';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatNaira } from '@/lib/format';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, startOfYear, endOfYear,
} from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, Utensils, Car, Wifi, Phone, Receipt, Coins, HelpCircle } from 'lucide-react';

// ── Period definitions ──────────────────────────────────────────────
type PeriodKey = 'this_week' | 'this_month' | 'last_month' | 'year';

function fmt(d: Date) { return format(d, 'yyyy-MM-dd'); }

function getPeriod(key: PeriodKey) {
  const now = new Date();
  switch (key) {
    case 'this_week': return { start: fmt(startOfWeek(now, { weekStartsOn: 1 })), end: fmt(endOfWeek(now, { weekStartsOn: 1 })), label: 'This Week' };
    case 'this_month': return { start: fmt(startOfMonth(now)), end: fmt(endOfMonth(now)), label: 'This Month' };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { start: fmt(startOfMonth(lm)), end: fmt(endOfMonth(lm)), label: 'Last Month' };
    }
    case 'year': return { start: fmt(startOfYear(now)), end: fmt(endOfYear(now)), label: 'This Year' };
  }
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'this_week', label: 'Week' },
  { key: 'this_month', label: 'Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'year', label: 'Year' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils,
  transport: Car,
  data: Wifi,
  airtime: Phone,
  bills: Receipt,
  savings: PiggyBank,
  tithe: Coins,
  salary: Wallet,
  side_income: TrendingUp,
  gift: Coins,
};

const CATEGORY_COLORS: string[] = [
  '#C8102E', '#D4A535', '#8B5CF6', '#06B6D4', '#F59E0B',
  '#10B981', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6',
];

export default function PersonalAnalyticsPage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('this_month');
  const period = getPeriod(periodKey);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['personal-summary', period.start, period.end],
    queryFn: () => analyticsApi.personalSummary({ period_start: period.start, period_end: period.end }),
  });

  const { data: trend, isLoading: loadingTrend } = useQuery({
    queryKey: ['personal-spending-trend', period.start, period.end],
    queryFn: () => analyticsApi.personalSpendingTrend({ period_start: period.start, period_end: period.end }),
  });

  const { data: expenseBreakdown } = useQuery({
    queryKey: ['personal-category-breakdown', 'expense', period.start, period.end],
    queryFn: () => analyticsApi.personalCategoryBreakdown({ period_start: period.start, period_end: period.end, tx_type: 'expense' }),
  });

  const { data: incomeBreakdown } = useQuery({
    queryKey: ['personal-category-breakdown', 'income', period.start, period.end],
    queryFn: () => analyticsApi.personalCategoryBreakdown({ period_start: period.start, period_end: period.end, tx_type: 'income' }),
  });

  // Transform trend data for chart
  const chartData: ComparisonPoint[] = useMemo(() => {
    if (!trend) return [];
    return trend.map((t) => ({
      label: format(new Date(t.date), 'dd MMM'),
      current: t.income,
      previous: t.expenses,
    }));
  }, [trend]);

  const totalIncome = summary?.total_income ?? 0;
  const totalExpenses = summary?.total_expenses ?? 0;
  const net = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(0) : '0';

  const topCategory = expenseBreakdown?.[0]?.category ?? '—';
  const expenseTotal = expenseBreakdown?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const incomeTotal = incomeBreakdown?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Personal Analytics" subtitle="Understand where your money goes" />

      {/* Period selector */}
      <div style={{
        display: 'inline-flex', gap: 3, padding: 3, borderRadius: 50,
        background: 'var(--glass-bg-light)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        alignSelf: 'flex-start',
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodKey(p.key)}
            style={{
              padding: '7px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 600,
              background: periodKey === p.key ? 'var(--accent-gold)' : 'transparent',
              color: periodKey === p.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: periodKey === p.key ? '0 2px 8px rgba(212,165,53,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }} className="stat-grid">
        <StatWidget label="Income" value={formatNaira(totalIncome)} accent="profit" loading={loadingSummary} />
        <StatWidget label="Expenses" value={formatNaira(totalExpenses)} accent="loss" loading={loadingSummary} />
        <StatWidget label="Net" value={formatNaira(Math.abs(net))} accent={net >= 0 ? 'profit' : 'loss'}
          sublabel={net >= 0 ? 'Surplus' : 'Deficit'} loading={loadingSummary} />
        <StatWidget label="Savings Rate" value={`${savingsRate}%`} accent="neutral"
          sublabel={`of income saved`} loading={loadingSummary} />
      </div>

      {/* Income vs Expense Trend Chart */}
      <div className="liquid-card" style={{ padding: 'var(--space-5)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Income vs Expenses</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{period.label} · Day by day</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent-green)' }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Income</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent-red)' }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Expenses</span>
              </div>
            </div>
          </div>

          {loadingTrend ? (
            <Skeleton width="100%" height={200} />
          ) : chartData.length > 0 ? (
            <ComparisonLineChart
              data={chartData}
              currentLabel="Income"
              previousLabel="Expenses"
              height={220}
            />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No data for this period
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdowns - side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }} className="stat-grid">
        {/* Expense Breakdown */}
        <div className="liquid-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>Where Money Goes</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Expense categories</p>

            {!expenseBreakdown || expenseBreakdown.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6) 0' }}>No expenses this period</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {expenseBreakdown.map((cat, idx) => {
                  const Icon = CATEGORY_ICONS[cat.category] || HelpCircle;
                  const pct = expenseTotal > 0 ? ((cat.amount / expenseTotal) * 100).toFixed(0) : '0';
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `${color}18`,
                          }}>
                            <Icon size={14} style={{ color }} />
                          </div>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, textTransform: 'capitalize' }}>
                            {cat.category.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                            {formatNaira(cat.amount)}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 6 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Income Breakdown */}
        <div className="liquid-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>Income Sources</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Where money comes from</p>

            {!incomeBreakdown || incomeBreakdown.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6) 0' }}>No income this period</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {incomeBreakdown.map((cat, idx) => {
                  const Icon = CATEGORY_ICONS[cat.category] || Wallet;
                  const pct = incomeTotal > 0 ? ((cat.amount / incomeTotal) * 100).toFixed(0) : '0';
                  const color = CATEGORY_COLORS[(idx + 5) % CATEGORY_COLORS.length];
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `${color}18`,
                          }}>
                            <Icon size={14} style={{ color }} />
                          </div>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, textTransform: 'capitalize' }}>
                            {cat.category.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                            {formatNaira(cat.amount)}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 6 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top spending category highlight */}
      {expenseBreakdown && expenseBreakdown.length > 0 && (
        <div className="liquid-card" style={{
          padding: 'var(--space-4) var(--space-5)',
          background: 'linear-gradient(135deg, rgba(200,16,46,0.06), rgba(200,16,46,0.01))',
        }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 14, background: 'rgba(200,16,46,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingDown size={20} style={{ color: 'var(--accent-red)' }} />
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>TOP SPENDING CATEGORY</p>
              <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, textTransform: 'capitalize' }}>
                {topCategory.replace('_', ' ')} — {formatNaira(expenseBreakdown[0]?.amount ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
