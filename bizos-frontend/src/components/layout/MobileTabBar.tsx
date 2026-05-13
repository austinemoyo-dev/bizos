'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wrench, Package, User, MoreHorizontal,
  ShoppingCart, Receipt, TrendingUp, HandCoins, ShoppingBag,
  Wallet, Utensils, PiggyBank, BarChart3, Settings, LogOut, X, LineChart, Users,
  ScrollText, Calculator, Banknote, Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import { LogoMark } from './LogoMark';

const MAIN_TABS = [
  { label: 'Home',     href: '/business/dashboard', icon: LayoutDashboard },
  { label: 'Repairs',  href: '/business/repairs',   icon: Wrench },
  { label: 'Stock',    href: '/business/inventory',  icon: Package },
  { label: 'Personal', href: '/personal/dashboard', icon: User },
];

const MORE_BUSINESS = [
  { label: 'Analytics',    href: '/business/analytics',    icon: LineChart },
  { label: 'Customers',    href: '/business/customers',    icon: Users },
  { label: 'Sales',        href: '/business/sales',        icon: ShoppingCart },
  { label: 'Debtors',      href: '/business/debtors',      icon: ScrollText },
  { label: 'Calculator',   href: '/business/calculator',   icon: Calculator },
  { label: 'Expenses',     href: '/business/expenses',     icon: Receipt },
  { label: 'Investments',  href: '/business/investments',  icon: TrendingUp },
  { label: 'Loans',        href: '/business/loans',        icon: Banknote },
  { label: 'Tithe',        href: '/business/tithe',        icon: HandCoins },
  { label: 'Market List',  href: '/business/market-list',  icon: ShoppingBag },
  { label: 'Daily Report', href: '/business/reports/daily', icon: Printer },
];

const MORE_PERSONAL = [
  { label: 'Transactions', href: '/personal/transactions', icon: Wallet },
  { label: 'Analytics',    href: '/personal/analytics',    icon: LineChart },
  { label: 'Food Vendor',  href: '/personal/food-vendor',  icon: Utensils },
  { label: 'Savings',      href: '/personal/savings',      icon: PiggyBank },
  { label: 'Tithe',        href: '/personal/tithe',        icon: HandCoins },
];

