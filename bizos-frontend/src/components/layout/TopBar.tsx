'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { LogoMark } from './LogoMark';
import { useThemeStore } from '@/lib/stores/themeStore';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useProfileStore } from '@/lib/stores/profileStore';

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/business/dashboard': { title: 'Overview',     subtitle: 'Business' },
  '/business/analytics': { title: 'Analytics',    subtitle: 'Business' },
  '/business/repairs':   { title: 'Repair Jobs',  subtitle: 'Business' },
  '/business/inventory': { title: 'Inventory',    subtitle: 'Business' },
  '/business/sales':     { title: 'Sales',         subtitle: 'Business' },
  '/business/expenses':  { title: 'Expenses',      subtitle: 'Business' },
  '/business/investments':{ title: 'Investments',  subtitle: 'Business' },
  '/business/tithe':     { title: 'Tithe',         subtitle: 'Business' },
  '/business/market-list':{ title: 'Market List',  subtitle: 'Business' },
  '/business/customers': { title: 'Customers',     subtitle: 'Business' },
  '/business/debtors':   { title: 'Debtors',       subtitle: 'Business' },
  '/business/calculator':{ title: 'Calculator',    subtitle: 'Business' },
  '/business/loans':     { title: 'Loans',          subtitle: 'Business' },
  '/business/reports/daily': { title: 'Daily Report', subtitle: 'Business' },
  '/settings':           { title: 'Settings' },
  '/personal/dashboard': { title: 'Overview',      subtitle: 'Personal' },
  '/personal/analytics': { title: 'Analytics',     subtitle: 'Personal' },
  '/personal/transactions':{ title: 'Transactions', subtitle: 'Personal' },
  '/personal/food-vendor':{ title: 'Food Vendor',   subtitle: 'Personal' },
  '/personal/savings':   { title: 'Savings',        subtitle: 'Personal' },
  '/personal/tithe':     { title: 'Tithe',           subtitle: 'Personal' },
  '/reports':            { title: 'Reports' },
};

export function TopBar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { isOnline } = useUIStore();
  const { user }  = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const isLight   = theme === 'light';

  const { loadFromStorage } = useProfileStore();
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const meta       = PAGE_META[pathname] ?? { title: 'BizOS' };
  const isPersonal = pathname.startsWith('/personal');
  const accentColor = isPersonal ? '#D4A535' : '#8B0018';

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 var(--space-5)',
      height: 'var(--header-height)',
      width: '100%', minWidth: 0, maxWidth: '100%',
      boxSizing: 'border-box',
      background: 'var(--glass-bg-strong)',
      backdropFilter: 'blur(20px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
      borderBottom: '1px solid var(--glass-border)',
      flexShrink: 0, zIndex: 50,
      gap: 'var(--space-3)',
      position: 'relative',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 2px 16px rgba(0,0,0,0.12)',
    }}>
      {/* Animated scope accent line */}
      <div className="topbar-accent-line">
        <motion.div
          key={isPersonal ? 'personal' : 'business'}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%', height: 2,
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}45 15%, ${accentColor} 50%, ${accentColor}45 85%, transparent 100%)`,
            transformOrigin: 'left',
          }}
        />
      </div>

      {/* Left: logo + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
        <LogoMark size={24} color={accentColor} />

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ minWidth: 0 }}
          >
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 700, color: 'var(--text-primary)',
              lineHeight: 1, letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {meta.title}
            </h1>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: search + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <GlobalSearch />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to sunlight mode'}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: isLight ? 'rgba(255,243,196,0.9)' : 'var(--bg-elevated)',
            border: `1px solid ${isLight ? '#D4A535' : 'var(--border-subtle)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
            color: isLight ? '#B8891A' : 'var(--text-secondary)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          }}
        >
          {isLight ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Online indicator — minimal dot */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 20,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isOnline ? 'var(--accent-green)' : 'var(--accent-red)',
            boxShadow: `0 0 7px ${isOnline ? '#10B981' : '#EF4444'}`,
            animation: isOnline ? 'none' : 'pulse 1.5s infinite',
            flexShrink: 0,
          }} />
          <span className="online-label" style={{
            fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.04em',
            color: isOnline ? 'var(--accent-green)' : 'var(--accent-red)',
            textTransform: 'uppercase',
          }}>
            {isOnline ? 'Live' : 'Off'}
          </span>
        </div>

        {/* Avatar */}
        <UserAvatar
          size={36}
          style={{
            boxShadow: `0 0 0 2px rgba(255,255,255,0.07), 0 0 0 3px ${accentColor}30, 0 2px 10px rgba(0,0,0,0.3)`,
            cursor: 'default',
          }}
        />
      </div>

      <style>{`
        .mobile-logo-mark { display: none; }
        .online-label { display: inline; }
        @media (max-width: 767px) {
          .mobile-logo-mark { display: block; }
          .online-label { display: none; }
        }
      `}</style>
    </header>
  );
}
