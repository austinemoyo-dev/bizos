'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  Receipt, TrendingUp, HandCoins, ShoppingBag,
  Wallet, Utensils, PiggyBank, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, LineChart, Users, Banknote, ScrollText, Printer, Calculator
} from 'lucide-react';
import { SyncIndicator } from '../shared/SyncIndicator';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoWordmark, LogoMark } from './LogoMark';
import { useLowStock } from '@/lib/hooks/useLowStock';

const BUSINESS_NAV = [
  { label: 'Dashboard', href: '/business/dashboard', icon: LayoutDashboard },
  { label: 'Analytics', href: '/business/analytics', icon: LineChart },
  { label: 'Repairs', href: '/business/repairs', icon: Wrench },
  { label: 'Customers', href: '/business/customers', icon: Users },
  { label: 'Inventory', href: '/business/inventory', icon: Package },
  { label: 'Sales', href: '/business/sales', icon: ShoppingCart },
  { label: 'Debtors', href: '/business/debtors', icon: ScrollText },
  { label: 'Calculator', href: '/business/calculator', icon: Calculator },
  { label: 'Expenses', href: '/business/expenses', icon: Receipt },
  { label: 'Investor Funding', href: '/business/investments', icon: TrendingUp },
  { label: 'Loans', href: '/business/loans', icon: Banknote },
  { label: 'Tithe', href: '/business/tithe', icon: HandCoins },
  { label: 'Market List', href: '/business/market-list', icon: ShoppingBag },
  { label: 'Daily Report', href: '/business/reports/daily', icon: Printer },
];

const PERSONAL_NAV = [
  { label: 'Dashboard', href: '/personal/dashboard', icon: LayoutDashboard },
  { label: 'Analytics', href: '/personal/analytics', icon: LineChart },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet },
  { label: 'Food Vendor', href: '/personal/food-vendor', icon: Utensils },
  { label: 'Savings', href: '/personal/savings', icon: PiggyBank },
  { label: 'Tithe', href: '/personal/tithe', icon: HandCoins },
];

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  color: string;
  glow: string;
  badge?: number;
}

