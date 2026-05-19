'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Wrench, Package, UserCircle, LayoutGrid,
  LineChart, Users, ShoppingCart, ScrollText, Calculator,
  Receipt, TrendingUp, Banknote, HandCoins, ShoppingBag,
  Printer, Wallet, Utensils, PiggyBank, Settings, X,
  ChevronRight, Plus, DollarSign, BarChart2, User, CreditCard,
} from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────

const BAR_H      = 64;
const BUBBLE_D   = 54;
const NOTCH_D    = 24;
const CORNER_R   = 22;

// Business nav: 6 slots
const SLOTS = [
  { key: 'home',     href: '/business/dashboard', Icon: Home,       label: 'Home'     },
  { key: 'jobs',     href: '/business/repairs',   Icon: Wrench,     label: 'Jobs'     },
  { key: 'plus',     href: null,                  Icon: Plus,       label: '',        action: true  },
  { key: 'stock',    href: '/business/inventory', Icon: Package,    label: 'Stock'    },
  { key: 'personal', href: '/personal/dashboard', Icon: UserCircle, label: 'Personal' },
  { key: 'more',     href: null,                  Icon: LayoutGrid, label: 'More'     },
] as const;

// Personal nav: 4 slots (matches the wallet-app picture)
const PERSONAL_SLOTS = [
  { key: 'home',         href: '/personal/dashboard',    Icon: Home,        label: 'Home'     },
  { key: 'wallet',       href: '/personal/transactions', Icon: CreditCard,  label: 'Wallet'   },
  { key: 'analytics',    href: '/personal/analytics',    Icon: BarChart2,   label: 'Analytics'},
  { key: 'profile',      href: '/settings',              Icon: User,        label: 'Profile'  },
] as const;

const BIZ_MORE = [
  { label: 'Analytics',    href: '/business/analytics',    icon: LineChart    },
  { label: 'Sales',        href: '/business/sales',        icon: ShoppingCart },
  { label: 'Customers',    href: '/business/customers',    icon: Users        },
  { label: 'Debtors',      href: '/business/debtors',      icon: ScrollText   },
  { label: 'Expenses',     href: '/business/expenses',     icon: Receipt      },
  { label: 'Investments',  href: '/business/investments',  icon: TrendingUp   },
  { label: 'Loans',        href: '/business/loans',        icon: Banknote     },
  { label: 'Tithe',        href: '/business/tithe',        icon: HandCoins    },
  { label: 'Market List',  href: '/business/market-list',  icon: ShoppingBag  },
  { label: 'Calculator',   href: '/business/calculator',   icon: Calculator   },
  { label: 'Daily Report', href: '/business/reports/daily',icon: Printer      },
];

const PERSONAL_MORE = [
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart  },
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet     },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils   },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank  },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins  },
];

const MORE_HREFS = [...BIZ_MORE.map(i => i.href), ...PERSONAL_MORE.map(i => i.href), '/settings'];

const QUICK_CREATE_BIZ = [
  { label: 'New Repair Job', icon: Wrench,     action: 'new-job'     },
  { label: 'Add Inventory',  icon: Package,    action: 'new-item'    },
  { label: 'Record Sale',    icon: DollarSign, action: 'new-sale'    },
  { label: 'Add Expense',    icon: Receipt,    action: 'new-expense' },
];

