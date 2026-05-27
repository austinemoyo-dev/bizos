'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Wrench, Package, User, CreditCard, BarChart2 } from 'lucide-react';

// ── Nav slots ─────────────────────────────────────────────────────────────────

const BUSINESS_SLOTS = [
  { key: 'home',      href: '/business/dashboard',  Icon: Home,    label: 'Home'      },
  { key: 'jobs',      href: '/business/repairs',    Icon: Wrench,  label: 'Jobs'      },
  { key: 'inventory', href: '/business/inventory',  Icon: Package, label: 'Inventory' },
  { key: 'profile',   href: '/settings',            Icon: User,    label: 'Profile'   },
] as const;

const PERSONAL_SLOTS = [
  { key: 'home',      href: '/personal/dashboard',    Icon: Home,       label: 'Home'      },
  { key: 'wallet',    href: '/personal/transactions', Icon: CreditCard, label: 'Wallet'    },
  { key: 'analytics', href: '/personal/analytics',   Icon: BarChart2,  label: 'Analytics' },
  { key: 'profile',   href: '/settings',             Icon: User,       label: 'Profile'   },
] as const;

// ── Active slot helpers ───────────────────────────────────────────────────────

function getBusinessActive(p: string): number {
  if (p === '/business/dashboard')          return 0;
  if (p.startsWith('/business/repairs'))    return 1;
  if (p.startsWith('/business/inventory'))  return 2;
  if (p === '/settings')                    return 3;
  return 0;
}

function getPersonalActive(p: string): number {
  if (p === '/personal/dashboard')                     return 0;
  if (p.startsWith('/personal/transactions') ||
      p.startsWith('/personal/food-vendor')  ||
      p.startsWith('/personal/savings')      ||
      p.startsWith('/personal/tithe'))                 return 1;
  if (p.startsWith('/personal/analytics'))             return 2;
  if (p === '/settings')                               return 3;
  return 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileTabBar() {
  const pathname   = usePathname();
  const isPersonal = pathname.startsWith('/personal');
  const slots      = isPersonal ? PERSONAL_SLOTS : BUSINESS_SLOTS;
  const activeIdx  = isPersonal ? getPersonalActive(pathname) : getBusinessActive(pathname);

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.dataset.theme !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // Scope accent for active item
  const accent      = isPersonal ? '#D4A535' : '#8B0018';
  const pillBg      = isDark ? 'rgba(34,197,94,0.10)' : 'rgba(0,0,0,0.06)';
  const barBg       = isDark ? 'rgba(5,12,5,0.95)'    : 'rgba(255,255,255,0.95)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.32)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        left: 14, right: 14,
        height: 64,
        zIndex: 1000,
        borderRadius: 22,
        background: barBg,
        backdropFilter: 'blur(40px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
        border: `1px solid ${borderColor}`,
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(34,197,94,0.08) inset'
          : '0 8px 32px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.9) inset',
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
      }}
    >
      {slots.map((slot, i) => {
        const isActive = activeIdx === i;
        const Icon = slot.Icon;

        return (
          <Link
            key={slot.key}
            href={slot.href}
            style={{
              flex: 1,
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <motion.div
              animate={isActive
                ? { backgroundColor: pillBg, paddingLeft: 14, paddingRight: 14 }
                : { backgroundColor: 'transparent', paddingLeft: 8, paddingRight: 8 }
              }
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              style={{
                display: 'flex',
                flexDirection: isActive ? 'row' : 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isActive ? 6 : 3,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 14,
                minWidth: 0,
              }}
            >
              <motion.div
                animate={{ scale: isActive ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <Icon
                  size={isActive ? 18 : 20}
                  color={isActive ? accent : inactiveColor}
                  strokeWidth={isActive ? 2.4 : 1.7}
                />
              </motion.div>
              <motion.span
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  fontSize: isActive ? '0.68rem' : '0.55rem',
                }}
                transition={{ duration: 0.18 }}
                style={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? accent : inactiveColor,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
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
