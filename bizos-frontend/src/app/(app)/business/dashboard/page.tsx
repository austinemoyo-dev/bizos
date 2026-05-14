'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { analyticsApi } from '@/lib/api/analytics';
import { repairsApi } from '@/lib/api/repairs';
import { StatWidget } from '@/components/shared/StatWidget';
import { useLowStock } from '@/lib/hooks/useLowStock';
import { RevenueAreaChart } from '@/components/charts/RevenueAreaChart';
import { ExpensePieChart } from '@/components/charts/ExpensePieChart';
import { formatNaira, formatCompact, formatProfit } from '@/lib/format';
import { stagger, fadeUp, scrollFadeUp } from '@/lib/motion-variants';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from 'date-fns';
import { useAuthStore } from '@/lib/stores/authStore';
import { ChevronRight, Wrench, Target, TrendingDown } from 'lucide-react';
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
    } catch (err) {
      // toast err
    } finally {
      setSavingGoal(false);
    }
  };

  const { count: lowStockCount, items: lowStockItems } = useLowStock();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isLoss     = summary ? summary.net_profit < 0 : false;
  const profitInfo = summary ? formatProfit(summary.net_profit) : null;
  const recentJobs = recentJobsData?.items ?? [];

  return (
    <div>
      {/* Greeting */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ marginBottom: 'var(--space-5)' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {greeting}
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
          {user?.name?.split(' ')[0] ?? 'Welcome'}
        </h2>
      </motion.div>

      {/* Low-stock alert banner */}
      {lowStockCount > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 'var(--space-3)', flexWrap: 'wrap',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12, padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-amber)' }}>
                {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} running low
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}{lowStockCount > 3 ? ` +${lowStockCount - 3} more` : ''}
              </p>
            </div>
          </div>
          <Link href="/business/inventory" style={{
            fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-amber)',
            textDecoration: 'none', whiteSpace: 'nowrap',
            padding: '5px 12px', borderRadius: 20,
            border: '1px solid rgba(245,158,11,0.4)',
          }}>
            View Low Stock →
          </Link>
        </motion.div>
      )}

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-4)' }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.02em',
              background: period === p.key ? '#C8102E' : 'var(--bg-elevated)',
              color: period === p.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: period === p.key ? '0 2px 8px rgba(200,16,46,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Hero revenue card */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        className={isLoss ? 'hero-card-loss' : ''}
        style={{
          background: isLoss
            ? 'linear-gradient(135deg, #1a0000 0%, #4a0000 55%, #700010 100%)'
            : 'linear-gradient(135deg, #8B0018 0%, #C8102E 60%, #E8183A 100%)',
          borderRadius: 20, padding: 'var(--space-6)',
          marginBottom: 'var(--space-4)',
          position: 'relative', overflow: 'hidden',
          boxShadow: isLoss
            ? '0 8px 32px rgba(239,68,68,0.28)'
            : '0 8px 32px rgba(200,16,46,0.4)',
          transition: 'background 0.5s ease, box-shadow 0.5s ease',
        }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        {/* Top-left shine */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '55%', height: '50%', background: 'radial-gradient(ellipse at 10% 10%, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Loss badge */}
        {isLoss && (
          <div className="hero-loss-badge">
            <TrendingDown size={11} />
            Loss
          </div>
        )}
        <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
          Total Revenue
        </p>
        {isLoading ? (
          <div className="skeleton" style={{ height: '2.5rem', width: '60%', background: 'rgba(255,255,255,0.2)' }} />
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.6rem, 5vw, 2.5rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            {summary ? formatNaira(summary.total_revenue) : '—'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.55)' }}>Expenses</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
              {summary ? formatNaira(summary.total_expenses) : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.55)' }}>Net {profitInfo?.label ?? 'Profit'}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#fff', fontWeight: 700 }}>
              {summary ? formatNaira(Math.abs(summary.net_profit)) : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.55)' }}>Money Available</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
              {summary ? formatNaira(summary.available_balance) : '—'}
            </p>
          </div>
        </div>
        <Link href="/business/analytics" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 'var(--space-4)', padding: '7px 14px',
          background: 'rgba(255,255,255,0.12)', borderRadius: 20,
          fontSize: '0.7rem', fontWeight: 700, color: '#fff',
          textDecoration: 'none', letterSpacing: '0.04em',
          transition: 'background 0.15s',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          View full analytics →
        </Link>
      </motion.div>

      {/* AI Insights */}
      <InsightsCard summary={summary as any ?? null} period={period === 'week' ? 'This Week' : period === 'year' ? 'This Year' : 'This Month'} />

      {/* Quick stat row */}
      <motion.div variants={stagger} initial="initial" animate="animate" className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <StatWidget
          label="Tithe Due"
          value={summary ? formatNaira(summary.tithe_due) : '—'}
          numericValue={summary?.tithe_due}
          numericFormat="currency"
          accent="warning"
          loading={isLoading}
        />
        <StatWidget
          label="Pending Jobs"
          value={summary ? String(summary.pending_jobs) : '—'}
          numericValue={summary?.pending_jobs}
          numericFormat="number"
          accent="neutral"
          loading={isLoading}
        />
        <StatWidget
          label="Inventory Value"
          value={summary ? formatNaira(summary.inventory_value) : '—'}
          numericValue={summary?.inventory_value}
          numericFormat="currency"
          accent="neutral"
          loading={isLoading}
        />
        <StatWidget
          label="Low Stock"
          value={summary ? String(summary.low_stock_count) : '—'}
          numericValue={summary?.low_stock_count}
          numericFormat="number"
          accent={summary && summary.low_stock_count > 5 ? 'loss' : 'warning'}
          loading={isLoading}
        />
      </motion.div>

      {/* Monthly Goals Progress */}
      {period === 'month' && monthlyGoal && (monthlyGoal.revenue_target > 0 || monthlyGoal.profit_target > 0) && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 'var(--space-5)', marginBottom: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Target size={15} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Monthly Goals ({format(new Date(), 'MMMM')})</span>
            </div>
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }} onClick={() => {
              setGoalForm({ revenue_target: Number(monthlyGoal.revenue_target), profit_target: Number(monthlyGoal.profit_target) });
              setEditGoalOpen(true);
            }}>
              Edit Goals
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {monthlyGoal.revenue_target > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Revenue Target</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {summary ? formatNaira(summary.total_revenue) : '₦0'} / {formatNaira(monthlyGoal.revenue_target)}
                  </p>
                </div>
                <div style={{ height: 8, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--accent-primary)', 
                    width: `${Math.min(100, (Number(summary?.total_revenue || 0) / Number(monthlyGoal.revenue_target)) * 100)}%`,
                    borderRadius: 4
                  }} />
                </div>
              </div>
            )}
            
            {monthlyGoal.profit_target > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Profit Target</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {summary ? formatNaira(Math.abs(summary.net_profit)) : '₦0'} / {formatNaira(monthlyGoal.profit_target)}
                  </p>
                </div>
                <div style={{ height: 8, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--accent-green)', 
                    width: `${Math.min(100, (Number(summary?.net_profit || 0) / Number(monthlyGoal.profit_target)) * 100)}%`,
                    borderRadius: 4
                  }} />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Edit Goals Modal */}
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

      {/* Set Goals Prompt (if none set) */}
      {period === 'month' && monthlyGoal && monthlyGoal.revenue_target == 0 && monthlyGoal.profit_target == 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 'var(--space-5)', marginBottom: 'var(--space-4)', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
          <Target size={24} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-3)' }} />
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Set a Monthly Goal</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Track your progress towards revenue and profit targets.</p>
          <button className="btn-primary" onClick={() => {
            setGoalForm({ revenue_target: 0, profit_target: 0 });
            setEditGoalOpen(true);
          }}>
            Set Goals
          </button>
        </motion.div>
      )}

      {/* Revenue chart */}
      {trendData && trendData.length > 0 && (
        <motion.div {...scrollFadeUp}
          style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 'var(--space-5)', marginBottom: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>
            Revenue vs Expenses
          </p>
          <RevenueAreaChart data={trendData} />
        </motion.div>
      )}

      {/* Recent repairs */}
      <motion.div {...scrollFadeUp}
        style={{ background: 'var(--bg-surface)', borderRadius: 20, border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Wrench size={15} style={{ color: '#C8102E' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Recent Jobs</span>
          </div>
          <Link href="/business/repairs" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 'var(--text-xs)', color: '#C8102E', textDecoration: 'none', fontWeight: 600 }}>
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

      {/* Expense breakdown */}
      {expenseBreakdown && expenseBreakdown.length > 0 && (
        <motion.div {...scrollFadeUp}
          style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 'var(--space-5)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>
            Expense Breakdown
          </p>
          <ExpensePieChart data={expenseBreakdown} />
        </motion.div>
      )}

    </div>
  );
}
