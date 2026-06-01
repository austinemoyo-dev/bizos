'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { foodVendorApi } from '@/lib/api/food-vendor';
import { titheApi } from '@/lib/api/tithe';
import { personalApi } from '@/lib/api/personal';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { lendingApi } from '@/lib/api/lending';
import { useAuthStore } from '@/lib/stores/authStore';
import { formatNaira } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, startOfYear, endOfYear,
  startOfWeek, endOfWeek, subMonths,
} from 'date-fns';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, ArrowUpRight, ArrowDownLeft, PiggyBank, HandCoins,
  Menu, X, ShoppingBag, Utensils, Car, Zap, Heart,
  LineChart, Wallet, ChevronRight, Settings,
  TrendingUp, TrendingDown,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const HERO_BG = 'linear-gradient(160deg, #1a1b6e 0%, #2e3fa0 55%, #1e2878 100%)';

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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  food: <Utensils size={15} />, transport: <Car size={15} />,
  utilities: <Zap size={15} />, health: <Heart size={15} />, shopping: <ShoppingBag size={15} />,
};
const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B', transport: '#3B82F6', utilities: '#8B5CF6', health: '#EF4444', shopping: '#10B981',
};
const getCategoryIcon  = (c: string) => CATEGORY_ICONS[c.toLowerCase()] ?? <ShoppingBag size={15} />;
const getCategoryColor = (c: string) => CATEGORY_COLORS[c.toLowerCase()] ?? '#6366F1';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' },
  { key: 'last_month', label: 'Last Month' }, { key: 'year', label: 'Year' },
];

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week', month: 'This Month', last_month: 'Last Month', year: 'This Year',
};

const MENU_LINKS = [
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart,  color: '#818CF8' },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet,     color: '#60A5FA' },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils,   color: '#FBBF24' },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank,  color: '#34D399' },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins,  color: '#F472B6' },
  { label: 'Planning',     href: '/personal/planning',     icon: TrendingUp, color: '#A78BFA' },
  { label: 'Settings',     href: '/settings',              icon: Settings,   color: '#9CA3AF' },
];

