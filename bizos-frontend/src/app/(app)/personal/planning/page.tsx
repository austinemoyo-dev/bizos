'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { lendingApi } from '@/lib/api/lending';
import { analyticsApi } from '@/lib/api/analytics';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatNaira } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { fadeUp } from '@/lib/motion-variants';
import {
  PiggyBank, TrendingDown, TrendingUp, Wallet,
  CheckCircle, AlertTriangle, Calendar, ArrowRight,
  Loader2, Banknote,
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B', transport: '#3B82F6', data: '#8B5CF6',
  airtime: '#6366F1', bills: '#EF4444', savings: '#10B981',
  tithe: '#F472B6', debt_repayment: '#DC2626', miscellaneous: '#6B7280',
};
const getCatColor = (c: string) => CATEGORY_COLORS[c.toLowerCase()] ?? '#6B7280';

export default function PersonalPlanningPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showSetBalance, setShowSetBalance] = useState(false);
  const [obAmount, setObAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const { data: burnRate, isLoading: burnLoading } = useQuery({
    queryKey: ['personal-burn-rate'],
    queryFn: () => cashFlowApi.getBurnRate(3),
  });
  const { data: debtPlan, isLoading: debtLoading } = useQuery({
    queryKey: ['personal-debt-plan'],
    queryFn: () => cashFlowApi.getDebtPlan(),
  });
  const { data: cashPos } = useQuery({
    queryKey: ['cash-position', 'personal'],
    queryFn: () => cashFlowApi.getPosition('personal'),
  });
  const _planningStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const _planningEnd   = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: personalSummary } = useQuery({
    queryKey: ['personal-summary', _planningStart, _planningEnd],
    queryFn: () => analyticsApi.personalSummary({ period_start: _planningStart, period_end: _planningEnd }),
  });
  const { data: forecast } = useQuery({
    queryKey: ['liquidity-forecast', 'personal'],
    queryFn: () => cashFlowApi.getForecast('personal', 30),
  });
  const { data: lendingSummary } = useQuery({
    queryKey: ['lending-summary', 'personal'],
    queryFn: () => lendingApi.summary('personal'),
  });

  const handleSetBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await cashFlowApi.setOpeningBalance({ scope: 'personal', opening_balance: obAmount });
      qc.invalidateQueries({ queryKey: ['cash-position', 'personal'] });
      addToast({ type: 'success', title: 'Balance set', message: 'Personal cash tracking is now active.' });
      setShowSetBalance(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally { setLoading(false); }
  };

  const isLoading = burnLoading || debtLoading;
  const thisMonth = burnRate?.this_month;
  const monthProgress = thisMonth && burnRate?.average_monthly_burn
    ? Math.min(100, (thisMonth.spent_so_far / burnRate.average_monthly_burn) * 100)
    : 0;
  const overSpending = thisMonth && burnRate ? thisMonth.projected_total > burnRate.average_monthly_burn : false;

  return (
    <div>
      <PageHeader
        title="Personal Planning"
        subtitle="Monthly burn rate · Debt payoff plan · Cash position"
        actions={
          <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setShowSetBalance(true)}>
            <Wallet size={14} /> Set Balance
          </button>
        }
      />

      {/* ── Cash Position ────────────────────────────────────────── */}
      {(personalSummary || cashPos) && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 20, padding: 'var(--space-5)',
          marginBottom: 'var(--space-5)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {(() => {
            const cashInHand = personalSummary?.available_balance ?? cashPos?.current_balance ?? 0;
            return (
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Personal Cash in Hand
                </p>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
                  fontWeight: 800, color: Number(cashInHand) >= 0 ? '#A78BFA' : 'var(--accent-red)',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {formatNaira(cashInHand)}
                </p>
                {cashPos && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                    Opening: {formatNaira(cashPos.opening_balance)} · In: {formatNaira(cashPos.total_in)} · Out: {formatNaira(cashPos.total_out)}
                  </p>
                )}
              </div>
            );
          })()}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} style={{ color: '#A78BFA' }} />
          </div>
        </motion.div>
      )}

      {/* ── Monthly Burn Rate ────────────────────────────────────── */}
      {isLoading ? (
        <div className="skeleton" style={{ height: 220, borderRadius: 20, marginBottom: 'var(--space-5)' }} />
      ) : burnRate && thisMonth && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-5)',
        }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
            Monthly Burn Rate
          </p>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Avg Monthly', value: burnRate.average_monthly_burn, color: 'var(--text-primary)' },
              { label: 'Spent So Far', value: thisMonth.spent_so_far, color: overSpending ? 'var(--accent-red)' : 'var(--accent-amber)' },
              { label: 'Projected', value: thisMonth.projected_total, color: overSpending ? 'var(--accent-red)' : 'var(--text-primary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color }}>{formatNaira(value)}</p>
              </div>
            ))}
          </div>
          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Day {thisMonth.days_elapsed} of {thisMonth.days_elapsed + thisMonth.days_remaining}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: overSpending ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 600 }}>
                {monthProgress.toFixed(0)}% of avg budget used
              </p>
            </div>
            <div style={{ height: 8, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: overSpending
                  ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                  : 'linear-gradient(90deg, #8B5CF6, #6D28D9)',
                width: `${monthProgress}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            {overSpending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--accent-red)' }}>
                <AlertTriangle size={12} />
                Projected to overspend by {formatNaira(thisMonth.projected_total - burnRate.average_monthly_burn)} this month
              </div>
            )}
          </div>
          {/* Category breakdown */}
          {Object.keys(burnRate.category_breakdown).length > 0 && (
            <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Avg by Category
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(burnRate.category_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, avg]) => {
                    const pct = burnRate.average_monthly_burn > 0 ? (avg / burnRate.average_monthly_burn) * 100 : 0;
                    const color = getCatColor(cat);
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</p>
                          <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{formatNaira(avg)}</p>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, opacity: 0.8 }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Debt Payoff Plan ─────────────────────────────────────── */}
      {debtPlan && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-5)',
        }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
            Debt Payoff Plan
          </p>

          {/* Summary */}
          <div style={{
            padding: 'var(--space-4)', borderRadius: 14,
            background: debtPlan.total_personal_debt > 0 ? 'var(--accent-red-glow)' : 'var(--accent-green-glow)',
            border: `1px solid ${debtPlan.total_personal_debt > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
            marginBottom: 'var(--space-4)',
          }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {debtPlan.recommendation}
            </p>
          </div>

          {/* Income vs Expenses vs Disposable */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Avg Income', value: debtPlan.avg_monthly_income, color: 'var(--accent-green)' },
              { label: 'Avg Expenses', value: debtPlan.avg_monthly_expenses, color: 'var(--accent-red)' },
              { label: 'Disposable', value: debtPlan.monthly_disposable, color: debtPlan.monthly_disposable > 0 ? '#A78BFA' : 'var(--accent-red)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color }}>{formatNaira(value)}</p>
              </div>
            ))}
          </div>

          {/* Total debt + months to clear */}
          {debtPlan.total_personal_debt > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14, marginBottom: 'var(--space-4)' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Personal Debt</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--accent-red)' }}>{formatNaira(debtPlan.total_personal_debt)}</p>
              </div>
              {debtPlan.months_to_clear_all !== null && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Debt-free in</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color: '#A78BFA' }}>
                    {debtPlan.months_to_clear_all} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>months</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Individual debts */}
          {debtPlan.debts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {debtPlan.debts.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-red-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Banknote size={14} style={{ color: 'var(--accent-red)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>{d.creditor_name}</p>
                      {d.due_date && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Due {d.due_date}</p>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-red)' }}>{formatNaira(d.outstanding)}</p>
                    {d.months_to_clear_at_current_rate !== null && (
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{d.months_to_clear_at_current_rate}mo to clear</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {debtPlan.total_personal_debt === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <CheckCircle size={28} style={{ color: 'var(--accent-green)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-green)' }}>Debt-free!</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No outstanding personal debts.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Liquidity Forecast ───────────────────────────────────── */}
      {forecast && (forecast.items.length > 0 || forecast.current_balance > 0) && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          background: 'var(--bg-surface)', borderRadius: 20,
          padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              30-Day Outlook
            </p>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Projected: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: forecast.projected_balance >= 0 ? '#A78BFA' : 'var(--accent-red)' }}>{formatNaira(forecast.projected_balance)}</span>
            </span>
          </div>
          {forecast.items.length === 0 ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>
              No upcoming expected inflows or outflows in the next 30 days.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {forecast.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: item.direction === 'in' ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.direction === 'in'
                      ? <TrendingUp size={13} style={{ color: 'var(--accent-green)' }} />
                      : <TrendingDown size={13} style={{ color: 'var(--accent-red)' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{item.date}</p>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: item.direction === 'in' ? 'var(--accent-green)' : 'var(--accent-red)', flexShrink: 0 }}>
                    {item.direction === 'in' ? '+' : '−'}{formatNaira(item.expected_amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Quick links ──────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {[
          { label: 'Transactions', href: '/personal/transactions', color: '#A78BFA' },
          { label: 'Savings Goals', href: '/personal/savings',      color: '#34D399' },
        ].map(({ label, href, color }) => (
          <Link key={label} href={href} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: 'var(--space-3)', borderRadius: 14,
            background: `${color}12`, border: `1px solid ${color}25`,
            color, fontSize: 'var(--text-xs)', fontWeight: 700, textDecoration: 'none',
          }}>
            {label} <ArrowRight size={12} />
          </Link>
        ))}
      </motion.div>

      {/* Set balance modal */}
      <Modal isOpen={showSetBalance} onClose={() => setShowSetBalance(false)} title="Set Personal Opening Balance"
        footer={<>
          <button className="btn-ghost" onClick={() => setShowSetBalance(false)}>Cancel</button>
          <button className="btn-primary" form="personal-ob-form" type="submit" disabled={loading}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Confirm
          </button>
        </>}
      >
        <form id="personal-ob-form" onSubmit={handleSetBalance}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Enter how much cash you currently have personally. From here, every income and expense you record will update this balance in real time.
          </p>
          <CurrencyInput label="Current Personal Cash" value={obAmount} onChange={setObAmount} />
        </form>
      </Modal>
    </div>
  );
}
