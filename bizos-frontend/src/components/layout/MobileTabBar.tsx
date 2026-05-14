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
  ChevronRight,
} from 'lucide-react';

const TAB_ITEMS = [
  { href: '/business/dashboard', icon: Home,       label: 'Home'     },
  { href: '/business/repairs',   icon: Wrench,     label: 'Jobs'     },
  { href: '/business/inventory', icon: Package,    label: 'Stock'    },
  { href: '/personal/dashboard', icon: UserCircle, label: 'Personal' },
];

const BIZ_MORE = [
  { label: 'Analytics',    href: '/business/analytics',    icon: LineChart    },
  { label: 'Sales',        href: '/business/sales',         icon: ShoppingCart },
  { label: 'Customers',    href: '/business/customers',     icon: Users        },
  { label: 'Debtors',      href: '/business/debtors',       icon: ScrollText   },
  { label: 'Expenses',     href: '/business/expenses',      icon: Receipt      },
  { label: 'Investments',  href: '/business/investments',   icon: TrendingUp   },
  { label: 'Loans',        href: '/business/loans',         icon: Banknote     },
  { label: 'Tithe',        href: '/business/tithe',         icon: HandCoins    },
  { label: 'Market List',  href: '/business/market-list',   icon: ShoppingBag  },
  { label: 'Calculator',   href: '/business/calculator',    icon: Calculator   },
  { label: 'Daily Report', href: '/business/reports/daily', icon: Printer      },
];

const PERSONAL_MORE = [
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart  },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet     },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils   },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank  },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins  },
];

const MORE_HREFS = [...BIZ_MORE.map(i => i.href), ...PERSONAL_MORE.map(i => i.href), '/settings'];

function isPathActive(pathname: string, href: string) {
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
              className={`mobile-nav-item${active ? ' active' : ''}`}
            >
              <div className="mobile-nav-icon">
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          className={`mobile-nav-item${isMoreActive || open ? ' more-active' : ''}`}
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          <div className="mobile-nav-icon">
            <LayoutGrid size={20} strokeWidth={isMoreActive || open ? 2.4 : 1.8} />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* ── More sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            />

            <motion.div
              key="sheet"
              initial={{ y: '100%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
                background: 'var(--glass-bg-strong)',
                backdropFilter: 'var(--glass-blur-strong)',
                WebkitBackdropFilter: 'var(--glass-blur-strong)',
                borderRadius: '28px 28px 0 0',
                border: '1px solid var(--glass-border)',
                borderBottom: 'none',
                maxHeight: '86dvh',
                overflowY: 'auto',
                paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom))',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>

              {/* Sheet header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px var(--space-5) var(--space-4)',
                borderBottom: '1px solid var(--glass-border)',
                marginBottom: 'var(--space-4)',
              }}>
                <div>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    Menu
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    All sections
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 34, height: 34, borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '0 var(--space-4)' }}>

                {/* Business */}
                <SheetSection label="Business" color="#C8102E" />
                <NavGrid
                  items={BIZ_MORE}
                  pathname={pathname}
                  accentColor="#C8102E"
                  accentGlow="rgba(200,16,46,0.14)"
                  onNavigate={() => setOpen(false)}
                />

                {/* Personal */}
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <SheetSection label="Personal" color="#D4A535" />
                  <NavGrid
                    items={PERSONAL_MORE}
                    pathname={pathname}
                    accentColor="#D4A535"
                    accentGlow="rgba(212,165,53,0.14)"
                    onNavigate={() => setOpen(false)}
                  />
                </div>

                {/* Settings */}
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--glass-border)' }}>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 14, textDecoration: 'none',
                      background: pathname === '/settings' ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${pathname === '/settings' ? 'var(--border-subtle)' : 'transparent'}`,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: pathname === '/settings' ? 'rgba(200,16,46,0.12)' : 'var(--bg-overlay)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: pathname === '/settings' ? '#C8102E' : 'var(--text-secondary)',
                      }}>
                        <Settings size={17} strokeWidth={1.8} />
                      </div>
                      <span style={{
                        fontSize: 'var(--text-sm)', fontWeight: 600,
                        color: pathname === '/settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}>
                        Settings
                      </span>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
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

// ── Sub-components ──────────────────────────────────────────────────

function SheetSection({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 'var(--space-3)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}80` }} />
      <p style={{
        fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.14em', color: 'var(--text-muted)',
      }}>
        {label}
      </p>
    </div>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {items.map((item) => {
        const Icon   = item.icon;
        const active = isPathActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, padding: '12px 8px 10px',
              borderRadius: 18, textDecoration: 'none',
              background: active ? accentGlow : 'var(--bg-elevated)',
              border: `1px solid ${active ? accentColor + '38' : 'transparent'}`,
              transition: 'background 0.15s, transform 0.15s',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: active ? accentColor + '22' : 'var(--bg-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: active ? accentColor : 'var(--text-secondary)',
              boxShadow: active ? `0 4px 14px ${accentColor}25` : 'none',
              transition: 'all 0.18s',
            }}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
            </div>
            <span style={{
              fontSize: '0.6rem', fontWeight: active ? 700 : 500,
              color: active ? accentColor : 'var(--text-secondary)',
              textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word',
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
