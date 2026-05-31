'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Wrench, Banknote, User, CreditCard, Target } from 'lucide-react';

// ── Nav slots ─────────────────────────────────────────────────────────────────

const BUSINESS_SLOTS = [
  { key: 'home',    href: '/business/dashboard', Icon: Home,     label: 'Home'    },
  { key: 'jobs',    href: '/business/repairs',   Icon: Wrench,   label: 'Jobs'    },
  { key: 'loans',   href: '/business/loans',     Icon: Banknote, label: 'Loans'   },
  { key: 'profile', href: '/settings',           Icon: User,     label: 'Profile' },
] as const;

const PERSONAL_SLOTS = [
  { key: 'home',     href: '/personal/dashboard',    Icon: Home,       label: 'Home'     },
  { key: 'wallet',   href: '/personal/transactions', Icon: CreditCard, label: 'Wallet'   },
  { key: 'planning', href: '/personal/planning',     Icon: Target,     label: 'Planning' },
  { key: 'profile',  href: '/settings',              Icon: User,       label: 'Profile'  },
] as const;

// ── Active slot resolution ────────────────────────────────────────────────────

function getBusinessActive(p: string): number {
  if (p === '/business/dashboard')       return 0;
  if (p.startsWith('/business/repairs')) return 1;
  if (p.startsWith('/business/loans'))   return 2;
  if (p === '/settings')                 return 3;
  return 0;
}

function getPersonalActive(p: string): number {
  if (p === '/personal/dashboard')          return 0;
  if (p.startsWith('/personal/transactions') ||
      p.startsWith('/personal/food-vendor') ||
      p.startsWith('/personal/savings')     ||
      p.startsWith('/personal/tithe'))      return 1;
  if (p.startsWith('/personal/planning'))   return 2;
  if (p === '/settings')                    return 3;
  return 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileTabBar() {
  const pathname   = usePathname();
  const isPersonal = pathname.startsWith('/personal');
  const slots      = isPersonal ? PERSONAL_SLOTS : BUSINESS_SLOTS;
  const activeIdx  = isPersonal ? getPersonalActive(pathname) : getBusinessActive(pathname);
  const pillId     = isPersonal ? 'tab-pill-personal' : 'tab-pill-business';

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.dataset.theme !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const accent        = isPersonal ? '#D4A535' : '#8B0018';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.36)';

  return (
    <div
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 'calc(14px + env(safe-area-inset-bottom))',
        left: 14, right: 14,
        height: 66,
        zIndex: 1000,
        borderRadius: 28,
        // Liquid glass base
        background: isDark
          ? 'rgba(10, 10, 16, 0.68)'
          : 'rgba(248, 248, 252, 0.68)',
        backdropFilter: 'blur(64px) saturate(2.4) brightness(1.12)',
        WebkitBackdropFilter: 'blur(64px) saturate(2.4) brightness(1.12)',
        // Glass border — lighter at top (refraction edge)
        border: isDark
          ? '1px solid rgba(255,255,255,0.10)'
          : '1px solid rgba(255,255,255,0.55)',
        boxShadow: isDark
          ? [
              '0 12px 48px rgba(0,0,0,0.70)',
              '0 2px 0 rgba(255,255,255,0.06) inset',
              '0 -1px 0 rgba(0,0,0,0.35) inset',
            ].join(', ')
          : [
              '0 12px 40px rgba(0,0,0,0.10)',
              '0 2px 0 rgba(255,255,255,0.95) inset',
            ].join(', '),
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        overflow: 'hidden',
      }}
    >
      {/* Specular top highlight — simulates glass catching light */}
      <div style={{
        position: 'absolute',
        top: 0, left: 24, right: 24, height: 1,
        background: isDark
          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Upper-half inner reflection */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '55%',
        background: isDark
          ? 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.40) 0%, transparent 100%)',
        borderRadius: '28px 28px 0 0',
        pointerEvents: 'none',
      }} />

      {slots.map((slot, i) => {
        const isActive = activeIdx === i;
        const Icon = slot.Icon;

        return (
          <Link
            key={slot.key}
            href={slot.href}
            aria-label={slot.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
              // Minimum touch target
              minHeight: 44,
            }}
          >
            {/* Animated glass pill — shared layout across tabs */}
            {isActive && (
              <motion.div
                layoutId={pillId}
                transition={{ type: 'spring', stiffness: 440, damping: 38, mass: 0.75 }}
                style={{
                  position: 'absolute',
                  inset: '9px 5px',
                  borderRadius: 18,
                  background: isDark
                    ? 'rgba(255,255,255,0.09)'
                    : 'rgba(255,255,255,0.72)',
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

            {/* Icon + label */}
            <motion.div
              animate={{ y: isActive ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 440, damping: 30 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                position: 'relative',
                zIndex: 1,
                paddingTop: 2,
                paddingBottom: 2,
                userSelect: 'none',
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
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  letterSpacing: isActive ? '0.025em' : 0,
                  transition: 'letter-spacing 0.2s',
                }}
              >
                {slot.label}
              </motion.span>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
