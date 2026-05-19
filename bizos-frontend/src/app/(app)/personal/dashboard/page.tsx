'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { foodVendorApi } from '@/lib/api/food-vendor';
import { titheApi } from '@/lib/api/tithe';
import { personalApi } from '@/lib/api/personal';
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
  LineChart, Wallet, ChevronRight, Settings, TrendingUp,
  TrendingDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
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
  food:      <Utensils size={15} />,
  transport: <Car size={15} />,
  utilities: <Zap size={15} />,
  health:    <Heart size={15} />,
  shopping:  <ShoppingBag size={15} />,
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

const MENU_LINKS = [
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart,  color: '#818CF8' },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet,     color: '#60A5FA' },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils,   color: '#FBBF24' },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank,  color: '#34D399' },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins,  color: '#F472B6' },
  { label: 'Settings',     href: '/settings',              icon: Settings,   color: '#9CA3AF' },
];

// ── Frosted mini-card ──────────────────────────────────────────────────────────
function AccountCard({ name, income, period }: { name: string; income: number; period: string }) {
  return (
    <div style={{
      width: 155, height: 96, borderRadius: 18, flexShrink: 0,
      background: '#fff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: -4 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EF4444', marginRight: -6, zIndex: 1 }} />
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F59E0B' }} />
        </div>
        <span style={{ fontSize: '0.52rem', color: '#9CA3AF', fontWeight: 600 }}>PERSONAL</span>
      </div>
      <div>
        <p style={{ fontSize: '0.6rem', color: '#9CA3AF', marginBottom: 2 }}>{period} income</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
          {income > 0 ? formatNaira(income) : '₦—'}
        </p>
        <p style={{ fontSize: '0.58rem', color: '#9CA3AF', marginTop: 3, letterSpacing: 1 }}>
          {name.toUpperCase().slice(0, 14)}
        </p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PersonalDashboard() {
  const [period, setPeriod]     = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<'history' | 'statistics'>('history');
  const [menuOpen, setMenuOpen] = useState(false);
  const { start, end }          = getPeriodDates(period);
  const user      = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const router    = useRouter();

  // ── Data queries ──────────────────────────────────────────────────
  const { data: summary, isLoading } = useQuery({
    queryKey: ['personal-summary', start, end],
    queryFn:  () => analyticsApi.personalSummary({ period_start: start, period_end: end }),
  });

  const { data: unpaidCredits } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn:  () => foodVendorApi.credits.list({ paid: false }),
  });

  // Unpaid tithe (what's still owed)
  const { data: unpaidTithe } = useQuery({
    queryKey: ['tithe', 'personal', 'unpaid', start, end],
    queryFn:  () => titheApi.list({ scope: 'personal', paid: false, date_from: start, date_to: end }),
  });

  // Paid tithe (already deducted from balance) — this is the balance fix
  const { data: paidTithe } = useQuery({
    queryKey: ['tithe', 'personal', 'paid', start, end],
    queryFn:  () => titheApi.list({ scope: 'personal', paid: true, date_from: start, date_to: end }),
  });

  const { data: recentTx } = useQuery({
    queryKey: ['personal-tx-recent', start, end],
    queryFn:  () => personalApi.transactions.list({ size: 8, date_from: start, date_to: end }),
  });

  // ── Derived / fixed calculations ───────────────────────────────────
  const netSavings      = summary?.net_savings    ?? 0;
  const totalIncome     = summary?.total_income   ?? 0;
  const totalExpenses   = summary?.total_expenses ?? 0;
  const foodDebt        = (unpaidCredits ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const titheDue        = (unpaidTithe?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);
  const paidTitheAmount = (paidTithe?.items   ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);

  // ✅ Fixed: Available balance properly subtracts paid tithe
  const availableBalance = netSavings - paidTitheAmount;
  const isPositive       = availableBalance >= 0;

  const transactions = Array.isArray(recentTx)
    ? recentTx
    : (recentTx as { items?: typeof recentTx } | undefined)?.items ?? [];

  type Tx = { id: string; type: string; category: string; amount: number; description?: string; transaction_date: string };

  const periodLabel = { week: 'This Week', month: 'This Month', last_month: 'Last Month', year: 'This Year' }[period];

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <style>{`
        .pd-hero {
          background: linear-gradient(160deg, #1a1b6e 0%, #2e3fa0 55%, #1e2878 100%);
          margin: calc(-1 * var(--space-4)) calc(-1 * var(--space-4)) 0;
          padding: var(--space-4) var(--space-4) 32px;
        }
        @media (max-width: 767px) {
          .pd-hero { margin: -12px -16px 0; padding: 12px 16px 32px; }
        }
      `}</style>

      {/* ══ DARK HERO ══════════════════════════════════════════════ */}
      <div className="pd-hero">

        {/* Top row: hamburger + bell + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={() => setMenuOpen(true)}
            style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Menu size={18} color="#fff" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Bell size={16} color="#fff" />
              <div style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#FBBF24', border: '1.5px solid #1a1b6e' }} />
            </button>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: 'linear-gradient(135deg, #818CF8, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Greeting + Balance + Card */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>

          {/* Left: greeting + balance */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500, marginBottom: 2 }}>
              Hi, {firstName}! 👋
            </p>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', marginBottom: 16, fontWeight: 500 }}>
              Available Balance
            </p>

            {isLoading ? (
              <div style={{ height: 44, width: 180, borderRadius: 10, background: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
            ) : (
              <motion.div
                key={availableBalance}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(1.6rem, 8vw, 2.2rem)',
                  fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em',
                  marginBottom: 6,
                }}>
                  {formatNaira(Math.abs(availableBalance))}
                  {!isPositive && <span style={{ fontSize: '0.9rem', color: '#FCA5A5' }}> deficit</span>}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {isPositive
                    ? <TrendingUp size={13} color="#86EFAC" />
                    : <TrendingDown size={13} color="#FCA5A5" />
                  }
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isPositive ? '#86EFAC' : '#FCA5A5' }}>
                    {formatNaira(totalIncome)} income · {periodLabel}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: mini account card */}
          <AccountCard
            name={user?.name ?? 'BizOS User'}
            income={totalIncome}
            period={periodLabel}
          />
        </div>

        {/* ── Period selector ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginTop: 24, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: '0.68rem', fontWeight: 700,
                background: period === p.key ? '#fff' : 'rgba(255,255,255,0.12)',
                color: period === p.key ? '#1a1b6e' : 'rgba(255,255,255,0.7)',
                transition: 'all 0.18s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ ACTION CARDS ═══════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', padding: '20px 0 4px', marginBottom: 4 }}>

        {/* Income card */}
        <div style={{ flexShrink: 0, width: 155, borderRadius: 20, padding: '16px 16px', background: 'linear-gradient(135deg, #4F46E5, #818CF8)', boxShadow: '0 4px 20px rgba(79,70,229,0.35)' }}>
          <ArrowDownLeft size={20} color="rgba(255,255,255,0.8)" />
          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', marginTop: 10, marginBottom: 4, fontWeight: 600 }}>Total Income</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
            {isLoading ? '—' : formatNaira(totalIncome)}
          </p>
        </div>

        {/* Expenses card */}
        <div style={{ flexShrink: 0, width: 155, borderRadius: 20, padding: '16px 16px', background: 'linear-gradient(135deg, #EF4444, #F97316)', boxShadow: '0 4px 20px rgba(239,68,68,0.3)' }}>
          <ArrowUpRight size={20} color="rgba(255,255,255,0.8)" />
          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', marginTop: 10, marginBottom: 4, fontWeight: 600 }}>Total Expenses</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
            {isLoading ? '—' : formatNaira(totalExpenses)}
          </p>
        </div>

        {/* Food debt card */}
        {foodDebt > 0 && (
          <Link href="/personal/food-vendor" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 155, borderRadius: 20, padding: '16px 16px', background: 'linear-gradient(135deg, #D97706, #FBBF24)', boxShadow: '0 4px 20px rgba(217,119,6,0.3)' }}>
              <Utensils size={20} color="rgba(255,255,255,0.8)" />
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', marginTop: 10, marginBottom: 4, fontWeight: 600 }}>Food Debt</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                {formatNaira(foodDebt)}
              </p>
            </div>
          </Link>
        )}

        {/* Tithe card */}
        {titheDue > 0 && (
          <Link href="/personal/tithe" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 155, borderRadius: 20, padding: '16px 16px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
              <HandCoins size={20} color="rgba(255,255,255,0.8)" />
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', marginTop: 10, marginBottom: 4, fontWeight: 600 }}>Tithe Due</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                {formatNaira(titheDue)}
              </p>
            </div>
          </Link>
        )}

        {/* Savings link */}
        <Link href="/personal/savings" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 130, borderRadius: 20, padding: '16px 16px', background: 'linear-gradient(135deg, #059669, #34D399)', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}>
            <PiggyBank size={20} color="rgba(255,255,255,0.8)" />
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', marginTop: 10, marginBottom: 4, fontWeight: 600 }}>Savings</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>View →</p>
          </div>
        </Link>
      </div>

      {/* ══ QUICK ACTIONS ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24, marginTop: 8 }}>
        {[
          { label: 'Expense',  icon: <ArrowUpRight size={18} />,  href: '/personal/transactions', color: '#EF4444' },
          { label: 'Income',   icon: <ArrowDownLeft size={18} />, href: '/personal/transactions', color: '#10B981' },
          { label: 'Savings',  icon: <PiggyBank size={18} />,     href: '/personal/savings',      color: '#7C3AED' },
          { label: 'Tithe',    icon: <HandCoins size={18} />,     href: '/personal/tithe',        color: '#EC4899' },
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

      {/* ══ HISTORY / STATISTICS TABS ══════════════════════════════ */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--glass-border)' }}>
        {(['history', 'statistics'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 20px 10px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontSize: '0.82rem', fontWeight: 700,
              color: activeTab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === t ? '2px solid #4F46E5' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.18s',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ══ HISTORY TAB ════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {(!transactions || (transactions as unknown[]).length === 0) && (
              <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 16 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No transactions this period</p>
                <button onClick={() => router.push('/personal/transactions?new=1')} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, border: 'none', background: '#4F46E5', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                  Add Transaction
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(transactions as Tx[]).map((tx, i) => {
                const isExpense = tx.type === 'expense';
                const color     = getCategoryColor(tx.category);
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.04 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description ?? tx.category}
                      </p>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {format(new Date(tx.transaction_date), 'h:mm a · d MMM')}
                      </p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 800, color: isExpense ? '#EF4444' : '#10B981', flexShrink: 0 }}>
                      {isExpense ? '-' : '+'}{formatNaira(tx.amount)}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {(transactions as Tx[]).length > 0 && (
              <Link href="/personal/transactions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '14px 0', textDecoration: 'none', color: '#4F46E5', fontSize: '0.75rem', fontWeight: 700 }}>
                View all transactions <ChevronRight size={14} />
              </Link>
            )}
          </motion.div>
        )}

        {/* ══ STATISTICS TAB ═══════════════════════════════════════ */}
        {activeTab === 'statistics' && (
          <motion.div
            key="statistics"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Income',          value: totalIncome,      color: '#10B981', bg: 'rgba(16,185,129,0.08)'  },
                { label: 'Expenses',         value: totalExpenses,    color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
                { label: 'Paid Tithe',       value: paidTitheAmount,  color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
                { label: 'Available Balance',value: availableBalance,
                  color: isPositive ? '#10B981' : '#EF4444',
                  bg: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ padding: '14px 16px', borderRadius: 16, background: bg, border: `1px solid ${color}20` }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color, lineHeight: 1 }}>
                    {formatNaira(Math.abs(value))}
                    {label === 'Available Balance' && !isPositive && <span style={{ fontSize: '0.65rem' }}> deficit</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Obligations */}
            {(foodDebt > 0 || titheDue > 0) && (
              <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#D97706', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding Obligations</p>
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

            <Link href="/personal/analytics" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '16px 0', textDecoration: 'none', color: '#4F46E5', fontSize: '0.75rem', fontWeight: 700 }}>
              Full Analytics <ChevronRight size={14} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MENU SHEET ═════════════════════════════════════════════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div key="ph-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
            <motion.div key="ph-sheet" initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101, background: 'var(--glass-bg-strong)', backdropFilter: 'var(--glass-blur-strong)', borderRadius: '28px 28px 0 0', border: '1px solid var(--glass-border)', borderBottom: 'none', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', boxShadow: '0 -8px 48px rgba(0,0,0,0.45)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 16px', borderBottom: '1px solid var(--glass-border)', marginBottom: 12 }}>
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
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 16, textDecoration: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 13, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        <Icon size={18} />
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

      <div style={{ height: 24 }} />
    </div>
  );
}
