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
  LineChart, Wallet, ChevronRight, Settings,
} from 'lucide-react';

type Period = 'week' | 'month' | 'last_month' | 'year';

function getPeriodDates(period: Period) {
  const now = new Date();
  if (period === 'week')       return { start: format(startOfWeek(now), 'yyyy-MM-dd'), end: format(endOfWeek(now), 'yyyy-MM-dd') };
  if (period === 'year')       return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
  if (period === 'last_month') {
    const lm = subMonths(now, 1);
    return { start: format(startOfMonth(lm), 'yyyy-MM-dd'), end: format(endOfMonth(lm), 'yyyy-MM-dd') };
  }
  return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  food:      <Utensils size={16} />,
  transport: <Car size={16} />,
  utilities: <Zap size={16} />,
  health:    <Heart size={16} />,
  shopping:  <ShoppingBag size={16} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  food:      '#F59E0B',
  transport: '#3B82F6',
  utilities: '#8B5CF6',
  health:    '#EF4444',
  shopping:  '#10B981',
};

function getCategoryIcon(cat: string) {
  return CATEGORY_ICONS[cat.toLowerCase()] ?? <ShoppingBag size={16} />;
}

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? '#6366F1';
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week',       label: 'Week'       },
  { key: 'month',      label: 'Month'      },
  { key: 'last_month', label: 'Last Month' },
  { key: 'year',       label: 'Year'       },
];

const MENU_LINKS = [
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart,  color: '#7C3AED' },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet,     color: '#3B82F6' },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils,   color: '#F59E0B' },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank,  color: '#10B981' },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins,  color: '#EC4899' },
  { label: 'Settings',     href: '/settings',              icon: Settings,   color: '#6B7280' },
];

