'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { analyticsApi } from '@/lib/api/analytics';
import { repairsApi } from '@/lib/api/repairs';
import { StatWidget } from '@/components/shared/StatWidget';
import { useLowStock } from '@/lib/hooks/useLowStock';
import { RevenueAreaChart } from '@/components/charts/RevenueAreaChart';
import { ExpensePieChart } from '@/components/charts/ExpensePieChart';
import { formatNaira } from '@/lib/format';
import { stagger, fadeUp, scrollFadeUp } from '@/lib/motion-variants';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from 'date-fns';
import { useAuthStore } from '@/lib/stores/authStore';
import { ChevronRight, Wrench, Target, AlertTriangle, HandCoins, Package, TrendingDown } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import Link from 'next/link';
import { InsightsCard } from '@/components/shared/InsightsCard';
import { RepairJobCard } from '@/components/business/RepairJobCard';
import { useRouter } from 'next/navigation';

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

function SectionTitle({ children, accent = '#C8102E' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />
      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {children}
      </p>
    </div>
  );
}

export default function BusinessDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const { start, end } = getPeriodDates(period);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['business-summary', start, end],
    queryFn: () => analyticsApi.businessSummary({ period_start: start, period_end: end }),
  });
  const qc = useQueryClient();
  const { data: trendData } = useQuery({
    queryKey: ['revenue-trend', start, end],
    queryFn: () => analyticsApi.revenueTrend({ period_start: start, period_end: end }),
  });
  const { data: expenseBreakdown } = useQuery({
    queryKey: ['expense-breakdown', start, end],
    queryFn: () => analyticsApi.expenseBreakdown({ period_start: start, period_end: end }),
  });
  const { data: recentJobsData } = useQuery({
    queryKey: ['repairs', 'recent'],
    queryFn: () => repairsApi.list({ size: 5 }),
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const { data: monthlyGoal } = useQuery({
    queryKey: ['monthlyGoal', currentMonth, currentYear],
    queryFn: () => analyticsApi.getMonthlyGoal({ month: currentMonth, year: currentYear }),
  });

  const [editGoalOpen, setEditGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ revenue_target: 0, profit_target: 0 });
  const [savingGoal, setSavingGoal] = useState(false);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoal(true);
    try {
      await analyticsApi.updateMonthlyGoal(currentMonth, currentYear, goalForm);
      qc.invalidateQueries({ queryKey: ['monthlyGoal'] });
      setEditGoalOpen(false);
    } catch { } finally {
      setSavingGoal(false);
    }
  };

  const { count: lowStockCount, items: lowStockItems } = useLowStock();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isLoss = summary ? summary.net_profit < 0 : false;
  const recentJobs = recentJobsData?.items ?? [];

  // Live clock for ATM card display
  const [clock, setClock] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const clockTime = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const clockDate = format(clock, 'dd MMM').toUpperCase();
  const cardExpiry = format(clock, 'MM/yy');

  return (
    <div>
      {/* ── Greeting ────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ marginBottom: 'var(--space-5)' }}>
        <p style={{
          fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {greeting}
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)', fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.01em',
        }}>
          {user?.name?.split(' ')[0] ?? 'Welcome'}
        </h2>
      </motion.div>

      {/* ── Low-stock alert ─────────────────────────────────────── */}
      {lowStockCount > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 'var(--space-3)', flexWrap: 'wrap',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderLeft: '3px solid var(--accent-amber)',
            borderRadius: 12, padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-amber)' }}>
                {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} running low
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>
                {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}{lowStockCount > 3 ? ` +${lowStockCount - 3} more` : ''}
              </p>
            </div>
          </div>
          <Link href="/business/inventory" style={{
            fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-amber)',
            textDecoration: 'none', whiteSpace: 'nowrap',
            padding: '4px 12px', borderRadius: 20,
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)',
          }}>
            Restock →
          </Link>
        </motion.div>
      )}

      {/* ── Period selector ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 5, marginBottom: 'var(--space-5)',
        overflowX: 'auto', scrollbarWidth: 'none',
        paddingBottom: 2,
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '6px 16px', borderRadius: 20,
              border: period === p.key ? 'none' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.02em',
              background: period === p.key ? '#C8102E' : 'transparent',
              color: period === p.key ? '#fff' : 'var(--text-muted)',
              boxShadow: period === p.key ? '0 2px 10px rgba(200,16,46,0.38)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)', flexShrink: 0,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── ATM Card Hero ────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ marginBottom: 'var(--space-5)', perspective: '1000px' }}>

        <div className="atm-card" style={{
          background: isLoss
            ? 'linear-gradient(145deg, #1a0000 0%, #3D0000 40%, #700010 100%)'
            : 'linear-gradient(145deg, #280008 0%, #6B0016 35%, #C8102E 75%, #D62035 100%)',
          boxShadow: isLoss
            ? '0 20px 56px rgba(239,68,68,0.32), 0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 20px 56px rgba(200,16,46,0.42), 0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}>
          <div className="atm-card-shimmer" />
          <div className="atm-card-texture" />

          {/* Corner radial light */}
          <div style={{
            position: 'absolute', top: '-35%', right: '-15%',
            width: '55%', height: '100%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.14) 0%, transparent 60%)',
            pointerEvents: 'none', zIndex: 1,
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', left: '-5%',
            width: '35%', height: '60%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 1,
          }} />

          <div className="atm-card-inner">

            {/* Row 1: Chip + Brand */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="atm-chip" />
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.72rem',
                  fontWeight: 800, color: 'rgba(255,255,255,0.75)',
                  letterSpacing: '0.05em',
                }}>
                  Dash & Co.
                </p>
                <p style={{
                  fontSize: '0.52rem', color: 'rgba(255,255,255,0.38)',
                  letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2,
                }}>
                  Business
                </p>
              </div>
            </div>

            {/* Row 2: Balance */}
            <div>
              <p className="atm-balance-label">Available Balance</p>
              {isLoading ? (
                <div className="skeleton" style={{
                  height: '2.6rem', width: '62%',
                  background: 'rgba(255,255,255,0.14)', marginTop: 8, borderRadius: 8,
                }} />
              ) : (
                <p className="atm-balance-amount">
                  {summary ? formatNaira(summary.available_balance) : '—'}
                </p>
              )}
            </div>

            {/* Row 3: Expiry + Live clock  */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              {/* Left — card-style expiry date */}
              <div>
                <p style={{
                  fontSize: '0.47rem', color: 'rgba(255,255,255,0.38)',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  fontWeight: 700, marginBottom: 3,
                }}>
                  Valid Thru
                </p>
                <p className="atm-card-number" style={{ fontSize: 13, letterSpacing: '0.22em' }}>
                  {cardExpiry}
                </p>
              </div>

              {/* Right — live date + time */}
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontSize: '0.47rem', color: 'rgba(255,255,255,0.38)',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  fontWeight: 700, marginBottom: 3,
                }}>
                  {clockDate}
                </p>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(1rem, 4vw, 1.35rem)',
                  fontWeight: 700, color: 'rgba(255,255,255,0.88)',
                  letterSpacing: '0.06em', lineHeight: 1,
                }}>
                  {isLoss ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'rgba(239,68,68,0.22)', border: '1px solid rgba(239,68,68,0.4)',
                      borderRadius: 8, padding: '3px 9px',
                      fontSize: '0.55rem', fontWeight: 800, color: '#EF4444',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      <TrendingDown size={9} />
                      Loss
                    </span>
                  ) : clockTime}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats tray */}
        <div className="atm-stats-tray">
          {[
            { label: 'Revenue', value: summary?.total_revenue, color: 'var(--text-primary)' },
            { label: 'Expenses', value: summary?.total_expenses, color: 'var(--accent-red)' },
            {
              label: isLoss ? 'Loss' : 'Net Profit',
              value: summary ? Math.abs(summary.net_profit) : undefined,
              color: isLoss ? 'var(--accent-red)' : 'var(--accent-green)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="atm-stat-cell">
              <p style={{
                fontSize: '0.57rem', color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                fontWeight: 700, marginBottom: 5,
              }}>
                {label}
              </p>
              {isLoading ? (
                <div className="skeleton" style={{ height: '0.9rem', width: '82%', borderRadius: 4 }} />
              ) : (
                <p className="atm-stat-value" style={{ color }}>
                  {value != null ? formatNaira(value) : '—'}
                </p>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── AI Insights ─────────────────────────────────────────── */}
      <InsightsCard
        summary={summary as any ?? null}
        period={period === 'week' ? 'This Week' : period === 'year' ? 'This Year' : 'This Month'}
      />

      {/* ── Quick stat grid ──────────────────────────────────────── */}
      <motion.div variants={stagger} initial="initial" animate="animate"
        className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <StatWidget
          label="Tithe Due"
          value={summary ? formatNaira(summary.tithe_due) : '—'}
          numericValue={summary?.tithe_due}
          numericFormat="currency"
          accent="warning"
          icon={<HandCoins size={14} />}
          loading={isLoading}
        />
        <StatWidget
          label="Pending Jobs"
          value={summary ? String(summary.pending_jobs) : '—'}
          numericValue={summary?.pending_jobs}
          numericFormat="number"
          accent="neutral"
          icon={<Wrench size={14} />}
          loading={isLoading}
        />
        <StatWidget
          label="Inventory Value"
          value={summary ? formatNaira(summary.inventory_value) : '—'}
          numericValue={summary?.inventory_value}
          numericFormat="currency"
          accent="investment"
          icon={<Package size={14} />}
          loading={isLoading}
        />
        <StatWidget
          label="Low Stock"
          value={summary ? String(summary.low_stock_count) : '—'}
          numericValue={summary?.low_stock_count}
          numericFormat="number"
          accent={summary && summary.low_stock_count > 5 ? 'loss' : 'warning'}
          icon={<AlertTriangle size={14} />}
          loading={isLoading}
        />
      </motion.div>

      {/* ── Monthly Goals ────────────────────────────────────────── */}
      {period === 'month' && monthlyGoal && (monthlyGoal.revenue_target > 0 || monthlyGoal.profit_target > 0) && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 20, padding: 'var(--space-5)',
            marginBottom: 'var(--space-4)',
            border: '1px solid var(--border-subtle)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <SectionTitle>Monthly Goals — {format(new Date(), 'MMMM')}</SectionTitle>
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 12px' }} onClick={() => {
              setGoalForm({ revenue_target: Number(monthlyGoal.revenue_target), profit_target: Number(monthlyGoal.profit_target) });
              setEditGoalOpen(true);
            }}>
              Edit
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {monthlyGoal.revenue_target > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Revenue</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {summary ? formatNaira(summary.total_revenue) : '₦0'} / {formatNaira(monthlyGoal.revenue_target)}
                  </p>
                </div>
                <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #C8102E, #E8183A)',
                    width: `${Math.min(100, (Number(summary?.total_revenue || 0) / Number(monthlyGoal.revenue_target)) * 100)}%`,
                    borderRadius: 3, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )}

            {monthlyGoal.profit_target > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Profit</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {summary ? formatNaira(Math.abs(summary.net_profit)) : '₦0'} / {formatNaira(monthlyGoal.profit_target)}
                  </p>
                </div>
                <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #10B981, #34D399)',
                    width: `${Math.min(100, (Number(summary?.net_profit || 0) / Number(monthlyGoal.profit_target)) * 100)}%`,
                    borderRadius: 3, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Edit Goals Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={editGoalOpen}
        onClose={() => setEditGoalOpen(false)}
        title="Set Monthly Goals"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditGoalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveGoal} disabled={savingGoal}>Save Goals</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Revenue Target</label>
            <CurrencyInput value={goalForm.revenue_target} onChange={v => setGoalForm(f => ({ ...f, revenue_target: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Profit Target</label>
            <CurrencyInput value={goalForm.profit_target} onChange={v => setGoalForm(f => ({ ...f, profit_target: v }))} />
          </div>
        </div>
      </Modal>

      {/* ── Set Goals Prompt ─────────────────────────────────────── */}
      {period === 'month' && monthlyGoal && monthlyGoal.revenue_target == 0 && monthlyGoal.profit_target == 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 20, padding: 'var(--space-5)',
            marginBottom: 'var(--space-4)',
            border: '1px dashed var(--border-subtle)',
            textAlign: 'center',
          }}>
          <Target size={24} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-3)' }} />
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Set a Monthly Goal</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Track your progress towards revenue and profit targets.
          </p>
          <button className="btn-primary" onClick={() => { setGoalForm({ revenue_target: 0, profit_target: 0 }); setEditGoalOpen(true); }}>
            Set Goals
          </button>
        </motion.div>
      )}

      {/* ── Revenue chart ────────────────────────────────────────── */}
      {trendData && trendData.length > 0 && (
        <motion.div {...scrollFadeUp}
          style={{
            background: 'var(--bg-surface)', borderRadius: 20,
            padding: 'var(--space-5)', marginBottom: 'var(--space-4)',
            border: '1px solid var(--border-subtle)',
          }}>
          <SectionTitle>Revenue vs Expenses</SectionTitle>
          <RevenueAreaChart data={trendData} />
        </motion.div>
      )}

      {/* ── Recent repairs ───────────────────────────────────────── */}
      <motion.div {...scrollFadeUp}
        style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          border: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-4)', overflow: 'hidden',
        }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <SectionTitle>Recent Jobs</SectionTitle>
          <Link href="/business/repairs" style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 'var(--text-xs)', color: '#C8102E',
            textDecoration: 'none', fontWeight: 700,
          }}>
            See all <ChevronRight size={13} />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No repair jobs yet
          </div>
        ) : (
          recentJobs.map((job, i) => (
            <RepairJobCard
              key={job.id}
              job={job}
              onClick={(j) => router.push(`/business/repairs/${j.id}`)}
              showBorder={i < recentJobs.length - 1}
            />
          ))
        )}
      </motion.div>

      {/* ── Expense breakdown ────────────────────────────────────── */}
      {expenseBreakdown && expenseBreakdown.length > 0 && (
        <motion.div {...scrollFadeUp}
          style={{
            background: 'var(--bg-surface)', borderRadius: 20,
            padding: 'var(--space-5)',
            border: '1px solid var(--border-subtle)',
          }}>
          <SectionTitle>Expense Breakdown</SectionTitle>
          <ExpensePieChart data={expenseBreakdown} />
        </motion.div>
      )}
    </div>
  );
}
