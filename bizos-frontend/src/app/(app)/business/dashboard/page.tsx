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
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, endOfYear, subMonths,
} from 'date-fns';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  ChevronRight, Wrench, Target, AlertTriangle,
  HandCoins, Package, TrendingDown, LineChart,
  Bell, ShoppingCart, Users, BarChart2, MoreHorizontal,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import Link from 'next/link';
import { InsightsCard } from '@/components/shared/InsightsCard';
import { useRouter } from 'next/navigation';

type Period = 'week' | 'month' | 'last_month' | 'year';

function getPeriodDates(period: Period) {
  const now = new Date();
  if (period === 'week')
    return { start: format(startOfWeek(now), 'yyyy-MM-dd'), end: format(endOfWeek(now), 'yyyy-MM-dd') };
  if (period === 'year')
    return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
  if (period === 'last_month') {
    const lm = subMonths(now, 1);
    return { start: format(startOfMonth(lm), 'yyyy-MM-dd'), end: format(endOfMonth(lm), 'yyyy-MM-dd') };
  }
  return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week',       label: 'Week'       },
  { key: 'month',      label: 'Month'      },
  { key: 'last_month', label: 'Last'       },
  { key: 'year',       label: 'Year'       },
];

const AVATAR_COLORS = [
  '#8B0018','#0E7490','#6D28D9','#B45309','#065F46',
  '#7C3AED','#DC2626','#0369A1','#15803D','#92400E',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function BusinessDashboard() {
  const { user } = useAuthStore();
  const router   = useRouter();
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
    queryFn: () => repairsApi.list({ size: 10 }),
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();
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

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isLoss   = summary ? summary.net_profit < 0 : false;
  const recentJobs = recentJobsData?.items ?? [];

  // Deduplicated recent contacts from repair jobs
  const recentContacts = Array.from(
    new Map(recentJobs.map(j => [j.customer_name, j])).values()
  ).slice(0, 8);

  // Pending jobs for scheduled-payments style scroll
  const pendingJobs = recentJobs.filter(j =>
    j.status === 'received' || j.status === 'diagnosed' || j.status === 'in_progress'
  ).slice(0, 6);

  // Live clock
  const [clock, setClock] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const cardExpiry = format(clock, 'MM/yy');

  return (
    <div>
      {/* ── Mobile greeting header (replaces TopBar on mobile) ─── */}
      <div className="dash-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #8B0018, #5C000F)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.72rem', fontWeight: 800,
            boxShadow: '0 4px 12px rgba(139,0,24,0.4)',
            letterSpacing: '0.02em',
          }}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
              {greeting}
            </p>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1,
              letterSpacing: '-0.01em',
            }}>
              {user?.name?.split(' ')[0] ?? 'Welcome'} 👋
            </p>
          </div>
        </div>
        <button style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--bg-surface)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <Bell size={16} />
        </button>
      </div>

      {/* ── Desktop greeting ─────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        className="dash-desktop-greeting"
        style={{ marginBottom: 'var(--space-4)' }}>
        <style>{`.dash-desktop-greeting{display:block}@media(max-width:767px){.dash-desktop-greeting{display:none}}`}</style>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {greeting}
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
          fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em',
        }}>
          {user?.name?.split(' ')[0] ?? 'Welcome'}
        </h2>
      </motion.div>

      {/* ── Low-stock alert ───────────────────────────────────── */}
      {lowStockCount > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
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
                {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}
                {lowStockCount > 3 ? ` +${lowStockCount - 3} more` : ''}
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

      {/* ── Period tabs — reference pill style ────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 'var(--space-4)' }}>
        <div className="period-tabs" style={{ flex: 1 }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`period-tab${period === p.key ? ' active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Link href="/business/analytics" style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          fontSize: 'var(--text-xs)', fontWeight: 700, color: '#8B0018',
          textDecoration: 'none',
          padding: '6px 12px', borderRadius: 20,
          border: '1px solid rgba(139,0,24,0.25)',
          background: 'rgba(139,0,24,0.07)',
          whiteSpace: 'nowrap',
        }}>
          <LineChart size={12} />
          Analytics
        </Link>
      </motion.div>

      {/* ── Total Balance block ───────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        className="dash-balance-block">
        <p className="dash-balance-label">Total Revenue</p>
        {isLoading ? (
          <div className="skeleton" style={{ height: '2.8rem', width: '55%', borderRadius: 8 }} />
        ) : (
          <p className="dash-balance-amount">
            {summary ? formatNaira(summary.total_revenue) : '—'}
          </p>
        )}
      </motion.div>

      {/* ── ATM Card ─────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ marginBottom: 0, perspective: '1000px' }}>

        <div className="atm-card" style={{
          background: isLoss
            ? 'linear-gradient(145deg, #0A0A0A 0%, #1A0000 40%, #3D0808 100%)'
            : 'linear-gradient(145deg, #061206 0%, #0D2410 35%, #1A4020 65%, #1E5028 100%)',
          boxShadow: isLoss
            ? '0 20px 56px rgba(239,68,68,0.22), 0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)'
            : '0 20px 56px rgba(34,197,94,0.12), 0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.09)',
        }}>
          <div className="atm-card-shimmer" />
          <div className="atm-card-texture" />

          {/* Corner radial lights */}
          <div style={{
            position: 'absolute', top: '-35%', right: '-15%',
            width: '55%', height: '100%',
            background: 'radial-gradient(ellipse, rgba(34,197,94,0.10) 0%, transparent 60%)',
            pointerEvents: 'none', zIndex: 1,
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', left: '-5%',
            width: '35%', height: '60%',
            background: 'radial-gradient(ellipse, rgba(212,165,53,0.06) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 1,
          }} />

          <div className="atm-card-inner">
            {/* Row 1: Chip + Mastercard circles */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="atm-chip" />
              {/* Mastercard circles */}
              <div className="mc-circles">
                <div className="mc-circle-left" />
                <div className="mc-circle-right" />
              </div>
            </div>

            {/* Row 2: Card number + Dash brand */}
            <div>
              <p className="atm-card-number">•••• •••• •••• 8934</p>
            </div>

            {/* Row 3: Cardholder + Expiry */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontSize: '0.47rem', color: 'rgba(255,255,255,0.38)',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  fontWeight: 700, marginBottom: 3,
                }}>
                  Card Holder
                </p>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: 13,
                  fontWeight: 700, color: 'rgba(255,255,255,0.82)',
                  letterSpacing: '0.04em',
                }}>
                  {user?.name ?? 'Dash & Co.'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontSize: '0.47rem', color: 'rgba(255,255,255,0.38)',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  fontWeight: 700, marginBottom: 3,
                }}>
                  Exp
                </p>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13,
                  fontWeight: 700, color: 'rgba(255,255,255,0.82)',
                  letterSpacing: '0.1em',
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
                  ) : cardExpiry}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats tray: Expenses | Net Profit | Available Balance */}
        <div className="atm-stats-tray">
          {[
            { label: 'Expenses',  value: summary?.total_expenses,   color: 'var(--accent-red)'   },
            { label: isLoss ? 'Loss' : 'Profit', value: summary ? Math.abs(summary.net_profit) : undefined, color: isLoss ? 'var(--accent-red)' : 'var(--accent-green)' },
            { label: 'Balance',   value: summary?.available_balance, color: 'var(--text-primary)' },
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

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        className="quick-actions" style={{ marginTop: 'var(--space-5)' }}>
        {[
          { label: 'Jobs',      href: '/business/repairs',   Icon: Wrench,       color: '#8B0018', bg: 'rgba(139,0,24,0.12)'    },
          { label: 'Inventory', href: '/business/inventory', Icon: Package,      color: '#D4A535', bg: 'rgba(212,165,53,0.12)'  },
          { label: 'Sales',     href: '/business/sales',     Icon: ShoppingCart, color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
          { label: 'More',      href: '/business/analytics', Icon: BarChart2,    color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
        ].map(({ label, href, Icon, color, bg }) => (
          <Link key={label} href={href} className="quick-action-item">
            <div className="quick-action-icon" style={{ color, background: bg, borderColor: `${color}30` }}>
              <Icon size={20} strokeWidth={1.8} />
            </div>
            <span className="quick-action-label">{label}</span>
          </Link>
        ))}
      </motion.div>

      {/* ── Recent Customers (horizontal scroll) ─────────────────── */}
      {recentContacts.length > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{ marginTop: 'var(--space-6)' }}>
          <div className="section-row-header">
            <span className="section-row-title">Recent Customers</span>
            <Link href="/business/repairs" className="section-row-link">See all →</Link>
          </div>
          <div className="contacts-scroll">
            {recentContacts.map(job => {
              const name    = job.customer_name;
              const initials = getInitials(name);
              const color    = getAvatarColor(name);
              const firstName = name.split(' ')[0];
              return (
                <div key={job.id} className="contact-item"
                  onClick={() => router.push(`/business/repairs/${job.id}`)}>
                  <div className="contact-avatar-circle" style={{
                    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                    boxShadow: `0 4px 12px ${color}45`,
                  }}>
                    {initials}
                  </div>
                  <span className="contact-name-label">{firstName}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Pending Jobs (scheduled-payments style) ───────────────── */}
      {pendingJobs.length > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          style={{ marginTop: 'var(--space-5)' }}>
          <div className="section-row-header">
            <span className="section-row-title">Active Jobs</span>
            <Link href="/business/repairs" className="section-row-link">See all →</Link>
          </div>
          <div className="scheduled-scroll">
            {pendingJobs.map(job => {
              const color = getAvatarColor(job.customer_name);
              const initials = getInitials(job.customer_name);
              return (
                <div key={job.id} className="scheduled-card"
                  onClick={() => router.push(`/business/repairs/${job.id}`)}>
                  <div className="scheduled-card-icon" style={{
                    background: `linear-gradient(135deg, ${color}, ${color}bb)`,
                    boxShadow: `0 4px 10px ${color}40`,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <p className="scheduled-card-name">{job.customer_name.split(' ')[0]}</p>
                    <p className="scheduled-card-sub">{job.device_type}</p>
                  </div>
                  <p className="scheduled-card-amount">{formatNaira(job.total_charge)}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── AI Insights ───────────────────────────────────────────── */}
      <div style={{ marginTop: 'var(--space-5)' }}>
        <InsightsCard
          summary={summary as any ?? null}
          period={period === 'week' ? 'This Week' : period === 'year' ? 'This Year' : 'This Month'}
        />
      </div>

      {/* ── Stat grid ─────────────────────────────────────────────── */}
      <motion.div variants={stagger} initial="initial" animate="animate"
        className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <StatWidget
          label="Tithe Due"
          value={summary ? formatNaira(summary.tithe_due) : '—'}
          numericValue={summary?.tithe_due}
          numericFormat="currency"
          accent="warning"
          icon={<HandCoins size={16} />}
          loading={isLoading}
          onClick={() => router.push('/business/tithe')}
        />
        <StatWidget
          label="Pending Jobs"
          value={summary ? String(summary.pending_jobs) : '—'}
          numericValue={summary?.pending_jobs}
          numericFormat="number"
          accent="neutral"
          icon={<Wrench size={16} />}
          loading={isLoading}
          onClick={() => router.push('/business/repairs')}
        />
        <StatWidget
          label="Inventory"
          value={summary ? formatNaira(summary.inventory_value) : '—'}
          numericValue={summary?.inventory_value}
          numericFormat="currency"
          accent="investment"
          icon={<Package size={16} />}
          loading={isLoading}
          onClick={() => router.push('/business/inventory')}
        />
        <StatWidget
          label="Low Stock"
          value={summary ? String(summary.low_stock_count) : '—'}
          numericValue={summary?.low_stock_count}
          numericFormat="number"
          accent={summary && summary.low_stock_count > 5 ? 'loss' : 'warning'}
          icon={<AlertTriangle size={16} />}
          loading={isLoading}
          onClick={() => router.push('/business/inventory')}
        />
      </motion.div>

      {/* ── Monthly Goals ──────────────────────────────────────────── */}
      {period === 'month' && monthlyGoal && (monthlyGoal.revenue_target > 0 || monthlyGoal.profit_target > 0) && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          padding: 'var(--space-5)', marginBottom: 'var(--space-4)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Monthly Goals — {format(new Date(), 'MMMM')}
            </p>
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 12px' }}
              onClick={() => {
                setGoalForm({ revenue_target: Number(monthlyGoal.revenue_target), profit_target: Number(monthlyGoal.profit_target) });
                setEditGoalOpen(true);
              }}>
              Edit
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {monthlyGoal.revenue_target > 0 && (() => {
              const pct = Math.min(100, (Number(summary?.total_revenue || 0) / Number(monthlyGoal.revenue_target)) * 100);
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Revenue</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {summary ? formatNaira(summary.total_revenue) : '₦0'} / {formatNaira(monthlyGoal.revenue_target)}
                    </p>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #8B0018, #A50014)', width: `${pct}%`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                  <p style={{ fontSize: '0.57rem', color: pct >= 100 ? 'var(--accent-green)' : 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                    {pct >= 100 ? '✓ Target reached!' : `${pct.toFixed(0)}% of target`}
                  </p>
                </div>
              );
            })()}
            {monthlyGoal.profit_target > 0 && (() => {
              const pct = Math.min(100, (Number(summary?.net_profit || 0) / Number(monthlyGoal.profit_target)) * 100);
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Profit</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {summary ? formatNaira(Math.abs(summary.net_profit)) : '₦0'} / {formatNaira(monthlyGoal.profit_target)}
                    </p>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #22C55E, #16A34A)', width: `${Math.max(pct, 0)}%`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                  <p style={{ fontSize: '0.57rem', color: pct >= 100 ? 'var(--accent-green)' : 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                    {pct >= 100 ? '✓ Target reached!' : isLoss ? 'Net loss this period' : `${pct.toFixed(0)}% of target`}
                  </p>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {/* Set Goals Prompt */}
      {period === 'month' && monthlyGoal && monthlyGoal.revenue_target == 0 && monthlyGoal.profit_target == 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          padding: 'var(--space-5)', marginBottom: 'var(--space-4)',
          border: '1px dashed var(--border-subtle)', textAlign: 'center',
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

      {/* ── Revenue chart ─────────────────────────────────────────── */}
      {trendData && trendData.length > 0 && (
        <motion.div {...scrollFadeUp} style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          padding: 'var(--space-5)', marginBottom: 'var(--space-4)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Revenue vs Expenses
            </p>
            <Link href="/business/analytics" style={{
              fontSize: 'var(--text-xs)', fontWeight: 700, color: '#8B0018',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3,
            }}>
              Full view <ChevronRight size={12} />
            </Link>
          </div>
          <RevenueAreaChart data={trendData} />
        </motion.div>
      )}

      {/* ── Transaction History (recent jobs) ─────────────────────── */}
      <motion.div {...scrollFadeUp} className="txn-history-section">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Transaction History
          </p>
          <Link href="/business/repairs" style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 'var(--text-xs)', color: '#8B0018',
            textDecoration: 'none', fontWeight: 700,
          }}>
            View all <ChevronRight size={13} />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No repair jobs yet
          </div>
        ) : (
          recentJobs.slice(0, 6).map((job, i) => {
            const name     = job.customer_name;
            const initials = getInitials(name);
            const color    = getAvatarColor(name);
            return (
              <div key={job.id}
                onClick={() => router.push(`/business/repairs/${job.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 20px',
                  borderBottom: i < Math.min(recentJobs.length, 6) - 1 ? '1px solid var(--border-subtle)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, color: '#fff',
                  boxShadow: `0 3px 10px ${color}45`,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 'var(--text-sm)', fontWeight: 600,
                    color: 'var(--text-primary)', marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {format(new Date(job.received_at), 'hh:mm a')} · {job.device_type}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
                    fontWeight: 700, color: 'var(--accent-green)', marginBottom: 3,
                  }}>
                    +{formatNaira(job.total_charge)}
                  </p>
                  <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {job.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </motion.div>

      {/* ── Expense breakdown ─────────────────────────────────────── */}
      {expenseBreakdown && expenseBreakdown.length > 0 && (
        <motion.div {...scrollFadeUp} style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Expense Breakdown
            </p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              Includes tithe, damage & inventory
            </p>
          </div>
          <ExpensePieChart data={expenseBreakdown} />
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
    </div>
  );
}
