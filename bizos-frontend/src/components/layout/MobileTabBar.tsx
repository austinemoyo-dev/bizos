'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Wrench, Package, UserCircle, LayoutGrid,
  LineChart, Users, ShoppingCart, ScrollText, Calculator,
  Receipt, TrendingUp, Banknote, HandCoins, ShoppingBag,
  Printer, Wallet, Utensils, PiggyBank, Settings, X,
} from 'lucide-react';

// ── Fixed 4 tab-bar items ──────────────────────────────────────────
const TAB_ITEMS = [
  { href: '/business/dashboard', icon: Home,        label: 'Home'     },
  { href: '/business/repairs',   icon: Wrench,      label: 'Jobs'     },
  { href: '/business/inventory', icon: Package,     label: 'Stock'    },
  { href: '/personal/dashboard', icon: UserCircle,  label: 'Personal' },
];

// ── "More" sheet contents ──────────────────────────────────────────
const BIZ_MORE = [
  { label: 'Analytics',    href: '/business/analytics',      icon: LineChart   },
  { label: 'Sales',        href: '/business/sales',           icon: ShoppingCart },
  { label: 'Customers',    href: '/business/customers',       icon: Users       },
  { label: 'Debtors',      href: '/business/debtors',         icon: ScrollText  },
  { label: 'Expenses',     href: '/business/expenses',        icon: Receipt     },
  { label: 'Investments',  href: '/business/investments',     icon: TrendingUp  },
  { label: 'Loans',        href: '/business/loans',           icon: Banknote    },
  { label: 'Tithe',        href: '/business/tithe',           icon: HandCoins   },
  { label: 'Market List',  href: '/business/market-list',     icon: ShoppingBag },
  { label: 'Calculator',   href: '/business/calculator',      icon: Calculator  },
  { label: 'Daily Report', href: '/business/reports/daily',   icon: Printer     },
];

const PERSONAL_MORE = [
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart  },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet     },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils   },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank  },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins  },
];

// Hrefs that live in the More sheet (used to highlight the More tab)
const MORE_HREFS: string[] = [
  ...BIZ_MORE.map(i => i.href),
  ...PERSONAL_MORE.map(i => i.href),
  '/settings',
];

function isPathActive(pathname: string, href: string) {
  // Exact match for leaf pages that share a prefix with other routes
  if (href.endsWith('/dashboard') || href.endsWith('/daily')) return pathname === href;
  return pathname.startsWith(href);
}

export function MobileTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isMoreActive = MORE_HREFS.some(href => isPathActive(pathname, href));

  return (
    <>
      {/* ── Bottom tab bar ──────────────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        {TAB_ITEMS.map((item) => {
          const active = isPathActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${active ? 'active' : ''}`}
            >
              <div className="mobile-nav-icon">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  style={active ? { filter: 'drop-shadow(0 2px 4px var(--accent-primary-glow))' } : {}}
                />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          className={`mobile-nav-item ${isMoreActive || open ? 'active' : ''}`}
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          <div className="mobile-nav-icon">
            <LayoutGrid
              size={22}
              strokeWidth={isMoreActive || open ? 2.5 : 2}
              style={(isMoreActive || open) ? { filter: 'drop-shadow(0 2px 4px var(--accent-primary-glow))' } : {}}
            />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* ── More sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            />

            {/* Sheet panel */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
                background: 'var(--glass-bg-strong)',
                backdropFilter: 'var(--glass-blur-strong)',
                WebkitBackdropFilter: 'var(--glass-blur-strong)',
                borderRadius: '24px 24px 0 0',
                border: '1px solid var(--glass-border)',
                borderBottom: 'none',
                maxHeight: '84dvh',
                overflowY: 'auto',
                paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom))',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>

              {/* Sheet header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-5) var(--space-4)',
              }}>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Menu
                </p>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '0 var(--space-4)' }}>

                {/* Business section */}
                <SectionLabel>Business</SectionLabel>
                <NavGrid items={BIZ_MORE} pathname={pathname} accentColor="#C8102E" accentGlow="rgba(200,16,46,0.15)" onNavigate={() => setOpen(false)} />

                {/* Personal section */}
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <SectionLabel>Personal</SectionLabel>
                  <NavGrid items={PERSONAL_MORE} pathname={pathname} accentColor="#D4A535" accentGlow="rgba(212,165,53,0.15)" onNavigate={() => setOpen(false)} />
                </div>

                {/* Settings row */}
                <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--space-4)' }}>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      borderRadius: 14, textDecoration: 'none',
                      background: pathname === '/settings' ? 'var(--bg-elevated)' : 'transparent',
                      color: pathname === '/settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Settings size={18} strokeWidth={1.8} />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Settings</span>
                  </Link>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{
      fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.14em', color: 'var(--text-muted)',
      marginBottom: 'var(--space-3)',
    }}>
      {children}
    </p>
  );
}

function NavGrid({
  items, pathname, accentColor, accentGlow, onNavigate,
}: {
  items: { label: string; href: string; icon: React.ElementType }[];
  pathname: string;
  accentColor: string;
  accentGlow: string;
  onNavigate: () => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-2)',
    }}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isPathActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-2)',
              borderRadius: 16, textDecoration: 'none',
              background: active ? accentGlow : 'var(--bg-elevated)',
              border: `1px solid ${active ? accentColor + '40' : 'transparent'}`,
              transition: 'background 0.15s',
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: active ? accentColor + '22' : 'var(--bg-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: active ? accentColor : 'var(--text-secondary)',
              flexShrink: 0,
            }}>
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
            </div>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: active ? 700 : 500,
              color: active ? accentColor : 'var(--text-secondary)',
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
