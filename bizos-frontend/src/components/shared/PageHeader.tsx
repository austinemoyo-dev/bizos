'use client';

import { useState } from 'react';
import { LucideIcon, Menu, Bell, X, ChevronRight, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, ShoppingCart, Users, Receipt, Package, ScrollText,
  TrendingUp, Banknote, HandCoins, ShoppingBag, Calculator,
  Printer, UserCircle, Wallet, Utensils, PiggyBank, Briefcase,
} from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  accentColor?: string;
  accentGlow?: string;
}

const BUSINESS_MENU = [
  { label: 'Analytics',    href: '/business/analytics',     icon: LineChart,    color: '#C8102E' },
  { label: 'Sales',        href: '/business/sales',         icon: ShoppingCart, color: '#F59E0B' },
  { label: 'Customers',    href: '/business/customers',     icon: Users,        color: '#3B82F6' },
  { label: 'Expenses',     href: '/business/expenses',      icon: Receipt,      color: '#EF4444' },
  { label: 'Inventory',    href: '/business/inventory',     icon: Package,      color: '#10B981' },
  { label: 'Debtors',      href: '/business/debtors',       icon: ScrollText,   color: '#F97316' },
  { label: 'Investments',  href: '/business/investments',   icon: TrendingUp,   color: '#8B5CF6' },
  { label: 'Loans',        href: '/business/loans',         icon: Banknote,     color: '#06B6D4' },
  { label: 'Tithe',        href: '/business/tithe',         icon: HandCoins,    color: '#EC4899' },
  { label: 'Market List',  href: '/business/market-list',   icon: ShoppingBag,  color: '#84CC16' },
  { label: 'Calculator',   href: '/business/calculator',    icon: Calculator,   color: '#6B7280' },
  { label: 'Daily Report', href: '/business/reports/daily', icon: Printer,      color: '#78716C' },
  { label: 'Personal',     href: '/personal/dashboard',     icon: UserCircle,   color: '#7C3AED' },
  { label: 'Settings',     href: '/settings',               icon: Settings,     color: '#6B7280' },
];

const PERSONAL_MENU = [
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart,  color: '#7C3AED' },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet,     color: '#3B82F6' },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils,   color: '#F59E0B' },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank,  color: '#10B981' },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins,  color: '#EC4899' },
  { label: 'Business',     href: '/business/dashboard',    icon: Briefcase,  color: '#C8102E' },
  { label: 'Settings',     href: '/settings',              icon: Settings,   color: '#6B7280' },
];

export function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
  accentColor = 'var(--accent-primary)',
  accentGlow  = 'rgba(200,16,46,0.12)',
}: PageHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user        = useAuthStore((s) => s.user);
  const pathname    = usePathname();
  const router      = useRouter();
  const isPersonal  = pathname.startsWith('/personal');
  const initial     = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const menuLinks   = isPersonal ? PERSONAL_MENU : BUSINESS_MENU;
  const scopeAccent = isPersonal ? '#7C3AED' : '#800000';

  return (
    <>
      <style>{`
        .ph-desktop        { display: flex; }
        .ph-mobile         { display: none; }
        .ph-mobile-actions { display: none; }
        @media (max-width: 767px) {
          .ph-desktop        { display: none !important; }
          .ph-mobile         { display: flex !important; }
          .ph-mobile-actions { display: flex !important; }
        }
      `}</style>

      {/* ── Desktop header ────────────────────────────────────────── */}
      <motion.div
        className="page-header ph-desktop"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="page-header-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
          {Icon && (
            <div style={{
              width: 44, height: 44, borderRadius: 16, background: accentGlow,
              border: `1px solid ${accentColor}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accentColor,
              boxShadow: `0 4px 20px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
              flexShrink: 0, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}>
              <Icon size={20} strokeWidth={2.2} />
            </div>
          )}
          <div>
            <h1 className="page-title" style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}>{title}</h1>
            {subtitle && <p className="page-subtitle" style={{ marginTop: 3, lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="page-header-actions" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </motion.div>

      {/* ── Mobile header (dark-navy on personal, plain on business) ── */}
      <motion.div
        className="ph-mobile"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          alignItems: 'center', justifyContent: 'space-between', gap: 10,
          marginBottom: actions ? 10 : 'var(--space-5)',
          ...(isPersonal ? {
            background: 'linear-gradient(160deg, #1a1b6e 0%, #2e3fa0 55%, #1e2878 100%)',
            borderRadius: 20,
            padding: '16px 16px',
            marginBottom: actions ? 10 : 16,
          } : {}),
        }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
            background: isPersonal ? 'rgba(255,255,255,0.12)' : 'var(--bg-elevated)',
            border: isPersonal ? 'none' : '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Menu size={18} style={{ color: isPersonal ? '#fff' : 'var(--text-secondary)' }} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: 'clamp(1.2rem, 5vw, 1.5rem)',
            fontWeight: 800,
            color: isPersonal ? '#fff' : 'var(--text-primary)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '0.65rem', color: isPersonal ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button style={{
            width: 38, height: 38, borderRadius: 19,
            background: isPersonal ? 'rgba(255,255,255,0.12)' : 'var(--bg-elevated)',
            border: isPersonal ? 'none' : '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Bell size={16} style={{ color: isPersonal ? '#fff' : 'var(--text-secondary)' }} />
          </button>
          <div style={{
            width: 38, height: 38, borderRadius: 19, flexShrink: 0,
            background: `linear-gradient(135deg, ${scopeAccent}, ${isPersonal ? '#5B21B6' : '#7B0018'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 800, color: '#fff',
          }}>
            {initial}
          </div>
        </div>
      </motion.div>

      {/* ── Scope switcher — mobile only ────────────────────────── */}
      <div className="ph-mobile" style={{
        marginBottom: actions ? 8 : 'var(--space-4)',
        justifyContent: 'flex-start',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20, padding: 3,
        }}>
          {([
            { label: 'Business', href: '/business/dashboard', active: !isPersonal, color: '#800000' },
            { label: 'Personal', href: '/personal/dashboard', active: isPersonal,  color: '#7C3AED' },
          ] as const).map(({ label, href, active, color }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              style={{
                padding: '5px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                fontSize: '0.68rem', fontWeight: 700,
                background: active ? color : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: active ? `0 2px 8px ${color}40` : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile actions row */}
      {actions && (
        <div
          className="ph-mobile-actions"
          style={{ gap: 8, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}
        >
          {actions}
        </div>
      )}

      {/* ── Menu sheet ────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="ph-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            />
            <motion.div
              key="ph-sheet"
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
                maxHeight: '86dvh', overflowY: 'auto',
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.45)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 16px', borderBottom: '1px solid var(--glass-border)', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 800 }}>{isPersonal ? 'Personal' : 'Business'}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>All sections</p>
                </div>
                <button onClick={() => setMenuOpen(false)} style={{ width: 34, height: 34, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>

              {!isPersonal ? (
                /* Business: 3-col grid */
                <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {menuLinks.map(({ label, href, icon: MIcon, color }) => (
                    <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px 12px', borderRadius: 18, textDecoration: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 14, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        <MIcon size={19} />
                      </div>
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                /* Personal: vertical list */
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {menuLinks.map(({ label, href, icon: MIcon, color }) => (
                    <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 16, textDecoration: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 13, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                          <MIcon size={18} />
                        </div>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