const QUICK_CREATE_PERSONAL = [
  { label: 'Add Transaction', icon: Wallet,  action: 'new-tx'   },
  { label: 'Food Credit',     icon: Utensils, action: 'new-food' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPathActive(pathname: string, href: string) {
  if (href.endsWith('/dashboard') || href.endsWith('/daily')) return pathname === href;
  return pathname.startsWith(href);
}

function getActiveSlot(pathname: string): number {
  if (pathname === '/business/dashboard')               return 0;
  if (pathname.startsWith('/business/repairs'))         return 1;
  if (pathname.startsWith('/business/inventory'))       return 3;
  if (pathname === '/personal/dashboard')               return 4;
  if (MORE_HREFS.some(h => isPathActive(pathname, h))) return 5;
  return 0;
}

function getPersonalActiveSlot(pathname: string): number {
  if (pathname === '/personal/dashboard')                                           return 0;
  if (pathname.startsWith('/personal/transactions') || pathname.startsWith('/personal/food-vendor') || pathname.startsWith('/personal/savings') || pathname.startsWith('/personal/tithe')) return 1;
  if (pathname.startsWith('/personal/analytics'))                                  return 2;
  if (pathname === '/settings')                                                     return 3;
  return 0;
}

// ── SVG bar path with smooth wave notch ──────────────────────────────────────
// Always same command count so Framer Motion can interpolate between positions.

function buildBarPath(w: number, h: number, cx: number, depth: number): string {
  const r  = CORNER_R;
  const tx = 38; // horizontal bezier tangent — controls wave width
  const lj = Math.max(r + 2,     cx - tx - 10);
  const rj = Math.min(w - r - 2, cx + tx + 10);
  return [
    `M 0,${h}`,
    `L 0,${r}`,
    `Q 0,0 ${r},0`,
    `L ${lj},0`,
    `C ${cx - tx},0 ${cx - 12},${depth} ${cx},${depth}`,
    `C ${cx + 12},${depth} ${cx + tx},0 ${rj},0`,
    `L ${w - r},0`,
    `Q ${w},0 ${w},${r}`,
    `L ${w},${h}`,
    `Z`,
  ].join(' ');
}

// ── Main component ────────────────────────────────────────────────────────────

export function MobileTabBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open,   setOpen]   = useState(false);
  const [create, setCreate] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [navW, setNavW] = useState(340);
  const [isDark, setIsDark] = useState(true);

  // Measure rendered nav width
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNavW(el.offsetWidth));
    ro.observe(el);
    setNavW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Track color theme
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.dataset.theme !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const isPersonal   = pathname.startsWith('/personal');
  const slotCount    = isPersonal ? 4 : 6;
  const activeSlot   = isPersonal ? getPersonalActiveSlot(pathname) : getActiveSlot(pathname);
  const slotW        = navW / slotCount;
  const bubbleCx     = slotW * activeSlot + slotW / 2;
  const bubbleLeft   = bubbleCx - BUBBLE_D / 2;
  const bubbleTop    = -(BUBBLE_D / 2) + NOTCH_D * 0.55;

  const barPath        = navW > 0 ? buildBarPath(navW, BAR_H, bubbleCx, NOTCH_D) : '';
  const activeSlots    = isPersonal ? PERSONAL_SLOTS : SLOTS;
  const ActiveSlotIcon = activeSlots[activeSlot]?.Icon;

  // Theme-aware colors
  const barFill    = isDark ? 'rgba(10,12,20,0.92)'      : 'rgba(250,247,243,0.90)';
  const barStroke  = isDark ? 'rgba(255,255,255,0.12)'   : 'rgba(0,0,0,0.09)';
  const iconColor  = isDark ? 'rgba(255,255,255,0.42)'   : 'rgba(60,50,40,0.45)';
  const glowTop    = isDark ? 'rgba(255,255,255,0.16)'   : 'rgba(255,255,255,0.9)';

  const handleQuickCreate = (action: string) => {
    setCreate(false);
    switch (action) {
      case 'new-job':     router.push('/business/repairs?new=1');       break;
      case 'new-item':    router.push('/business/inventory?new=1');     break;
      case 'new-sale':    router.push('/business/sales?new=1');         break;
      case 'new-expense': router.push('/business/expenses?new=1');      break;
      case 'new-tx':      router.push('/personal/transactions?new=1');  break;
      case 'new-food':    router.push('/personal/food-vendor?new=1');   break;
    }
  };

  const quickItems = isPersonal ? QUICK_CREATE_PERSONAL : QUICK_CREATE_BIZ;

  return (
    <>
      {/* ── Nav bar ─────────────────────────────────────────────────────── */}
      <div
        ref={navRef}
        style={{
          position: 'fixed',
          bottom: 'calc(14px + env(safe-area-inset-bottom))',
          left: 12, right: 12,
          height: BAR_H,
          zIndex: 1000,
          overflow: 'visible', // critical — bubble pops above the bar
        }}
      >
        {/* SVG bar with animated wave notch */}
        {navW > 0 && (
          <svg
            width={navW}
            height={BAR_H}
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            {/* Main bar fill */}
            <motion.path
              d={barPath}
              animate={{ d: barPath }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              fill={barFill}
              style={{ backdropFilter: 'blur(40px)' }}
            />
            {/* Top shimmer border */}
            <motion.path
              d={barPath}
              animate={{ d: barPath }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              fill="none"
              stroke={glowTop}
              strokeWidth={1}
            />
            {/* Outer stroke */}
            <motion.path
              d={barPath}
              animate={{ d: barPath }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              fill="none"
              stroke={barStroke}
              strokeWidth={1}
            />
          </svg>
        )}

        {/* Floating bubble — active item */}
        {navW > 0 && (
          <motion.div
            animate={{ left: bubbleLeft }}
            initial={{ left: bubbleLeft }}
            transition={{ type: 'spring', stiffness: 420, damping: 35 }}
            style={{
              position: 'absolute',
              top: bubbleTop,
              width: BUBBLE_D, height: BUBBLE_D,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #E01535 0%, #C8102E 55%, #9B0D22 100%)',
              boxShadow: [
                '0 8px 28px rgba(200,16,46,0.62)',
                '0 2px 8px rgba(200,16,46,0.38)',
                'inset 0 1.5px 0 rgba(255,190,180,0.35)',
                'inset 0 -1px 0 rgba(80,0,10,0.2)',
              ].join(', '),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              key={activeSlot}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {ActiveSlotIcon && <ActiveSlotIcon size={22} color="#fff" strokeWidth={2.2} />}
            </motion.div>
          </motion.div>
        )}

        {/* Slot touch targets (flex row, fills bar) */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'stretch' }}>
          {activeSlots.map((slot, i) => {
            // Plus action button (business only)
            if ('action' in slot) {
              return (
                <button
                  key="plus"
                  onClick={() => setCreate(true)}
                  style={{
                    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    WebkitTapHighlightColor: 'transparent', outline: 'none',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 13,
                    background: 'linear-gradient(145deg, #E01535, #C8102E, #9B0D22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 18px rgba(200,16,46,0.52), inset 0 1px 0 rgba(255,180,170,0.3)',
                  }}>
                    <Plus size={20} color="white" strokeWidth={2.5} />
                  </div>
                </button>
              );
            }

            // More button (business only)
            if (slot.key === 'more') {
              const Icon = slot.Icon;
              return (
                <button
                  key="more"
                  onClick={() => setOpen(true)}
                  style={{
                    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    WebkitTapHighlightColor: 'transparent', outline: 'none',
                  }}
                >
                  <Icon
                    size={20}
                    color={activeSlot === 5 ? 'transparent' : iconColor}
                    strokeWidth={1.8}
                  />
                </button>
              );
            }

            // Regular nav link
            const isActive = activeSlot === i;
            const Icon     = slot.Icon;
            return (
              <Link
                key={slot.key}
                href={slot.href as string}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3,
                  textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Icon
                  size={20}
                  color={isActive ? 'transparent' : iconColor}
                  strokeWidth={1.8}
                />
                {isPersonal && (
                  <span style={{
                    fontSize: '0.55rem', fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'transparent' : iconColor,
                    lineHeight: 1,
                  }}>
                    {slot.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Quick create sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {create && (
          <>
            <motion.div
              key="create-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setCreate(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            />
            <motion.div
              key="create-sheet"
              initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
                background: 'var(--glass-bg-strong)', backdropFilter: 'var(--glass-blur-strong)', WebkitBackdropFilter: 'var(--glass-blur-strong)',
                borderRadius: '28px 28px 0 0', border: '1px solid var(--glass-border)', borderBottom: 'none',
                paddingBottom: 'calc(var(--space-8) + env(safe-area-inset-bottom))',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>
              <div style={{ padding: '4px var(--space-5) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', marginBottom: 'var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Quick Create</p>
                <button onClick={() => setCreate(false)} style={{ width: 34, height: 34, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 var(--space-5)' }}>
                {quickItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.action}
                      onClick={() => handleQuickCreate(item.action)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 'var(--space-4)', borderRadius: 16,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(200,16,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} style={{ color: '#C8102E' }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── More sheet ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
                background: 'var(--glass-bg-strong)', backdropFilter: 'var(--glass-blur-strong)', WebkitBackdropFilter: 'var(--glass-blur-strong)',
                borderRadius: '28px 28px 0 0', border: '1px solid var(--glass-border)', borderBottom: 'none',
                maxHeight: '86dvh', overflowY: 'auto',
                paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom))',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px var(--space-5) var(--space-4)', borderBottom: '1px solid var(--glass-border)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Menu</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>All sections</p>
                </div>
                <button onClick={() => setOpen(false)} style={{ width: 34, height: 34, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '0 var(--space-4)' }}>
                <SheetSection label="Business" color="#C8102E" />
                <NavGrid items={BIZ_MORE} pathname={pathname} accentColor="#C8102E" accentGlow="rgba(200,16,46,0.14)" onNavigate={() => setOpen(false)} />
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <SheetSection label="Personal" color="#D4A535" />
                  <NavGrid items={PERSONAL_MORE} pathname={pathname} accentColor="#D4A535" accentGlow="rgba(212,165,53,0.14)" onNavigate={() => setOpen(false)} />
                </div>
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--glass-border)' }}>
                  <Link href="/settings" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', borderRadius: 14, textDecoration: 'none', background: pathname === '/settings' ? 'var(--bg-elevated)' : 'transparent', border: `1px solid ${pathname === '/settings' ? 'var(--border-subtle)' : 'transparent'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: pathname === '/settings' ? 'rgba(200,16,46,0.12)' : 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pathname === '/settings' ? '#C8102E' : 'var(--text-secondary)' }}>
                        <Settings size={17} strokeWidth={1.8} />
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: pathname === '/settings' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Settings</span>
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

// ── Sheet sub-components ──────────────────────────────────────────────────────

function SheetSection({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 'var(--space-3)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}80` }} />
      <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function NavGrid({ items, pathname, accentColor, accentGlow, onNavigate }: {
  items: { label: string; href: string; icon: React.ElementType }[];
  pathname: string; accentColor: string; accentGlow: string; onNavigate: () => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {items.map((item) => {
        const Icon   = item.icon;
        const active = isPathActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px 10px', borderRadius: 18, textDecoration: 'none', background: active ? accentGlow : 'var(--bg-elevated)', border: `1px solid ${active ? accentColor + '38' : 'transparent'}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: active ? accentColor + '22' : 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? accentColor : 'var(--text-secondary)', boxShadow: active ? `0 4px 14px ${accentColor}25` : 'none' }}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
            </div>
            <span style={{ fontSize: '0.6rem', fontWeight: active ? 700 : 500, color: active ? accentColor : 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
