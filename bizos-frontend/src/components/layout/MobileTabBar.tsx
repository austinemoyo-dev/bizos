'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Wrench, Banknote, CreditCard, BarChart2, MoreHorizontal,
  X, Settings, Package, ShoppingCart, Receipt, TrendingUp,
  HandCoins, ShoppingBag, Printer, Calculator, Users, ScrollText,
  Utensils, PiggyBank, LineChart, Target, ChevronRight, Briefcase, User,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type Slot     = { key: string; href: string | null; Icon: React.ElementType; label: string };
type MoreItem = { label: string; href: string; Icon: React.ElementType; color: string };

// ── Main tab slots ─────────────────────────────────────────────────────────────

const BUSINESS_SLOTS: Slot[] = [
  { key: 'home',  href: '/business/dashboard', Icon: Home,           label: 'Home'  },
  { key: 'jobs',  href: '/business/repairs',   Icon: Wrench,         label: 'Jobs'  },
  { key: 'loans', href: '/business/loans',     Icon: Banknote,       label: 'Loans' },
  { key: 'more',  href: null,                  Icon: MoreHorizontal, label: 'More'  },
];

const PERSONAL_SLOTS: Slot[] = [
  { key: 'home',      href: '/personal/dashboard',    Icon: Home,           label: 'Home'      },
  { key: 'wallet',    href: '/personal/transactions', Icon: CreditCard,     label: 'Wallet'    },
  { key: 'analytics', href: '/personal/analytics',   Icon: BarChart2,      label: 'Analytics' },
  { key: 'more',      href: null,                    Icon: MoreHorizontal, label: 'More'      },
];

// ── More sheet items ──────────────────────────────────────────────────────────

const BUSINESS_MORE: MoreItem[] = [
  { label: 'Analytics',    href: '/business/analytics',     Icon: LineChart,    color: '#3B82F6' },
  { label: 'Customers',    href: '/business/customers',     Icon: Users,        color: '#06B6D4' },
  { label: 'Inventory',    href: '/business/inventory',     Icon: Package,      color: '#F97316' },
  { label: 'Sales',        href: '/business/sales',         Icon: ShoppingCart, color: '#10B981' },
  { label: 'Debtors',      href: '/business/debtors',       Icon: ScrollText,   color: '#EAB308' },
  { label: 'Calculator',   href: '/business/calculator',    Icon: Calculator,   color: '#6B7280' },
  { label: 'Expenses',     href: '/business/expenses',      Icon: Receipt,      color: '#EF4444' },
  { label: 'Investments',  href: '/business/investments',   Icon: TrendingUp,   color: '#10B981' },
  { label: 'Recovery',     href: '/business/recovery',      Icon: BarChart2,    color: '#A855F7' },
  { label: 'Tithe',        href: '/business/tithe',         Icon: HandCoins,    color: '#EC4899' },
  { label: 'Market List',  href: '/business/market-list',   Icon: ShoppingBag,  color: '#F59E0B' },
  { label: 'Daily Report', href: '/business/reports/daily', Icon: Printer,      color: '#64748B' },
  { label: 'Settings',     href: '/settings',               Icon: Settings,     color: '#9CA3AF' },
];

const PERSONAL_MORE: MoreItem[] = [
  { label: 'Food Vendor',  href: '/personal/food-vendor',  Icon: Utensils,   color: '#F59E0B' },
  { label: 'Loans',        href: '/personal/loans',        Icon: Banknote,   color: '#A78BFA' },
  { label: 'Savings',      href: '/personal/savings',      Icon: PiggyBank,  color: '#10B981' },
  { label: 'Tithe',        href: '/personal/tithe',        Icon: HandCoins,  color: '#EC4899' },
  { label: 'Planning',     href: '/personal/planning',     Icon: Target,     color: '#8B5CF6' },
  { label: 'Settings',     href: '/settings',              Icon: Settings,   color: '#9CA3AF' },
];

// ── Active slot resolution ────────────────────────────────────────────────────

function getBusinessActive(p: string): number {
  if (p === '/business/dashboard')       return 0;
  if (p.startsWith('/business/repairs')) return 1;
  if (p.startsWith('/business/loans'))   return 2;
  return 3; // More covers everything else
}

function getPersonalActive(p: string): number {
  if (p === '/personal/dashboard')            return 0;
  if (p.startsWith('/personal/transactions')) return 1;
  if (p.startsWith('/personal/analytics'))    return 2;
  return 3; // More covers food-vendor, savings, tithe, planning, settings
}