// ── Mini account card ──────────────────────────────────────────────────────────
function AccountCard({ name, income, periodLabel }: { name: string; income: number; periodLabel: string }) {
  return (
    <div style={{
      width: 150, minWidth: 150, height: 90, borderRadius: 16, flexShrink: 0,
      background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#EF4444', marginRight: -5, zIndex: 1, border: '1.5px solid #fff' }} />
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FBBF24' }} />
        </div>
        <span style={{ fontSize: '0.5rem', color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.06em' }}>PERSONAL</span>
      </div>
      <div>
        <p style={{ fontSize: '0.55rem', color: '#9CA3AF', marginBottom: 2 }}>{periodLabel} income</p>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 800,
          color: '#1a1b6e', lineHeight: 1, marginBottom: 3,
        }}>
          {income > 0 ? formatNaira(income) : '₦—'}
        </p>
        <p style={{ fontSize: '0.5rem', color: '#C4C4D4', letterSpacing: 2, textTransform: 'uppercase' }}>
          {name.slice(0, 14)}
        </p>
      </div>
    </div>
  );
}

// ── Skeleton bar ──────────────────────────────────────────────────────────────
function SkeletonBar({ w = 160, h = 40 }: { w?: number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 10,
      background: 'rgba(255,255,255,0.15)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PersonalDashboard() {
  const [period, setPeriod]       = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<'history' | 'statistics'>('history');
  const [menuOpen, setMenuOpen]   = useState(false);
  const { start, end }            = getPeriodDates(period);
  const user      = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const router    = useRouter();

  // ── Queries ────────────────────────────────────────────────────
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['personal-summary', start, end],
    queryFn:  () => analyticsApi.personalSummary({ period_start: start, period_end: end }),
  });

  // Only need paid tithe — backend already provides food_debt & tithe_due in summary
  const { data: paidTitheData } = useQuery({
    queryKey: ['tithe', 'personal', 'paid', start, end],
    queryFn:  () => titheApi.list({ scope: 'personal', paid: true, date_from: start, date_to: end }),
  });

  const { data: recentTx } = useQuery({
    queryKey: ['personal-tx-recent', start, end],
    queryFn:  () => personalApi.transactions.list({ size: 8, date_from: start, date_to: end }),
  });

  // Food debt still needed (summary.food_debt may be all-time; we need current unpaid)
  const { data: unpaidCredits } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn:  () => foodVendorApi.credits.list({ paid: false }),
  });

  const { data: cashPos } = useQuery({
    queryKey: ['cash-position', 'personal'],
    queryFn:  () => cashFlowApi.getPosition('personal'),
    retry: false,
  });

  const { data: lendingSum } = useQuery({
    queryKey: ['lending-summary', 'personal'],
    queryFn:  () => lendingApi.summary('personal'),
    retry: false,
  });

  // ── Computed values ────────────────────────────────────────────
  const totalIncome     = Number(summary?.total_income   ?? 0);
  const totalExpenses   = Number(summary?.total_expenses ?? 0);
  const paidTitheAmount = (paidTitheData?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);
  const titheDue        = Number(summary?.tithe_due ?? 0);
  const foodDebt        = (unpaidCredits ?? []).reduce((s, c) => s + Number(c.amount), 0);

  // Period-based net (fallback while summary loads)
  const computedBalance  = totalIncome - totalExpenses - paidTitheAmount;
  // Use all-time available_balance from summary (reflects actual physical cash including loans)
  const availableBalance = summary?.available_balance != null ? Number(summary.available_balance) : computedBalance;
  const isPositive       = availableBalance >= 0;
  const periodLabel      = PERIOD_LABELS[period];

  const transactions = Array.isArray(recentTx)
    ? recentTx
    : ((recentTx as { items?: unknown[] } | undefined)?.items ?? []);

  type Tx = { id: string; type: string; category: string; amount: number; description?: string; transaction_date: string };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', minWidth: 0, paddingBottom: 24 }}>

      {/* ── HERO (dark navy card — works on all screen sizes) ───── */}
      <div style={{
        background: HERO_BG,
        borderRadius: 24,
        padding: '20px 20px 28px',
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative orb */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,130,255,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          {/* Left: hamburger + scope switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setMenuOpen(true)}
              style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Menu size={18} color="#fff" />
            </button>

            {/* Scope switcher pill */}
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 20, padding: 3,
            }}>
              {([
                { label: 'Business', href: '/business/dashboard', active: false, color: '#800000' },
                { label: 'Personal', href: '/personal/dashboard', active: true,  color: '#7C3AED' },
              ] as const).map(({ label, href, active, color }) => (
                <button
                  key={label}
                  onClick={() => router.push(href)}
                  style={{
                    padding: '5px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap',
                    background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                    transition: 'all 0.18s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: bell + avatar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Bell size={16} color="#fff" />
              <div style={{ position: 'absolute', top: 9, right: 9, width: 6, height: 6, borderRadius: '50%', background: '#FBBF24', border: '1.5px solid #1e2878' }} />
            </button>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: 'linear-gradient(135deg,#818CF8,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Balance + mini card row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 2 }}>
              Hi, {firstName}! 👋
            </p>
            <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', marginBottom: 12, fontWeight: 500 }}>
              Available Balance
            </p>

            {loadingSummary ? (
              <SkeletonBar w={180} h={42} />
            ) : (
              <div>
                {/* Status badge — clearly shows IN THE GREEN / IN THE RED */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20, marginBottom: 8,
                  background: isPositive ? 'rgba(134,239,172,0.2)' : 'rgba(252,165,165,0.2)',
                  border: `1px solid ${isPositive ? 'rgba(134,239,172,0.4)' : 'rgba(252,165,165,0.4)'}`,
                }}>
                  {isPositive
                    ? <TrendingUp size={11} color="#86EFAC" />
                    : <TrendingDown size={11} color="#FCA5A5" />
                  }
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em',
                    color: isPositive ? '#86EFAC' : '#FCA5A5',
                    textTransform: 'uppercase',
                  }}>
                    {isPositive ? 'In the Green' : 'In the Red'}
                  </span>
                </div>

                {/* Balance amount — coloured by health */}
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(1.55rem, 7vw, 2rem)',
                  fontWeight: 800,
                  color: isPositive ? '#86EFAC' : '#FCA5A5',
                  lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 5,
                }}>
                  {formatNaira(Math.abs(availableBalance))}
                </p>

                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                  Current cash balance
                </p>
              </div>
            )}
          </div>

          <AccountCard name={user?.name ?? 'BizOS'} income={totalIncome} periodLabel={periodLabel} />
        </div>

        {/* Period pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 20, overflowX: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: '0.68rem', fontWeight: 700, transition: 'all 0.18s',
                background: period === p.key ? '#fff' : 'rgba(255,255,255,0.12)',
                color: period === p.key ? '#1a1b6e' : 'rgba(255,255,255,0.75)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ACTION CARDS (horizontal scroll) ──────────────────────── */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, marginBottom: 20 }}>
        {[
          { label: 'Income',   value: totalIncome,   icon: <ArrowDownLeft size={18} color="rgba(255,255,255,0.85)" />, gradient: 'linear-gradient(135deg,#4F46E5,#818CF8)', glow: 'rgba(79,70,229,0.3)',  href: '/personal/transactions', always: true },
          { label: 'Expenses', value: totalExpenses, icon: <ArrowUpRight  size={18} color="rgba(255,255,255,0.85)" />, gradient: 'linear-gradient(135deg,#EF4444,#F97316)', glow: 'rgba(239,68,68,0.28)', href: '/personal/transactions', always: true },
          { label: 'Food Debt',value: foodDebt,      icon: <Utensils      size={18} color="rgba(255,255,255,0.85)" />, gradient: 'linear-gradient(135deg,#D97706,#FBBF24)', glow: 'rgba(217,119,6,0.28)',  href: '/personal/food-vendor',  always: foodDebt > 0 },
          { label: 'Tithe Due',value: titheDue,      icon: <HandCoins     size={18} color="rgba(255,255,255,0.85)" />, gradient: 'linear-gradient(135deg,#7C3AED,#A78BFA)', glow: 'rgba(124,58,237,0.28)', href: '/personal/tithe',        always: titheDue > 0 },
        ].filter((c) => c.always).map(({ label, value, icon, gradient, glow, href }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 148, borderRadius: 18, padding: '14px 14px', background: gradient, boxShadow: `0 4px 18px ${glow}` }}>
              {icon}
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', margin: '10px 0 3px', fontWeight: 600 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                {loadingSummary ? '—' : formatNaira(value)}
              </p>
            </div>
          </Link>
        ))}

        <Link href="/personal/savings" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 120, borderRadius: 18, padding: '14px 14px', background: 'linear-gradient(135deg,#059669,#34D399)', boxShadow: '0 4px 18px rgba(5,150,105,0.28)' }}>
            <PiggyBank size={18} color="rgba(255,255,255,0.85)" />
            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', margin: '10px 0 3px', fontWeight: 600 }}>Savings</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>View →</p>
          </div>
        </Link>
      </div>

      {/* ── CASH POSITION STRIP ──────────────────────────────────── */}
      {summary && (
        <Link href="/personal/planning" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
          <div style={{
            borderRadius: 18, padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(79,46,220,0.18) 0%, rgba(124,58,237,0.12) 100%)',
            border: '1px solid rgba(124,58,237,0.25)',
            display: 'flex', gap: 0,
          }}>
            {[
              {
                label: 'Cash in Hand',
                value: formatNaira(Number(summary.available_balance)),
                color: '#A78BFA',
                sub: null,
              },
              {
                label: 'Lent Out',
                value: lendingSum ? formatNaira(Number(lendingSum.outstanding_receivable)) : '—',
                color: '#60A5FA',
                sub: null,
              },
              {
                label: 'You Owe',
                value: lendingSum ? formatNaira(Number(lendingSum.outstanding_payable)) : '—',
                color: '#F87171',
                sub: null,
              },
            ].map(({ label, value, color }, idx, arr) => (
              <div key={label} style={{
                flex: 1, textAlign: 'center',
                borderRight: idx < arr.length - 1 ? '1px solid rgba(124,58,237,0.2)' : 'none',
                paddingRight: idx < arr.length - 1 ? 12 : 0,
                paddingLeft: idx > 0 ? 12 : 0,
              }}>
                <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 10, flexShrink: 0 }}>
              <ChevronRight size={14} color="rgba(167,139,250,0.6)" />
            </div>
          </div>
        </Link>
      )}

      {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Expense', icon: <ArrowUpRight size={17} />,  href: '/personal/transactions', color: '#EF4444' },
          { label: 'Income',  icon: <ArrowDownLeft size={17} />, href: '/personal/transactions', color: '#10B981' },
          { label: 'Savings', icon: <PiggyBank size={17} />,     href: '/personal/savings',      color: '#7C3AED' },
          { label: 'Tithe',   icon: <HandCoins size={17} />,     href: '/personal/tithe',        color: '#EC4899' },
        ].map(({ label, icon, href, color }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 50, height: 50, borderRadius: 16, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                {icon}
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── HISTORY / STATISTICS TABS ─────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: 16 }}>
        {(['history', 'statistics'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 20px 10px', border: 'none', cursor: 'pointer', background: 'transparent',
            fontSize: '0.82rem', fontWeight: 700, textTransform: 'capitalize',
            color: activeTab === t ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === t ? '2px solid #4F46E5' : '2px solid transparent',
            marginBottom: -1, transition: 'color 0.18s, border-color 0.18s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {(transactions as Tx[]).length === 0 && (
              <div style={{ padding: '28px 16px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 16 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No transactions this period</p>
                <button onClick={() => router.push('/personal/transactions?new=1')} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, border: 'none', background: '#4F46E5', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                  Add Transaction
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(transactions as Tx[]).map((tx, i) => {
                const isExp  = tx.type === 'expense';
                const color  = getCategoryColor(tx.category);
                return (
                  <motion.div key={tx.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.16, delay: i * 0.03 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: '1px solid var(--glass-border)' }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: `${color}14`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description ?? tx.category}
                      </p>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {format(new Date(tx.transaction_date), 'h:mm a · d MMM')}
                      </p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 800, color: isExp ? '#EF4444' : '#10B981', flexShrink: 0 }}>
                      {isExp ? '-' : '+'}{formatNaira(tx.amount)}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {(transactions as Tx[]).length > 0 && (
              <Link href="/personal/transactions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '14px 0', textDecoration: 'none', color: '#4F46E5', fontSize: '0.75rem', fontWeight: 700 }}>
                View all <ChevronRight size={14} />
              </Link>
            )}
          </motion.div>
        )}

        {activeTab === 'statistics' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[
                { label: 'Income',            value: totalIncome,      color: '#10B981', bg: 'rgba(16,185,129,0.08)'  },
                { label: 'Expenses',          value: totalExpenses,    color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
                { label: 'Paid Tithe',        value: paidTitheAmount,  color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
                { label: isPositive ? '✅ Available Balance' : '🔴 Balance Deficit', value: availableBalance,
                  color: isPositive ? '#10B981' : '#EF4444',
                  bg: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ padding: '14px 16px', borderRadius: 16, background: bg, border: `1px solid ${color}20` }}>
                  <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color, lineHeight: 1 }}>
                    {formatNaira(Math.abs(value))}
                    {label === 'Available Balance' && !isPositive && <span style={{ fontSize: '0.6rem' }}> deficit</span>}
                  </p>
                </div>
              ))}
            </div>

            {(foodDebt > 0 || titheDue > 0) && (
              <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 12 }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#D97706', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding</p>
                {foodDebt > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Food Credits</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B' }}>{formatNaira(foodDebt)}</span>
                  </div>
                )}
                {titheDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tithe Due</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED' }}>{formatNaira(titheDue)}</span>
                  </div>
                )}
              </div>
            )}

            <Link href="/personal/analytics" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '14px 0', textDecoration: 'none', color: '#4F46E5', fontSize: '0.75rem', fontWeight: 700 }}>
              Full Analytics <ChevronRight size={14} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MENU SHEET ────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
            <motion.div key="sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101, background: 'var(--glass-bg-strong)', backdropFilter: 'var(--glass-blur-strong)', borderRadius: '28px 28px 0 0', border: '1px solid var(--glass-border)', borderBottom: 'none', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', boxShadow: '0 -8px 48px rgba(0,0,0,0.45)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px', borderBottom: '1px solid var(--glass-border)', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 800 }}>Personal</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>All sections</p>
                </div>
                <button onClick={() => setMenuOpen(false)} style={{ width: 34, height: 34, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MENU_LINKS.map(({ label, href, icon: Icon, color }) => (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, textDecoration: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        <Icon size={17} />
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
