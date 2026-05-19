'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Wrench, BarChart2, User, CreditCard } from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────

const BAR_H      = 64;
const BUBBLE_D   = 54;
const NOTCH_D    = 24;
const CORNER_R   = 22;

// Business nav: 4 slots
const SLOTS = [
  { key: 'home',      href: '/business/dashboard',  Icon: Home,      label: 'Home'     },
  { key: 'jobs',      href: '/business/repairs',    Icon: Wrench,    label: 'Jobs'     },
  { key: 'analytics', href: '/business/analytics',  Icon: BarChart2, label: 'Analytics'},
  { key: 'profile',   href: '/settings',            Icon: User,      label: 'Profile'  },
] as const;

// Personal nav: 4 slots (matches the wallet-app picture)
const PERSONAL_SLOTS = [
  { key: 'home',         href: '/personal/dashboard',    Icon: Home,        label: 'Home'     },
  { key: 'wallet',       href: '/personal/transactions', Icon: CreditCard,  label: 'Wallet'   },
  { key: 'analytics',    href: '/personal/analytics',    Icon: BarChart2,   label: 'Analytics'},
  { key: 'profile',      href: '/settings',              Icon: User,        label: 'Profile'  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActiveSlot(pathname: string): number {
  if (pathname === '/business/dashboard')         return 0;
  if (pathname.startsWith('/business/repairs'))   return 1;
  if (pathname.startsWith('/business/analytics')) return 2;
  if (pathname === '/settings')                   return 3;
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
  const activeSlot   = isPersonal ? getPersonalActiveSlot(pathname) : getActiveSlot(pathname);
  const slotW        = navW / 4;
  const bubbleCx     = slotW * activeSlot + slotW / 2;
  const bubbleLeft   = bubbleCx - BUBBLE_D / 2;
  const bubbleTop    = -(BUBBLE_D / 2) + NOTCH_D * 0.55;

  const barPath = navW > 0 ? buildBarPath(navW, BAR_H, bubbleCx, NOTCH_D) : '';

  type NavSlot = { key: string; href: string; Icon: React.ElementType; label: string };
  const activeSlots    = (isPersonal ? PERSONAL_SLOTS : SLOTS) as unknown as NavSlot[];
  const ActiveSlotIcon = activeSlots[activeSlot]?.Icon;

  // Theme-aware colors
  const barFill    = isDark ? 'rgba(10,12,20,0.92)'      : 'rgba(250,247,243,0.90)';
  const barStroke  = isDark ? 'rgba(255,255,255,0.12)'   : 'rgba(0,0,0,0.09)';
  const iconColor  = isDark ? 'rgba(255,255,255,0.42)'   : 'rgba(60,50,40,0.45)';
  const glowTop    = isDark ? 'rgba(255,255,255,0.16)'   : 'rgba(255,255,255,0.9)';

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

        {/* Slot touch targets */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'stretch' }}>
          {activeSlots.map((slot, i) => {
            const isActive = activeSlot === i;
            const Icon     = slot.Icon;
            return (
              <Link
                key={slot.key}
                href={slot.href}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3,
                  textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Icon size={20} color={isActive ? 'transparent' : iconColor} strokeWidth={1.8} />
                <span style={{
                  fontSize: '0.55rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'transparent' : iconColor, lineHeight: 1,
                }}>
                  {slot.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

