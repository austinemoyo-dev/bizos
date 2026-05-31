'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { lendingApi } from '@/lib/api/lending';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatNaira } from '@/lib/format';
import { fadeUp, stagger } from '@/lib/motion-variants';
import {
  Wrench, TrendingUp, TrendingDown, Target, AlertTriangle,
  CheckCircle, Clock, Banknote, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

function MetricCard({
  label, value, sub, color, icon: Icon, large,
}: {
  label: string; value: string; sub?: string;
  color?: string; icon?: React.ElementType; large?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 18,
      padding: large ? 'var(--space-6)' : 'var(--space-4)',
      border: `1px solid ${color ? `${color}30` : 'var(--border-subtle)'}`,
      ...(color && { boxShadow: `0 0 24px ${color}12` }),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: color ? `${color}15` : 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} style={{ color: color || 'var(--text-muted)' }} />
          </div>
        )}
        <p style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{label}</p>
      </div>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: large ? 'clamp(1.5rem, 4vw, 2rem)' : 'var(--text-lg)',
        fontWeight: 700, color: color || 'var(--text-primary)',
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>{value}</p>
      {sub && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

export default function BusinessRecoveryPage() {
  const { data: recovery, isLoading } = useQuery({
    queryKey: ['business-recovery'],
    queryFn: () => cashFlowApi.getBusinessRecovery(),
    refetchInterval: 60_000,
  });
  const { data: cashPos } = useQuery({
    queryKey: ['cash-position', 'business'],
    queryFn: () => cashFlowApi.getPosition('business'),
  });
  const { data: netWorth } = useQuery({
    queryKey: ['net-worth'],
    queryFn: () => cashFlowApi.getNetWorth(),
  });
  const { data: forecast } = useQuery({
    queryKey: ['liquidity-forecast', 'business'],
    queryFn: () => cashFlowApi.getForecast('business', 30),
  });
  const { data: debtSummary } = useQuery({
    queryKey: ['lending-summary', 'business'],
    queryFn: () => lendingApi.summary('business'),
  });

  const isLoss = recovery?.profit_status === 'loss';
  const profitColor = isLoss ? 'var(--accent-red)' : 'var(--accent-green)';

  return (
    <div>
      <PageHeader
        title="Business Recovery"
        subtitle="Break-even tracker · Job targets · Cash runway · Debt load"
      />

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 18 }} />)}
        </div>
      ) : recovery ? (
        <>
          {/* ── Summary banner ──────────────────────────────────── */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
            background: isLoss
              ? 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)',
            border: `1px solid ${isLoss ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
            borderLeft: `4px solid ${profitColor}`,
            borderRadius: 18, padding: 'var(--space-5)',
            marginBottom: 'var(--space-5)',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: `${profitColor}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isLoss
                ? <TrendingDown size={22} style={{ color: 'var(--accent-red)' }} />
                : <TrendingUp   size={22} style={{ color: 'var(--accent-green)' }} />
              }
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {recovery.summary}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Period: {recovery.period.start} → {recovery.period.end}
              </p>
            </div>
          </motion.div>

          {/* ── This month P&L ─────────────────────────────────── */}
          <motion.div variants={stagger} initial="initial" animate="animate"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <MetricCard label="Revenue MTD" value={formatNaira(recovery.revenue_mtd)} icon={TrendingUp} color="var(--accent-green)" sub="Month to date" />
            <MetricCard label="Expenses MTD" value={formatNaira(recovery.expenses_mtd)} icon={TrendingDown} color="var(--accent-red)" sub="Month to date" />
            <MetricCard
              label={isLoss ? 'Loss MTD' : 'Profit MTD'}
              value={formatNaira(Math.abs(recovery.profit_mtd))}
              icon={isLoss ? TrendingDown : TrendingUp}
              color={profitColor} large
            />
            <MetricCard label="Avg Job Revenue" value={formatNaira(recovery.avg_job_revenue)} icon={Wrench} sub={`From last ${recovery.recent_job_count} jobs`} />
          </motion.div>

          {/* ── Job targets ─────────────────────────────────────── */}
          {(recovery.jobs_to_break_even !== null || recovery.jobs_to_hit_target !== null) && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
              background: 'var(--bg-surface)', borderRadius: 20,
              padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-5)',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
                Job Targets
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {recovery.jobs_to_break_even !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-amber-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={16} style={{ color: 'var(--accent-amber)' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Break Even</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Jobs needed to cover losses</p>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)',
                      fontWeight: 800, color: 'var(--accent-amber)',
                    }}>
                      {recovery.jobs_to_break_even}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginLeft: 4 }}>jobs</span>
                    </div>
                  </div>
                )}
                {recovery.jobs_to_hit_target !== null && recovery.target_revenue !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={16} style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Hit Monthly Target</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          Target: {formatNaira(recovery.target_revenue)}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)',
                      fontWeight: 800, color: 'var(--accent-primary)',
                    }}>
                      {recovery.jobs_to_hit_target}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginLeft: 4 }}>jobs</span>
                    </div>
                  </div>
                )}
                {recovery.jobs_to_clear_business_debt !== null && recovery.business_debt_outstanding > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-red-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Banknote size={16} style={{ color: 'var(--accent-red)' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Clear Business Debt</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          Owe: {formatNaira(recovery.business_debt_outstanding)}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)',
                      fontWeight: 800, color: 'var(--accent-red)',
                    }}>
                      {recovery.jobs_to_clear_business_debt}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginLeft: 4 }}>jobs</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} style={{ color: '#8B5CF6' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Pending Jobs</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>In progress right now</p>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)',
                    fontWeight: 800, color: '#8B5CF6',
                  }}>
                    {recovery.pending_jobs}
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginLeft: 4 }}>jobs</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Cash Position ───────────────────────────────────── */}
          {cashPos && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
              background: 'var(--bg-surface)', borderRadius: 20,
              padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-5)',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
                Cash Position
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                {[
                  { l: 'Opening', v: cashPos.opening_balance, c: 'var(--text-secondary)' },
                  { l: 'Total In', v: cashPos.total_in, c: 'var(--accent-green)' },
                  { l: 'Total Out', v: cashPos.total_out, c: 'var(--accent-red)' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: c }}>{formatNaira(v)}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Actual Cash in Hand</p>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800,
                  color: cashPos.current_balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {formatNaira(cashPos.current_balance)}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Net Worth ────────────────────────────────────────── */}
          {netWorth && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
              background: 'var(--bg-surface)', borderRadius: 20,
              padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-5)',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
                Net Worth Snapshot
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Business Cash', value: netWorth.business_cash, color: 'var(--accent-green)' },
                  { label: 'Personal Cash', value: netWorth.personal_cash, color: 'var(--accent-green)' },
                  { label: 'Loans Given (Outstanding)', value: netWorth.loans_given_outstanding, color: 'var(--accent-amber)' },
                  { label: 'Inventory Value', value: netWorth.inventory_value, color: 'var(--accent-primary)' },
                  { label: 'Debts Owed', value: -netWorth.debts_owed_outstanding, color: 'var(--accent-red)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{label}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color }}>
                      {value < 0 ? '−' : '+'}{formatNaira(Math.abs(value))}
                    </p>
                  </div>
                ))}
                <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Total Net Worth</p>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800,
                    color: netWorth.net_worth >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>
                    {formatNaira(netWorth.net_worth)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Liquidity Forecast ──────────────────────────────── */}
          {forecast && forecast.items.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
              background: 'var(--bg-surface)', borderRadius: 20,
              padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-5)',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                30-Day Liquidity Forecast
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'var(--accent-green-glow)', borderRadius: 12 }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>Expected In</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)' }}>{formatNaira(forecast.expected_inflows)}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'var(--accent-red-glow)', borderRadius: 12 }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>Expected Out</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-red)' }}>{formatNaira(forecast.expected_outflows)}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>Projected</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: forecast.projected_balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatNaira(forecast.projected_balance)}</p>
                </div>
              </div>
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
            </motion.div>
          )}

          {/* ── Quick links ─────────────────────────────────────── */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {[
              { label: 'View Repairs', href: '/business/repairs', color: '#8B0018' },
              { label: 'Lending Ledger', href: '/business/loans', color: '#10B981' },
            ].map(({ label, href, color }) => (
              <Link key={label} href={href} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: 'var(--space-3)', borderRadius: 14,
                background: `${color}12`, border: `1px solid ${color}25`,
                color, fontSize: 'var(--text-xs)', fontWeight: 700, textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}>
                {label} <ArrowRight size={12} />
              </Link>
            ))}
          </motion.div>
        </>
      ) : null}
    </div>
  );
}