const MORE_OTHER = [
  { label: 'Reports',  href: '/reports',  icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavClick = (href: string) => { setDrawerOpen(false); router.push(href); };
  const handleLogout = () => { setDrawerOpen(false); clearAuth(); router.push('/login'); };

  const isMoreActive = ![...MAIN_TABS].some(t => pathname === t.href || pathname.startsWith(t.href + '/'));

  return (
    <>
      {/* Tab bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900,
        height: 'calc(68px + env(safe-area-inset-bottom))',
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }} className="mobile-tab-bar">

        {MAIN_TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const isPersonal = tab.href.startsWith('/personal');
          const color = isPersonal ? '#D4A535' : '#C8102E';
          const glow = isPersonal ? 'rgba(212,165,53,0.15)' : 'rgba(200,16,46,0.15)';
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, textDecoration: 'none',
              color: active ? color : '#4A5568',
              transition: 'color 0.18s cubic-bezier(0.16,1,0.3,1)',
              paddingTop: 8,
            }}>
              <div style={{
                width: 48, height: 30, display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: 14,
                background: active ? glow : 'transparent',
                transition: 'background 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s',
                position: 'relative',
                boxShadow: active ? `0 2px 10px ${glow}` : 'none',
              }}>
                <tab.icon size={20} strokeWidth={active ? 2.3 : 1.6} />
                {active && (
                  <motion.div layoutId="tab-pip"
                    style={{
                      position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                      width: 18, height: 3, borderRadius: 2,
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </div>
              <span style={{ fontSize: '0.57rem', fontWeight: active ? 700 : 400, letterSpacing: '0.02em', lineHeight: 1 }}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button onClick={() => setDrawerOpen(true)} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 4, background: 'none', border: 'none', cursor: 'pointer',
          color: isMoreActive ? '#C8102E' : '#4A5568',
          transition: 'color 0.18s',
          paddingTop: 8,
        }}>
          <div style={{
            width: 48, height: 30, display: 'flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: 14,
            background: isMoreActive ? 'rgba(200,16,46,0.15)' : 'transparent',
            transition: 'background 0.22s',
            boxShadow: isMoreActive ? '0 2px 10px rgba(200,16,46,0.15)' : 'none',
          }}>
            <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.3 : 1.6} />
          </div>
          <span style={{ fontSize: '0.57rem', fontWeight: isMoreActive ? 700 : 400, letterSpacing: '0.02em', lineHeight: 1 }}>
            More
          </span>
        </button>
      </nav>

      {/* More Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 950,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 960,
                background: 'var(--glass-bg-strong)',
                backdropFilter: 'blur(28px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
                borderRadius: '28px 28px 0 0',
                border: '1px solid var(--glass-border-shine)',
                borderBottom: 'none',
                maxHeight: '82dvh',
                display: 'flex', flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom)',
                boxShadow: '0 -12px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              {/* Top shine */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                pointerEvents: 'none',
              }} />

              {/* Handle + header */}
              <div style={{ padding: '14px 20px 10px', flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 3, background: 'var(--border-default)', margin: '0 auto 18px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 14,
                      background: 'linear-gradient(135deg, #C8102E, #7B0018)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(200,16,46,0.35)',
                    }}>
                      <LogoMark size={22} color="#fff" />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {user?.name}
                      </p>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{user?.role}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrawerOpen(false)}
                    style={{
                      width: 34, height: 34, borderRadius: 12,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--text-secondary)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '0 14px 24px' }}>
                <DrawerSection label="Business" color="#C8102E">
                  {MORE_BUSINESS.map(item => (
                    <DrawerItem key={item.href} {...item} active={pathname === item.href} color="#C8102E" onClick={() => handleNavClick(item.href)} />
                  ))}
                </DrawerSection>

                <DrawerSection label="Personal" color="#D4A535">
                  {MORE_PERSONAL.map(item => (
                    <DrawerItem key={item.href} {...item} active={pathname === item.href} color="#D4A535" onClick={() => handleNavClick(item.href)} />
                  ))}
                </DrawerSection>

                <DrawerSection label="General" color="#8B96A8">
                  {MORE_OTHER.map(item => (
                    <DrawerItem key={item.href} {...item} active={pathname === item.href} color="#C8102E" onClick={() => handleNavClick(item.href)} />
                  ))}
                </DrawerSection>

                {/* Logout */}
                <button onClick={handleLogout} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)',
                  cursor: 'pointer', marginTop: 6,
                  background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                  transition: 'background 0.15s',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'rgba(239,68,68,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <LogOut size={17} />
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .mobile-tab-bar { display: none !important; }
        @media (max-width: 768px) { .mobile-tab-bar { display: flex !important; } }
      `}</style>
    </>
  );
}

function DrawerSection({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{
        fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: 'var(--text-muted)',
        padding: '12px 16px 6px', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 12, height: 2, borderRadius: 1, background: color, display: 'inline-block' }} />
        {label}
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {children}
      </div>
    </div>
  );
}

function DrawerItem({ label, icon: Icon, active, color, onClick }: {
  label: string; href: string; icon: React.ElementType;
  active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
      padding: '11px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
      background: active ? `${color}12` : 'transparent',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'background 0.15s',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 13, flexShrink: 0,
        background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? color : 'var(--text-secondary)',
        transition: 'all 0.15s',
        border: `1px solid ${active ? `${color}30` : 'transparent'}`,
      }}>
        <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
      </div>
      <span style={{
        fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 400,
        color: active ? color : 'var(--text-primary)',
      }}>
        {label}
      </span>
      {active && (
        <div style={{
          marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%',
          background: color, boxShadow: `0 0 8px ${color}`,
        }} />
      )}
    </button>
  );
}
