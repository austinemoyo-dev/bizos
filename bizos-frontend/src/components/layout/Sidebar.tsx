'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  Receipt, TrendingUp, HandCoins, ShoppingBag,
  Wallet, Utensils, PiggyBank,
  Settings, LogOut, ChevronLeft, ChevronRight,
  LineChart, Users, Banknote, ScrollText, Printer, Calculator,
  Briefcase, User, BarChart2, Target,
} from 'lucide-react';
import { SyncIndicator } from '../shared/SyncIndicator';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoWordmark, LogoMark } from './LogoMark';
import { useLowStock } from '@/lib/hooks/useLowStock';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useProfileStore } from '@/lib/stores/profileStore';
import { useEffect } from 'react';

const BUSINESS_NAV = [
  { label: 'Dashboard',   href: '/business/dashboard',     icon: LayoutDashboard },
  { label: 'Analytics',   href: '/business/analytics',     icon: LineChart       },
  { label: 'Repairs',     href: '/business/repairs',       icon: Wrench          },
  { label: 'Customers',   href: '/business/customers',     icon: Users           },
  { label: 'Inventory',   href: '/business/inventory',     icon: Package         },
  { label: 'Sales',       href: '/business/sales',         icon: ShoppingCart    },
  { label: 'Debtors',     href: '/business/debtors',       icon: ScrollText      },
  { label: 'Calculator',  href: '/business/calculator',    icon: Calculator      },
  { label: 'Expenses',    href: '/business/expenses',      icon: Receipt         },
  { label: 'Investments', href: '/business/investments',   icon: TrendingUp      },
  { label: 'Loans',       href: '/business/loans',         icon: Banknote        },
  { label: 'Recovery',    href: '/business/recovery',      icon: BarChart2       },
  { label: 'Tithe',       href: '/business/tithe',         icon: HandCoins       },
  { label: 'Market List', href: '/business/market-list',   icon: ShoppingBag     },
  { label: 'Daily Report',href: '/business/reports/daily', icon: Printer         },
];

const PERSONAL_NAV = [
  { label: 'Dashboard',    href: '/personal/dashboard',    icon: LayoutDashboard },
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart       },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet          },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils        },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank       },
  { label: 'Loans',        href: '/personal/loans',        icon: Banknote        },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins       },
  { label: 'Planning',     href: '/personal/planning',     icon: Target          },
];