export default function PersonalDashboard() {
  const [period, setPeriod]   = useState<Period>('month');
  const [menuOpen, setMenuOpen] = useState(false);
  const { start, end } = getPeriodDates(period);
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const router = useRouter();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['personal-summary', start, end],
    queryFn:  () => analyticsApi.personalSummary({ period_start: start, period_end: end }),
  });

  const { data: unpaidCredits } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn:  () => foodVendorApi.credits.list({ paid: false }),
  });

  const { data: unpaidTithe } = useQuery({
    queryKey: ['tithe', 'personal', 'unpaid', start, end],
    queryFn:  () => titheApi.list({ scope: 'personal', paid: false, date_from: start, date_to: end }),
  });

  const { data: recentTx } = useQuery({
    queryKey: ['personal-tx-recent', start, end],
    queryFn:  () => personalApi.transactions.list({ size: 5, date_from: start, date_to: end }),
  });

  const netSavings    = summary?.net_savings    ?? 0;
  const totalIncome   = summary?.total_income   ?? 0;
  const totalExpenses = summary?.total_expenses ?? 0;
  const foodDebt      = (unpaidCredits ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const titheDue      = (unpaidTithe?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);

  const transactions = Array.isArray(recentTx)
    ? recentTx
    : (recentTx as { items?: typeof recentTx } | undefined)?.items ?? [];

  type Tx = { id: string; type: string; category: string; amount: number; description?: string; transaction_date: string };

  return (
    <div style={{ width: '100%', minWidth: 0, paddingBottom: 24 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-5)',
        gap: 12,
      }}>
        {/* Hamburger — top left */}
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginTop: 2,
          }}
        >
          <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>

        {/* Greeting */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 6vw, 1.85rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            marginBottom: 4,
          }}>
            Hello {firstName}!
          </h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
            Let&apos;s track your money.
          </p>
        </div>

        {/* Bell + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}>
          <button style={{
            width: 40, height: 40, borderRadius: 20,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Bell size={17} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div style={{
            width: 40, height: 40, borderRadius: 20,
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {firstName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Period selector ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        paddingBottom: 4, marginBottom: 'var(--space-5)',
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              flexShrink: 0, padding: '7px 18px',
              borderRadius: 50, border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em',
              background: period === p.key ? '#7C3AED' : 'var(--bg-elevated)',
              color:      period === p.key ? '#fff' : 'var(--text-secondary)',
              boxShadow:  period === p.key ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Cards carousel ──────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 200, marginBottom: 'var(--space-5)' }}>

        {/* Gold card (peeking behind) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={{
            position: 'absolute', top: 14, left: 20, right: 20,
            height: 175, borderRadius: 22,
            background: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
            zIndex: 1,
          }}
        >
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>i</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', letterSpacing: 2 }}>
                **** **** **** 2026
              </span>
            </div>
          </div>
        </motion.div>

        {/* Purple main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 185, borderRadius: 22,
            background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
            zIndex: 2, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(124,58,237,0.35)',
          }}
        >
          <div style={{ position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ padding: '18px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>i</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)', letterSpacing: 2 }}>
                **** **** **** 2025
              </span>
            </div>

            <div>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Balance
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.5rem, 7vw, 1.9rem)', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {isLoading ? <span style={{ opacity: 0.5 }}>—</span> : formatNaira(Math.abs(netSavings))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Name</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{user?.name ?? 'BizOS User'}</p>
              </div>
              <button
                onClick={() => router.push('/personal/transactions?new=1')}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', fontSize: '1.1rem', lineHeight: 1,
                }}
              >
                +
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Quick actions ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 'var(--space-5)' }}
      >
        {[
          { label: 'Expense',  icon: <ArrowUpRight size={20} />,  href: '/personal/transactions', color: '#EF4444' },
          { label: 'Income',   icon: <ArrowDownLeft size={20} />, href: '/personal/transactions', color: '#10B981' },
          { label: 'Savings',  icon: <PiggyBank size={20} />,     href: '/personal/savings',      color: '#7C3AED' },
          { label: 'Tithe',    icon: <HandCoins size={20} />,     href: '/personal/tithe',        color: '#EC4899' },
        ].map(({ label, icon, href, color }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 26,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                {icon}
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
                {label}
              </span>
            </div>
          </Link>
        ))}
      </motion.div>

      {/* ── Obligation pills ────────────────────────────────────── */}
      {(foodDebt > 0 || titheDue > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-5)', overflowX: 'auto', scrollbarWidth: 'none' }}
        >
          {foodDebt > 0 && (
            <Link href="/personal/food-vendor" style={{ flexShrink: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 14, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Utensils size={14} style={{ color: '#F59E0B' }} />
              <div>
                <p style={{ fontSize: '0.6rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Food Debt</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatNaira(foodDebt)}</p>
              </div>
            </Link>
          )}
          {titheDue > 0 && (
            <Link href="/personal/tithe" style={{ flexShrink: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 14, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <HandCoins size={14} style={{ color: '#7C3AED' }} />
              <div>
                <p style={{ fontSize: '0.6rem', color: '#7C3AED', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tithe Due</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatNaira(titheDue)}</p>
              </div>
            </Link>
          )}
        </motion.div>
      )}

      {/* ── Income / Expense summary ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.22 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'var(--space-5)' }}
      >
        {[
          { label: 'Income',   value: totalIncome,   color: '#10B981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
          { label: 'Expenses', value: totalExpenses, color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ padding: '14px 16px', borderRadius: 16, background: bg, border: `1px solid ${border}` }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {label}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color, lineHeight: 1 }}>
              {isLoading ? '—' : formatNaira(value)}
            </p>
          </div>
        ))}
      </motion.div>

      {/* ── Manage Expenses ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>Manage Expenses</h2>
          <Link href="/personal/transactions" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7C3AED', textDecoration: 'none' }}>
            View All
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(!transactions || (transactions as unknown[]).length === 0) && (
            <div style={{ padding: '24px 20px', borderRadius: 16, textAlign: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No transactions this period</p>
            </div>
          )}
          {(transactions as Tx[]).map((tx) => {
            const isExpense = tx.type === 'expense';
            const color = getCategoryColor(tx.category);
            return (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 16, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                  {getCategoryIcon(tx.category)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.description ?? tx.category}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {format(new Date(tx.transaction_date), 'h:mm a · d MMM yyyy')}
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800, color: isExpense ? '#EF4444' : '#10B981', flexShrink: 0 }}>
                  {isExpense ? '-' : '+'}{formatNaira(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <div style={{ height: 24 }} />

      {/* ── Menu sheet ──────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="menu-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            />
            <motion.div
              key="menu-sheet"
              initial={{ y: '100%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
                background: 'var(--glass-bg-strong)',
                backdropFilter: 'var(--glass-blur-strong)',
                WebkitBackdropFilter: 'var(--glass-blur-strong)',
                borderRadius: '28px 28px 0 0',
                border: '1px solid var(--glass-border)', borderBottom: 'none',
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.45)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 16px', borderBottom: '1px solid var(--glass-border)', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 800 }}>Personal</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>All sections</p>
                </div>
                <button onClick={() => setMenuOpen(false)} style={{ width: 34, height: 34, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MENU_LINKS.map(({ label, href, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '13px 16px', borderRadius: 16, textDecoration: 'none',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 13, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
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
    </div>
  );
}