function NavItem({ href, icon: Icon, label, active, collapsed, color, glow, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 'var(--space-3)',
        padding: collapsed ? '10px' : '9px var(--space-3)',
        borderRadius: 12,
        fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 400,
        color: active ? color : 'var(--text-secondary)',
        background: active ? glow : 'transparent',
        transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
        textDecoration: 'none',
        position: 'relative',
        justifyContent: collapsed ? 'center' : 'flex-start',
        overflow: 'hidden',
        boxShadow: active ? `0 2px 12px ${glow}` : 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {/* Active left accent bar */}
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '15%', bottom: '15%',
          width: 3, borderRadius: '0 3px 3px 0',
          background: `linear-gradient(180deg, ${color}, ${color}99)`,
          boxShadow: `0 0 8px ${color}`,
        }} />
      )}

      {/* Active shine overlay */}
      {active && (
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
        {badge != null && badge > 0 && collapsed && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            background: 'var(--accent-amber)', color: '#000',
            fontSize: '0.55rem', fontWeight: 800, lineHeight: 1,
            width: 14, height: 14, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 6px rgba(245,158,11,0.5)',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            {label}
            {badge != null && badge > 0 && (
              <span style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#000',
                fontSize: '0.6rem', fontWeight: 800, lineHeight: 1,
                padding: '2px 6px', borderRadius: 20, marginLeft: 'auto',
                boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
              }}>
                {badge}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isPersonal = pathname.startsWith('/personal');
  const { count: lowStockCount } = useLowStock();

  const bizColor = '#C8102E';
  const bizGlow = 'rgba(200,16,46,0.15)';
  const personalColor = '#D4A535';
  const personalGlow = 'rgba(212,165,53,0.15)';

  const handleLogout = () => { clearAuth(); router.push('/login'); };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(24px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
        borderRight: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'sticky', top: 0,
        overflow: 'hidden', flexShrink: 0, zIndex: 100,
        boxShadow: '4px 0 24px rgba(0,0,0,0.2), inset -1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Top gradient accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${isPersonal ? personalColor : bizColor}40, transparent)`,
      }} />

      {/* Logo header */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-4)',
        borderBottom: '1px solid var(--glass-border)',
        flexShrink: 0, gap: 'var(--space-3)',
        justifyContent: collapsed ? 'center' : 'space-between',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <AnimatePresence initial={false} mode="wait">
          {collapsed ? (
            <motion.div key="mark" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <LogoMark size={26} color={isPersonal ? personalColor : bizColor} />
            </motion.div>
          ) : (
            <motion.div key="wordmark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LogoWordmark scope={isPersonal ? 'personal' : 'business'} />
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="btn-icon"
            style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8 }} aria-label="Collapse">
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Expand button */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            margin: 'var(--space-2)', padding: 'var(--space-2)', borderRadius: 8,
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', justifyContent: 'center',
            alignItems: 'center', transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          aria-label="Expand"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Scope switcher */}
      {!collapsed && (
        <div style={{ padding: 'var(--space-3) var(--space-3) var(--space-1)' }}>
          <div style={{
            display: 'flex', background: 'var(--bg-base)',
            borderRadius: 12, padding: 3, gap: 2,
            border: '1px solid var(--glass-border)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
          }}>
            {[
              { label: 'Business', href: '/business/dashboard', isActive: !isPersonal, color: bizColor },
              { label: 'Personal', href: '/personal/dashboard', isActive: isPersonal, color: personalColor },
            ].map((s) => (
              <Link key={s.label} href={s.href} style={{
                flex: 1, textAlign: 'center', padding: '7px 0',
                borderRadius: 10, fontSize: 'var(--text-xs)', fontWeight: 700,
                color: s.isActive ? s.color : 'var(--text-muted)',
                background: s.isActive ? 'var(--bg-elevated)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: s.isActive ? `0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)` : 'none',
                letterSpacing: '0.02em',
              }}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 'var(--space-2)', scrollbarWidth: 'thin' }}>
        {!collapsed && (
          <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', padding: 'var(--space-3) var(--space-3) var(--space-1)' }}>
            Business
          </p>
        )}
        {collapsed && <div style={{ height: 1, background: 'var(--glass-border)', margin: 'var(--space-2) var(--space-1)' }} />}

        {BUSINESS_NAV.map((item) => (
          <NavItem
            key={item.href} {...item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
            collapsed={collapsed} color={bizColor} glow={bizGlow}
            badge={item.href === '/business/inventory' ? lowStockCount : undefined}
          />
        ))}

        {!collapsed && (
          <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', padding: 'var(--space-4) var(--space-3) var(--space-1)' }}>
            Personal
          </p>
        )}
        {collapsed && <div style={{ height: 1, background: 'var(--glass-border)', margin: 'var(--space-2) var(--space-1)' }} />}

        {PERSONAL_NAV.map((item) => (
          <NavItem
            key={item.href} {...item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
            collapsed={collapsed} color={personalColor} glow={personalGlow}
          />
        ))}

        <div style={{ height: 1, background: 'var(--glass-border)', margin: 'var(--space-3) var(--space-1)' }} />

        <NavItem href="/reports" icon={BarChart3} label="Reports"
          active={pathname === '/reports'} collapsed={collapsed} color={bizColor} glow={bizGlow} />
        <NavItem href="/settings" icon={Settings} label="Settings"
          active={pathname === '/settings'} collapsed={collapsed} color={bizColor} glow={bizGlow} />
      </nav>

      {/* Footer */}
      <div style={{
        padding: 'var(--space-3)', borderTop: '1px solid var(--glass-border)', flexShrink: 0,
        background: 'rgba(0,0,0,0.1)',
      }}>
        {!collapsed && <div style={{ marginBottom: 'var(--space-3)' }}><SyncIndicator /></div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: collapsed ? 'center' : 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${isPersonal ? personalColor : bizColor}, ${isPersonal ? '#A07820' : '#7B0018'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 800,
              boxShadow: `0 2px 10px ${isPersonal ? 'rgba(212,165,53,0.4)' : 'rgba(200,16,46,0.4)'}`,
              border: '2px solid rgba(255,255,255,0.12)',
            }}>
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }}
                  style={{ minWidth: 0, overflow: 'hidden' }}
                >
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name}
                  </p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!collapsed && (
            <button className="btn-icon" onClick={handleLogout} aria-label="Logout" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8 }}>
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
