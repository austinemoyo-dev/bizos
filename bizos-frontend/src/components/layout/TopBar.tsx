'use client';

import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/stores/uiStore';
import { Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { LogoMark } from './LogoMark';
import { useThemeStore } from '@/lib/stores/themeStore';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/business/dashboard': { title: 'Overview', subtitle: 'Business' },
  '/business/analytics': { title: 'Analytics', subtitle: 'Business' },
  '/business/repairs': { title: 'Repair Jobs', subtitle: 'Business' },
  '/business/inventory': { title: 'Inventory', subtitle: 'Business' },
  '/business/sales': { title: 'Sales', subtitle: 'Business' },
  '/business/expenses': { title: 'Expenses', subtitle: 'Business' },
  '/business/investments': { title: 'Investments', subtitle: 'Business' },
  '/business/tithe': { title: 'Tithe', subtitle: 'Business' },
  '/business/market-list': { title: 'Market List', subtitle: 'Business' },
  '/business/customers': { title: 'Customers', subtitle: 'Business' },
  '/business/debtors': { title: 'Debtors', subtitle: 'Business' },
  '/business/calculator': { title: 'Calculator', subtitle: 'Business' },
  '/business/loans': { title: 'Loans', subtitle: 'Business' },
  '/business/reports/daily': { title: 'Daily Report', subtitle: 'Business' },
  '/settings': { title: 'Settings' },
  '/personal/dashboard': { title: 'Overview', subtitle: 'Personal' },
  '/personal/analytics': { title: 'Analytics', subtitle: 'Personal' },
  '/personal/transactions': { title: 'Transactions', subtitle: 'Personal' },
  '/personal/food-vendor': { title: 'Food Vendor', subtitle: 'Personal' },
  '/personal/savings': { title: 'Savings', subtitle: 'Personal' },
  '/personal/tithe': { title: 'Tithe', subtitle: 'Personal' },
  '/reports': { title: 'Reports' },
};

export function TopBar() {
  const pathname = usePathname();
  const { isOnline } = useUIStore();
  const { user } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const isLight = theme === 'light';

  const meta = PAGE_META[pathname] ?? { title: 'BizOS' };
  const isPersonal = pathname.startsWith('/personal');
  const accentColor = isPersonal ? '#D4A535' : '#C8102E';
  const accentGlow = isPersonal ? 'rgba(212,165,53,0.35)' : 'rgba(200,16,46,0.35)';

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 var(--space-5)',
      height: 'var(--header-height)',
      background: 'var(--glass-bg-strong)',
      backdropFilter: 'blur(20px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
      borderBottom: '1px solid var(--glass-border)',
      flexShrink: 0, zIndex: 50,
      gap: 'var(--space-3)',
      position: 'relative',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.15)',
    }}>
      {/* Bottom accent line — animates on scope switch */}
      <div className="topbar-accent-line">
        <motion.div
          key={isPersonal ? 'personal' : 'business'}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%', height: 2,
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}50 20%, ${accentColor} 50%, ${accentColor}50 80%, transparent 100%)`,
            transformOrigin: 'left',
          }}
        />
      </div>

      {/* Left: logo mark (mobile) + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
        <div className="mobile-logo-mark">
          <LogoMark size={28} color={accentColor} />
        </div>
        <div style={{ minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {meta.subtitle && (
                <p style={{
                  fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.12em', color: accentColor, lineHeight: 1,
                  marginBottom: 2,
                }}>
                  {meta.subtitle}
                </p>
              )}
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)',
                fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {meta.title}
              </h1>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: search + status + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        <div className="search-trigger"><GlobalSearch /></div>
        <div className="mobile-search-btn"><GlobalSearch /></div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to sunlight mode'}
          title={isLight ? 'Dark mode' : 'Sunlight mode (outdoor)'}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: isLight ? 'rgba(255,243,196,0.9)' : 'var(--bg-elevated)',
            border: `1px solid ${isLight ? '#D4A535' : 'var(--border-subtle)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
            color: isLight ? '#B8891A' : 'var(--text-secondary)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          {isLight ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Connectivity indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px', borderRadius: 20,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isOnline ? 'var(--accent-green)' : 'var(--accent-red)',
            boxShadow: `0 0 8px ${isOnline ? '#10B981' : '#EF4444'}`,
            animation: isOnline ? 'none' : 'pulse 1.5s infinite',
          }} />
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em',
            color: isOnline ? 'var(--accent-green)' : 'var(--accent-red)',
            textTransform: 'uppercase',
          }} className="online-label">
            {isOnline ? 'Live' : 'Off'}
          </span>
        </div>

        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${accentColor}, ${isPersonal ? '#A07820' : '#7B0018'})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 800,
          boxShadow: `0 2px 10px ${accentGlow}, 0 0 0 2px rgba(255,255,255,0.08)`,
          cursor: 'default',
          border: '2px solid rgba(255,255,255,0.1)',
        }} title={user?.name}>
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
      </div>

      <style>{`
        .mobile-logo-mark { display: none; }
        .search-trigger { display: flex; }
        .mobile-search-btn { display: none; }
        .online-label { display: inline; }
        @media (max-width: 768px) {
          .mobile-logo-mark { display: block; }
          .search-trigger { display: none; }
          .mobile-search-btn { display: flex; }
          .online-label { display: none; }
        }
      `}</style>
    </header>
  );
}