// ── More bottom sheet ─────────────────────────────────────────────────────────

function MoreSheet({
  open, onClose, items, isDark, accent, scope, userName, userRole,
}: {
  open: boolean;
  onClose: () => void;
  items: MoreItem[];
  isDark: boolean;
  accent: string;
  scope: 'business' | 'personal';
  userName: string;
  userRole: string;
}) {
  const sheetBg = isDark
    ? 'rgba(10, 10, 16, 0.82)'
    : 'rgba(248, 248, 252, 0.82)';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 1100,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40, mass: 0.9 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 1101,
              borderRadius: '28px 28px 0 0',
              background: sheetBg,
              backdropFilter: 'blur(60px) saturate(2.2)',
              WebkitBackdropFilter: 'blur(60px) saturate(2.2)',
              border: isDark
                ? '1px solid rgba(255,255,255,0.10)'
                : '1px solid rgba(255,255,255,0.55)',
              borderBottom: 'none',
              boxShadow: isDark
                ? '0 -12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 -12px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
              paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            {/* Specular top edge */}
            <div style={{
              position: 'absolute', top: 0, left: 32, right: 32, height: 1,
              background: isDark
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)',
              pointerEvents: 'none',
            }} />

            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{
                width: 38, height: 4, borderRadius: 2,
                background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
              }} />
            </div>

            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 20px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: `${accent}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${accent}30`,
                }}>
                  {scope === 'business'
                    ? <Briefcase size={15} color={accent} />
                    : <User size={15} color={accent} />
                  }
                </div>
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 800, color: isDark ? '#fff' : '#0a0a10', lineHeight: 1.2 }}>
                    {scope === 'business' ? 'Business' : 'Personal'}
                  </p>
                  <p style={{ fontSize: '0.6rem', color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)', marginTop: 2 }}>
                    All sections
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 34, height: 34, borderRadius: 11,
                  border: 'none', cursor: 'pointer',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Profile card */}
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{
                borderRadius: 18, padding: '14px 16px',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `linear-gradient(135deg, ${accent}cc, ${accent}77)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 800, color: '#fff',
                    border: `2px solid ${accent}40`,
                  }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#fff' : '#0a0a10', lineHeight: 1.2 }}>
                      {userName}
                    </p>
                    <p style={{ fontSize: '0.6rem', color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.4)', marginTop: 3, textTransform: 'capitalize' }}>
                      {userRole}
                    </p>
                  </div>
                </div>
                <Link href="/settings" onClick={onClose} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '7px 13px', borderRadius: 20,
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
                  }}>
                    <Settings size={12} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)' }}>
                      Settings
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Section label */}
            <div style={{ padding: '0 20px 12px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
                Navigate
              </p>
            </div>

            {/* Items grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10, padding: '0 16px',
            }}>
              {items.filter(i => i.href !== '/settings').map((item, idx) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div style={{
                      borderRadius: 18, padding: '16px 10px 14px',
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)',
                      border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      boxShadow: isDark
                        ? 'none'
                        : '0 2px 12px rgba(0,0,0,0.05)',
                      transition: 'transform 0.12s, background 0.12s',
                    }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 14,
                        background: `${item.color}18`,
                        border: `1px solid ${item.color}28`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <item.Icon size={20} color={item.color} strokeWidth={1.8} />
                      </div>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 600, textAlign: 'center',
                        color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.72)',
                        lineHeight: 1.3,
                      }}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Settings row (full-width, at bottom) */}
            <div style={{ padding: '14px 16px 0' }}>
              <Link href="/settings" onClick={onClose} style={{ textDecoration: 'none' }}>
                <div style={{
                  borderRadius: 16, padding: '14px 18px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)',
                  border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 11,
                      background: 'rgba(156,163,175,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Settings size={16} color="#9CA3AF" strokeWidth={1.8} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                      Settings
                    </span>
                  </div>
                  <ChevronRight size={14} color={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)'} />
                </div>
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main tab bar ──────────────────────────────────────────────────────────────

export function MobileTabBar() {
  const pathname   = usePathname();
  const isPersonal = pathname.startsWith('/personal');
  const slots      = isPersonal ? PERSONAL_SLOTS : BUSINESS_SLOTS;
  const activeIdx  = isPersonal ? getPersonalActive(pathname) : getBusinessActive(pathname);
  const pillId     = isPersonal ? 'tab-pill-personal' : 'tab-pill-business';
  const scope      = isPersonal ? 'personal' : 'business';

  const [isDark, setIsDark]     = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const userName = user?.name ?? 'You';
  const userRole = user?.role ?? 'user';

  // Close More sheet when navigating away
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.dataset.theme !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const accent        = isPersonal ? '#D4A535' : '#8B0018';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.36)';
  const moreItems     = isPersonal ? PERSONAL_MORE : BUSINESS_MORE;

  return (
    <>
      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: 'fixed',
          bottom: 'calc(14px + env(safe-area-inset-bottom))',
          left: 14, right: 14,
          zIndex: 1000,
          borderRadius: 28,
          background: isDark ? 'rgba(10,10,16,0.68)' : 'rgba(248,248,252,0.68)',
          backdropFilter: 'blur(64px) saturate(2.4) brightness(1.12)',
          WebkitBackdropFilter: 'blur(64px) saturate(2.4) brightness(1.12)',
          border: isDark
            ? '1px solid rgba(255,255,255,0.10)'
            : '1px solid rgba(255,255,255,0.55)',
          boxShadow: isDark
            ? '0 12px 48px rgba(0,0,0,0.70), 0 2px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.35) inset'
            : '0 12px 40px rgba(0,0,0,0.10), 0 2px 0 rgba(255,255,255,0.95) inset',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Scope switch strip ──────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 2 }}>
          <div style={{
            display: 'flex',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            borderRadius: 20, padding: 3,
          }}>
            {([
              { key: 'business' as const, label: 'Business', href: '/business/dashboard', color: '#8B0018' },
              { key: 'personal' as const, label: 'Personal', href: '/personal/dashboard', color: '#D4A535' },
            ]).map(({ key, label, href, color }) => {
              const scopeActive = scope === key;
              return (
                <Link key={key} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '4px 18px', borderRadius: 16, cursor: 'pointer',
                    fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap',
                    background: scopeActive ? color : 'transparent',
                    color: scopeActive ? '#fff' : isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)',
                    transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: scopeActive ? `0 2px 8px ${color}50` : 'none',
                  }}>
                    {label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Icons row ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', height: 62 }}>
        {/* Specular top highlight */}
        <div style={{
          position: 'absolute', top: 0, left: 24, right: 24, height: 1,
          background: isDark
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Upper-half inner reflection */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
          background: isDark
            ? 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.40) 0%, transparent 100%)',
          borderRadius: '28px 28px 0 0',
          pointerEvents: 'none',
        }} />

        {slots.map((slot, i) => {
          const isActive = activeIdx === i;
          const isMore   = slot.href === null;
          const Icon     = slot.Icon;

          const inner = (
            <>
              {isActive && (
                <motion.div
                  layoutId={pillId}
                  transition={{ type: 'spring', stiffness: 440, damping: 38, mass: 0.75 }}
                  style={{
                    position: 'absolute',
                    inset: '9px 5px',
                    borderRadius: 18,
                    background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.72)',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.14)'
                      : '1px solid rgba(255,255,255,0.85)',
                    boxShadow: isDark
                      ? '0 2px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.16)'
                      : '0 2px 10px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                />
              )}
              <motion.div
                animate={{ y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 3, position: 'relative', zIndex: 1,
                  paddingTop: 2, paddingBottom: 2, userSelect: 'none',
                }}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 26 }}
                >
                  <Icon
                    size={20}
                    color={isActive ? accent : inactiveColor}
                    strokeWidth={isActive ? 2.4 : 1.6}
                  />
                </motion.div>
                <motion.span
                  animate={{ opacity: isActive ? 1 : 0.55 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? accent : inactiveColor,
                    lineHeight: 1, whiteSpace: 'nowrap',
                    letterSpacing: isActive ? '0.025em' : 0,
                    transition: 'letter-spacing 0.2s',
                  }}
                >
                  {slot.label}
                </motion.span>
              </motion.div>
            </>
          );

          const sharedStyle: React.CSSProperties = {
            flex: 1, textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', position: 'relative', minHeight: 44,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          };

          return isMore ? (
            <button
              key={slot.key}
              aria-label="More options"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              style={sharedStyle}
            >
              {inner}
            </button>
          ) : (
            <Link
              key={slot.key}
              href={slot.href!}
              aria-label={slot.label}
              aria-current={isActive ? 'page' : undefined}
              style={sharedStyle}
            >
              {inner}
            </Link>
          );
        })}
        </div>
      </div>

      {/* ── More sheet ───────────────────────────────────────────── */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={moreItems}
        isDark={isDark}
        accent={accent}
        scope={scope}
        userName={userName}
        userRole={userRole}
      />
    </>
  );
}
