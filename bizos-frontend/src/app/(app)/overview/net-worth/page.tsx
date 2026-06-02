'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatNaira, formatCompact } from '@/lib/format';
import { fadeUp } from '@/lib/motion-variants';
import { Briefcase, User, Package, HandCoins, Banknote, Scale, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// ── Styles ───────────────────────────────────────────────────────

const card = {
  background: 'var(--bg-surface)', borderRadius: 20,
  padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
  marginBottom: 'var(--space-5)',
} as React.CSSProperties;

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: 'var(--space-3) 0',
};

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
};

const iconBox = (color: string): React.CSSProperties => ({
  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
  background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
});

// ── Tooltip ──────────────────────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div style={{ background: '#181C24', border: '1px solid #2A3347', borderRadius: 12, padding: '10px 14px' }}>
      <p style={{ fontSize: '0.65rem', color: '#8B96A8', marginBottom: 4 }}>{name}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: p.color }}>
        {formatNaira(value)}
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function NetWorthOverviewPage() {
  const { data: netWorth, isLoading } = useQuery({
    queryKey: ['net-worth'],
    queryFn: () => cashFlowApi.getNetWorth(),
  });

  const businessTotal = netWorth ? netWorth.business_cash + netWorth.inventory_value : 0;
  const personalTotal = netWorth ? netWorth.personal_cash : 0;
  const totalAssets = netWorth
    ? businessTotal + personalTotal + netWorth.loans_given_outstanding
    : 0;
  const totalLiabilities = netWorth ? netWorth.debts_owed_outstanding : 0;

  // Pie chart data — assets breakdown
  const pieData = netWorth
    ? [
        { name: 'Business Cash', value: Math.max(0, netWorth.business_cash), color: '#8B0018' },
        { name: 'Inventory', value: Math.max(0, netWorth.inventory_value), color: '#3B82F6' },
        { name: 'Personal Cash', value: Math.max(0, netWorth.personal_cash), color: '#D4A535' },
        { name: 'Loans Given', value: Math.max(0, netWorth.loans_given_outstanding), color: '#10B981' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <PageHeader
        title="Net Worth Overview"
        subtitle="Combined view of business and personal accounts · Assets − Liabilities"
      />

      {isLoading ? (
        <>
          <div className="skeleton" style={{ height: 140, borderRadius: 20, marginBottom: 'var(--space-5)' }} />
          <div className="skeleton" style={{ height: 340, borderRadius: 20, marginBottom: 'var(--space-5)' }} />
        </>
      ) : netWorth ? (
        <>
          {/* ── TOTAL NET WORTH HERO ───────────────────────────── */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
            background: netWorth.net_worth >= 0
              ? 'linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(16,185,129,0.05) 100%)'
              : 'linear-gradient(135deg,rgba(239,68,68,0.12) 0%,rgba(239,68,68,0.05) 100%)',
            border: `1px solid ${netWorth.net_worth >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: 20, padding: 'var(--space-6)',
            marginBottom: 'var(--space-5)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Scale size={16} style={{ color: netWorth.net_worth >= 0 ? '#10B981' : '#EF4444' }} />
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  Total Net Worth
                </p>
              </div>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
                fontWeight: 800, lineHeight: 1, margin: 0,
                color: netWorth.net_worth >= 0 ? '#10B981' : '#EF4444',
                letterSpacing: '-0.02em',
              }}>
                {formatNaira(netWorth.net_worth)}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
                {formatNaira(totalAssets)} assets − {formatNaira(totalLiabilities)} liabilities
              </p>
            </div>
            {/* Asset / Liability summary */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Total Assets</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color: '#10B981', margin: 0 }}>{formatNaira(totalAssets)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Total Liabilities</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color: '#EF4444', margin: 0 }}>{formatNaira(totalLiabilities)}</p>
              </div>
            </div>
          </motion.div>

          {/* ── ASSETS PIE + BREAKDOWN ──────────────────────────── */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
              Assets Breakdown
            </p>

            {/* Donut chart */}
            {pieData.length > 0 && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center' }}>
                  {pieData.map(({ name, value, color }) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>
                        {name}: <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{formatCompact(value)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business section */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 'var(--space-2)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <Briefcase size={12} style={{ color: '#8B0018' }} />
                <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#8B0018', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Business</p>
              </div>
              <div style={rowStyle}>
                <div style={labelStyle}>
                  <div style={iconBox('#8B0018')}><Briefcase size={13} style={{ color: '#8B0018' }} /></div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Business Cash</p>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#10B981', margin: 0 }}>+{formatNaira(netWorth.business_cash)}</p>
              </div>
              <div style={{ ...rowStyle, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={labelStyle}>
                  <div style={iconBox('#3B82F6')}><Package size={13} style={{ color: '#3B82F6' }} /></div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Inventory Value (at cost)</p>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#3B82F6', margin: 0 }}>+{formatNaira(netWorth.inventory_value)}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 10, marginTop: 4 }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Business Subtotal</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 800, color: '#10B981', margin: 0 }}>{formatNaira(businessTotal)}</p>
              </div>
            </div>

            {/* Personal section */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 'var(--space-2)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <User size={12} style={{ color: '#D4A535' }} />
                <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#D4A535', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Personal</p>
              </div>
              <div style={rowStyle}>
                <div style={labelStyle}>
                  <div style={iconBox('#D4A535')}><User size={13} style={{ color: '#D4A535' }} /></div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Personal Cash</p>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#D4A535', margin: 0 }}>+{formatNaira(netWorth.personal_cash)}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 10, marginTop: 4 }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Personal Subtotal</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 800, color: '#D4A535', margin: 0 }}>{formatNaira(personalTotal)}</p>
              </div>
            </div>

            {/* Loans given (asset) */}
            {netWorth.loans_given_outstanding > 0 && (
              <div style={rowStyle}>
                <div style={labelStyle}>
                  <div style={iconBox('#10B981')}><HandCoins size={13} style={{ color: '#10B981' }} /></div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Loans Given (Outstanding)</p>
                    <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', margin: 0 }}>Money others owe you</p>
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#10B981', margin: 0 }}>+{formatNaira(netWorth.loans_given_outstanding)}</p>
              </div>
            )}
          </motion.div>

          {/* ── LIABILITIES ─────────────────────────────────────── */}
          {netWorth.debts_owed_outstanding > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
                Liabilities
              </p>
              <div style={rowStyle}>
                <div style={labelStyle}>
                  <div style={iconBox('#EF4444')}><Banknote size={13} style={{ color: '#EF4444' }} /></div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Debts Owed (Outstanding)</p>
                    <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', margin: 0 }}>Money you owe others (all accounts)</p>
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#EF4444', margin: 0 }}>−{formatNaira(netWorth.debts_owed_outstanding)}</p>
              </div>
            </motion.div>
          )}

          {/* ── NET WORTH FORMULA ────────────────────────────────── */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" style={{ ...card, background: 'var(--bg-elevated)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
              Net Worth Formula
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { label: 'Business Cash', value: netWorth.business_cash, sign: '+', color: '#10B981' },
                { label: 'Inventory Value', value: netWorth.inventory_value, sign: '+', color: '#10B981' },
                { label: 'Personal Cash', value: netWorth.personal_cash, sign: '+', color: '#10B981' },
                { label: 'Loans Given', value: netWorth.loans_given_outstanding, sign: '+', color: '#10B981' },
                { label: 'Debts Owed', value: netWorth.debts_owed_outstanding, sign: '−', color: '#EF4444' },
              ].map(({ label, value, sign, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600, color, margin: 0 }}>
                    {sign}{formatNaira(value)}
                  </p>
                </div>
              ))}
              <div style={{ paddingTop: 'var(--space-3)', borderTop: '2px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>= Net Worth</p>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0,
                  color: netWorth.net_worth >= 0 ? '#10B981' : '#EF4444',
                }}>
                  {formatNaira(netWorth.net_worth)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── QUICK LINKS ──────────────────────────────────────── */}
          <motion.div variants={fadeUp} initial="initial" animate="animate"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)' }}>
            {[
              { label: 'Business Recovery', href: '/business/recovery', color: '#8B0018', desc: 'Business metrics & targets' },
              { label: 'Personal Planning', href: '/personal/planning', color: '#D4A535', desc: 'Budget & debt payoff' },
              { label: 'Business Loans', href: '/business/loans', color: '#3B82F6', desc: 'Lending & debts' },
              { label: 'Personal Loans', href: '/personal/loans', color: '#10B981', desc: 'Personal lending' },
            ].map(({ label, href, color, desc }) => (
              <Link key={label} href={href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)', borderRadius: 14, textDecoration: 'none',
                background: `${color}10`, border: `1px solid ${color}22`,
              }}>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color, margin: 0 }}>{label}</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
                </div>
                <ArrowRight size={14} style={{ color, flexShrink: 0 }} />
              </Link>
            ))}
          </motion.div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
          <Scale size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>No data available yet.</p>
        </div>
      )}
    </div>
  );
}