// ── Nav Item ──────────────────────────────────────────────────────

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
        padding: collapsed ? '9px 8px' : '8px 11px',
        gap: collapsed ? 0 : 9,
      } as React.CSSProperties}
    >
      {/* Icon */}
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
            style={{
              whiteSpace: 'nowrap', overflow: 'hidden', flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            {label}
            {badge != null && badge > 0 && (
              <span style={{
                background: 'var(--accent-amber)', color: '#000',
                fontSize: '0.5rem', fontWeight: 800,
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

// ── Section heading ───────────────────────────────────────────────

function SectionHeading({ children, collapsed, color }: { children: string; collapsed: boolean; color: string }) {
  if (collapsed) {
    return <div style={{ height: 1, background: 'var(--glass-border)', margin: '8px 6px' }} />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 12px 5px' }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}90`,
        flexShrink: 0,
      }} />
      <p style={{
        fontSize: '0.57rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.14em', color: 'var(--text-muted)',
      }}>
        {children}
      </p>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────

export function Sidebar() {
  const pathname  = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isPersonal = pathname.startsWith('/personal');
  const { count: lowStockCount } = useLowStock();
  const { activeScope, setActiveScope } = useUIStore();

  const { loadFromStorage } = useProfileStore();
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  // Keep activeScope in sync with current URL
  useEffect(() => {
    const derived = pathname.startsWith('/personal') ? 'personal' : 'business';
    if (derived !== activeScope) setActiveScope(derived);
  }, [pathname, activeScope, setActiveScope]);

  const bizColor      = '#8B0018';
  const bizGlow       = 'rgba(139,0,24,0.16)';
  const personalColor = '#D4A535';
  const personalGlow  = 'rgba(212,165,53,0.14)';
  const accentColor   = isPersonal ? personalColor : bizColor;

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/auth/logout`, {
        method: 'POST', credentials: 'include',
      });
    } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: collapsed ? 52 : 216 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ flexShrink: 0 }}
    >
      {/* Top edge accent glow */}
      <div style={{
        position: 'absolute', top: 0, left: 14, right: 14, height: 1,
        background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`,
        pointerEvents: 'none', zIndex: 1,
        transition: 'background 0.4s',
      }} />

      {/* ── Logo header ─────────────────────────────────── */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8, position: 'relative', zIndex: 1,
      }}>
        <AnimatePresence initial={false} mode="wait">
          {collapsed ? (
            <motion.div key="mark"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.14 }}
            >
              <LogoMark size={22} color={accentColor} />
            </motion.div>
          ) : (
            <motion.div key="wordmark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
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

      {/* ── Expand button (collapsed) ────────────────────── */}
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
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ChevronRight size={13} />
        </button>
      )}


      {/* ── Scope switcher ──────────────────────────────── */}
      <div style={{
        padding: collapsed ? '6px 6px' : '6px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        {collapsed ? (
          /* Collapsed: two stacked color dots */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => { setActiveScope('business'); router.push('/business/dashboard'); }}
              title="Business"
              style={{
                width: 28, height: 14, borderRadius: 7,
                background: activeScope === 'business' ? '#8B0018' : 'rgba(255,255,255,0.07)',
                border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                boxShadow: activeScope === 'business' ? '0 0 8px rgba(139,0,24,0.5)' : 'none',
              }}
            />
            <button
              onClick={() => { setActiveScope('personal'); router.push('/personal/dashboard'); }}
              title="Personal"
              style={{
                width: 28, height: 14, borderRadius: 7,
                background: activeScope === 'personal' ? '#D4A535' : 'rgba(255,255,255,0.07)',
                border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                boxShadow: activeScope === 'personal' ? '0 0 8px rgba(212,165,53,0.5)' : 'none',
              }}
            />
          </div>
        ) : (
          /* Expanded: pill toggle */
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 50, padding: 3, gap: 2,
          }}>
            {([
              { key: 'business', label: 'Business', Icon: Briefcase, color: '#8B0018', glow: 'rgba(139,0,24,0.35)' },
              { key: 'personal', label: 'Personal',  Icon: User,      color: '#D4A535', glow: 'rgba(212,165,53,0.35)' },
            ] as const).map(({ key, label, Icon, color, glow }) => {
              const active = activeScope === key;
              return (
                <button
                  key={key}
                  onClick={() => { setActiveScope(key); router.push(key === 'business' ? '/business/dashboard' : '/personal/dashboard'); }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '5px 8px', borderRadius: 50,
                    fontSize: '0.6rem', fontWeight: 700,
                    background: active ? color : 'transparent',
                    color: active ? '#fff' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                    whiteSpace: 'nowrap',
                    boxShadow: active ? `0 2px 8px ${glow}` : 'none',
                  }}
                >
                  <Icon size={10} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '4px 6px',
        scrollbarWidth: 'none',
        position: 'relative', zIndex: 1,
      }}>
        <SectionHeading collapsed={collapsed} color={bizColor}>Business</SectionHeading>

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

        <SectionHeading collapsed={collapsed} color={personalColor}>Personal</SectionHeading>

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

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{
        padding: '8px 8px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'relative', zIndex: 1,
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
            <UserAvatar
              size={32}
              style={{
                border: `2px solid ${accentColor}30`,
                boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.3)`,
              }}
            />

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
                    fontSize: 'var(--text-xs)', fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {user?.name}
                  </p>
                  <p style={{
                    fontSize: '0.58rem', color: 'var(--text-muted)',
                    textTransform: 'capitalize', marginTop: 1,
                  }}>
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
              style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8 }}
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
