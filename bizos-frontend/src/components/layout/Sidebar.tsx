'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  Receipt, TrendingUp, HandCoins, ShoppingBag,
  Wallet, Utensils, PiggyBank,
  Settings, LogOut, ChevronLeft, ChevronRight,
  LineChart, Users, Banknote, ScrollText, Printer, Calculator,
} from 'lucide-react';
import { SyncIndicator } from '../shared/SyncIndicator';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoWordmark, LogoMark } from './LogoMark';
import { useLowStock } from '@/lib/hooks/useLowStock';

const BUSINESS_NAV = [
  { label: 'Dashboard',       href: '/business/dashboard',      icon: LayoutDashboard },
  { label: 'Analytics',       href: '/business/analytics',      icon: LineChart       },
  { label: 'Repairs',         href: '/business/repairs',        icon: Wrench          },
  { label: 'Customers',       href: '/business/customers',      icon: Users           },
  { label: 'Inventory',       href: '/business/inventory',      icon: Package         },
  { label: 'Sales',           href: '/business/sales',          icon: ShoppingCart    },
  { label: 'Debtors',         href: '/business/debtors',        icon: ScrollText      },
  { label: 'Calculator',      href: '/business/calculator',     icon: Calculator      },
  { label: 'Expenses',        href: '/business/expenses',       icon: Receipt         },
  { label: 'Investments',     href: '/business/investments',    icon: TrendingUp      },
  { label: 'Loans',           href: '/business/loans',          icon: Banknote        },
  { label: 'Tithe',           href: '/business/tithe',          icon: HandCoins       },
  { label: 'Market List',     href: '/business/market-list',    icon: ShoppingBag     },
  { label: 'Daily Report',    href: '/business/reports/daily',  icon: Printer         },
];

const PERSONAL_NAV = [
  { label: 'Dashboard',    href: '/personal/dashboard',    icon: LayoutDashboard },
  { label: 'Analytics',   href: '/personal/analytics',    icon: LineChart       },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet          },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils        },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank       },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins       },
];

// ── Nav item ──────────────────────────────────────────────────────

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
      className={`sidebar-nav-item${active ? ' active' : ''}`}
      style={{
        '--nav-color': color,
        '--nav-glow': glow,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '8px' : '7px 10px',
        gap: collapsed ? 0 : 10,
      } as React.CSSProperties}
    >
      {/* Active accent bar */}
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '18%', bottom: '18%',
          width: 2.5, borderRadius: '0 2px 2px 0',
          background: color,
          boxShadow: `0 0 6px ${color}99`,
        }} />
      )}

      {/* Icon wrapper */}
      <span style={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
        <Icon size={15} strokeWidth={active ? 2.3 : 1.8} />
        {badge != null && badge > 0 && collapsed && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--accent-amber)', color: '#000',
            fontSize: '0.5rem', fontWeight: 800, lineHeight: 1,
            width: 13, height: 13, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>

      {/* Label */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            {label}
            {badge != null && badge > 0 && (
              <span style={{
                background: 'var(--accent-amber)', color: '#000',
                fontSize: '0.55rem', fontWeight: 800,
                padding: '1px 5px', borderRadius: 20,
                marginLeft: 'auto',
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

// ── Section label ─────────────────────────────────────────────────

function SectionHeading({ children, collapsed }: { children: string; collapsed: boolean }) {
  if (collapsed) {
    return <div style={{ height: 1, background: 'var(--glass-border)', margin: '6px 8px' }} />;
  }
  return (
    <p style={{
      fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.12em', color: 'var(--text-muted)',
      padding: '10px 10px 4px',
    }}>
      {children}
    </p>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────

export function Sidebar() {
  const pathname   = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router     = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isPersonal = pathname.startsWith('/personal');
  const { count: lowStockCount } = useLowStock();

  const bizColor      = '#C8102E';
  const bizGlow       = 'rgba(200,16,46,0.12)';
  const personalColor = '#D4A535';
  const personalGlow  = 'rgba(212,165,53,0.12)';
  const accentColor   = isPersonal ? personalColor : bizColor;

  const handleLogout = async () => {
    try { await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: collapsed ? 52 : 216 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ flexShrink: 0, borderRadius: 20 }}
    >
      {/* Accent colour glow along the top edge */}
      <div style={{
        position: 'absolute', top: 0, left: 12, right: 12, height: 1,
        background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
        pointerEvents: 'none', zIndex: 1,
        borderRadius: '0 0 4px 4px',
      }} />

      {/* ── Logo header ─────────────────────────────────────── */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
        position: 'relative', zIndex: 1,
      }}>
        <AnimatePresence initial={false} mode="wait">
          {collapsed ? (
            <motion.div key="mark"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.15 }}
            >
              <LogoMark size={22} color={accentColor} />
            </motion.div>
          ) : (
            <motion.div key="wordmark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <LogoWordmark scope={isPersonal ? 'personal' : 'business'} />
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button
            className="btn-icon"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0 }}
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {/* ── Expand button (collapsed state) ─────────────────── */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, margin: '8px auto 4px',
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            borderRadius: 8, transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)';    e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronRight size={13} />
        </button>
      )}

      {/* ── Scope switcher ───────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '8px 10px 2px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 10, padding: 3, gap: 2,
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {([
              { label: 'Business', href: '/business/dashboard', active: !isPersonal, color: bizColor },
              { label: 'Personal', href: '/personal/dashboard', active: isPersonal,  color: personalColor },
            ] as const).map(s => (
              <Link key={s.label} href={s.href} style={{
                flex: 1, textAlign: 'center',
                padding: '5px 0',
                borderRadius: 8,
                fontSize: '0.62rem', fontWeight: 700,
                color: s.active ? s.color : 'var(--text-muted)',
                background: s.active ? 'var(--bg-elevated)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.18s',
                boxShadow: s.active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                letterSpacing: '0.02em',
              }}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '4px 6px',
        scrollbarWidth: 'none',
        position: 'relative', zIndex: 1,
      }}>
        <SectionHeading collapsed={collapsed}>Business</SectionHeading>

        {BUSINESS_NAV.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
            collapsed={collapsed}
            color={bizColor}
            glow={bizGlow}
            badge={item.href === '/business/inventory' ? lowStockCount : undefined}
          />
        ))}

        <SectionHeading collapsed={collapsed}>Personal</SectionHeading>

        {PERSONAL_NAV.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
            collapsed={collapsed}
            color={personalColor}
            glow={personalGlow}
          />
        ))}

        <div style={{ height: 1, background: 'var(--glass-border)', margin: '8px 4px' }} />

        <NavItem href="/settings" icon={Settings} label="Settings"
          active={pathname === '/settings'}
          collapsed={collapsed} color={bizColor} glow={bizGlow}
        />
      </nav>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{
        padding: '8px 8px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        {!collapsed && (
          <div style={{ marginBottom: 8 }}>
            <SyncIndicator />
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${accentColor}, ${isPersonal ? '#A07820' : '#7B0018'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.6rem', fontWeight: 800,
              border: '1.5px solid rgba(255,255,255,0.12)',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ minWidth: 0, overflow: 'hidden' }}
                >
                  <p style={{
                    fontSize: 'var(--text-xs)', fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {user?.name}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {user?.role}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout */}
          {!collapsed && (
            <button
              className="btn-icon"
              onClick={handleLogout}
              aria-label="Logout"
              style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8 }}
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
