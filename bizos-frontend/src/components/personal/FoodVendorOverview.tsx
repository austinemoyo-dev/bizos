'use client';

import { useState, useMemo } from 'react';
import { FoodVendorAnalytics, VendorSpendingSummary } from '@/lib/api/food-vendor';
import { FoodCredit, FoodVendorPayment, MealType } from '@/types/api';
import { StatWidget } from '@/components/shared/StatWidget';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNaira } from '@/lib/format';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Utensils, Check, CreditCard, Users, Trash2, Pencil,
  CheckSquare, Square, AlertTriangle, Target, ChevronDown, ChevronUp, TrendingUp,
} from 'lucide-react';

const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿',
};

function friendlyDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, dd MMM');
}

function groupByDate(credits: FoodCredit[]) {
  return credits.reduce((acc, c) => {
    const k = c.purchase_date.slice(0, 10);
    if (!acc[k]) acc[k] = [];
    acc[k].push(c);
    return acc;
  }, {} as Record<string, FoodCredit[]>);
}

interface PaymentDetailEntry {
  credits: { id: string; meal_description?: string; amount: number; purchase_date: string; meal_type?: MealType }[];
}

interface Props {
  unpaid: FoodCredit[];
  payments: FoodVendorPayment[];
  analytics: FoodVendorAnalytics | undefined;
  vendors: VendorSpendingSummary[];
  onMarkPaid: () => void;
  budget: number;
  monthlySpent: number;
  onSetBudget: () => void;
  onPayVendor: (vendorName: string, creditIds: string[]) => void;
  onDeleteCredit: (id: string) => void;
  onEditCredit: (credit: FoodCredit) => void;
  onPaySelected: (ids: string[]) => void;
  onVendorClick: (vendorName: string) => void;
  limits: Record<string, number>;
  getPaymentDetail: (paymentId: string) => PaymentDetailEntry | null;
}

export function FoodVendorOverview({
  unpaid, payments, analytics, vendors, onMarkPaid,
  budget, monthlySpent, onSetBudget,
  onPayVendor, onDeleteCredit, onEditCredit, onPaySelected, onVendorClick,
  limits, getPaymentDetail,
}: Props) {
  const [selectMode,       setSelectMode]       = useState(false);
  const [selected,         setSelected]         = useState<string[]>([]);
  const [expandedPayment,  setExpandedPayment]  = useState<string | null>(null);

  const totalDebt   = unpaid.reduce((s, c) => s + toNum(c.amount), 0);
  const grouped     = groupByDate(unpaid);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Per-day totals for the spending bar
  const dayTotals = useMemo(
    () => Object.fromEntries(sortedDates.map((d) => [d, grouped[d].reduce((s, c) => s + toNum(c.amount), 0)])),
    [grouped, sortedDates],
  );
  const maxDayTotal = Math.max(...Object.values(dayTotals), 1);
  const avgDaySpend = toNum(analytics?.daily_average);

  const budgetPct  = budget > 0 ? Math.min((monthlySpent / budget) * 100, 100) : 0;
  const budgetOver = budget > 0 && monthlySpent > budget;

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const exitSelectMode = () => { setSelectMode(false); setSelected([]); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-4)' }}>
        <StatWidget label="Outstanding" value={formatNaira(toNum(analytics?.total_outstanding))} accent="warning" loading={!analytics} />
        <StatWidget label="This Week"   value={formatNaira(toNum(analytics?.weekly_total))}      accent="neutral" loading={!analytics} />
        <StatWidget label="This Month"  value={formatNaira(toNum(analytics?.monthly_total))}     accent="neutral" loading={!analytics} />
        <StatWidget label="Daily Avg"   value={formatNaira(toNum(analytics?.daily_average))}     accent="neutral" loading={!analytics} />
      </div>

      {/* ── Monthly budget tracker ─────────────────────────────────── */}
      <div className="liquid-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Target size={14} style={{ color: '#F59E0B' }} />
            <p className="section-label" style={{ marginBottom: 0 }}>Monthly Food Budget</p>
          </div>
          <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }} onClick={onSetBudget}>
            {budget > 0 ? 'Edit' : 'Set Budget'}
          </button>
        </div>

        {budget > 0 ? (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: budgetOver ? '#EF4444' : '#F59E0B', fontWeight: 700 }}>
                {formatNaira(monthlySpent)} spent
              </span>
              <span style={{ color: 'var(--text-muted)' }}>of {formatNaira(budget)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-overlay)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${budgetPct}%`, background: budgetOver ? '#EF4444' : budgetPct > 80 ? '#F59E0B' : '#10B981', transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: budgetOver ? '#EF4444' : 'var(--text-muted)', marginTop: 4 }}>
              {budgetOver ? `Over budget by ${formatNaira(monthlySpent - budget)}` : `${formatNaira(budget - monthlySpent)} remaining this month`}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
            Set a monthly target to track how much you spend on food.
          </p>
        )}
      </div>

      {/* ── Vendor Summary ─────────────────────────────────────────── */}
      {vendors.length > 0 && (
        <div className="liquid-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
            <Users size={14} style={{ color: '#F59E0B' }} />
            <p className="section-label" style={{ marginBottom: 0 }}>Vendors</p>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {vendors.map((v) => {
              const maxSpent     = toNum(vendors[0]?.total_spent);
              const pct          = maxSpent > 0 ? (toNum(v.total_spent) / maxSpent) * 100 : 0;
              const vendorUnpaid = unpaid.filter((c) => c.vendor_name === v.vendor_name);
              const limit        = limits[v.vendor_name] ?? 0;
              const overLimit    = limit > 0 && toNum(v.unpaid_amount) >= limit;
              const nearLimit    = limit > 0 && !overLimit && toNum(v.unpaid_amount) >= limit * 0.8;

              return (
                <div key={v.vendor_name} style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', minWidth: 0 }}
                        onClick={() => onVendorClick(v.vendor_name)}
                      >
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.vendor_name}
                        </span>
                      </button>
                      {(overLimit || nearLimit) && <AlertTriangle size={12} style={{ color: overLimit ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>{formatNaira(toNum(v.total_spent))}</span>
                        {toNum(v.unpaid_amount) > 0 && (
                          <span style={{ fontSize: 'var(--text-xs)', color: '#F59E0B', marginLeft: 6 }}>{formatNaira(toNum(v.unpaid_amount))} owed</span>
                        )}
                      </div>
                      {vendorUnpaid.length > 0 && (
                        <button
                          className="btn-primary"
                          style={{ fontSize: '0.6rem', padding: '3px 8px', gap: 4 }}
                          onClick={() => onPayVendor(v.vendor_name, vendorUnpaid.map((c) => c.id))}
                        >
                          <Check size={10} /> Pay
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--glass-border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: '#F59E0B', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{v.total_meals} meals</p>
                    {limit > 0 && (
                      <p style={{ fontSize: 'var(--text-xs)', color: overLimit ? '#EF4444' : nearLimit ? '#F59E0B' : 'var(--text-muted)' }}>
                        Limit: {formatNaira(limit)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Unpaid Credits — Day Cards ─────────────────────────────── */}
      <div>
        {/* Section header + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 2 }}>Unpaid Credits</p>
            {unpaid.length > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {unpaid.length} meals · <span style={{ fontFamily: 'var(--font-mono)', color: '#F59E0B' }}>{formatNaira(totalDebt)}</span>
              </p>
            )}
          </div>
          {unpaid.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectMode ? (
                <>
                  <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }} onClick={exitSelectMode}>Cancel</button>
                  {selected.length > 0 && (
                    <button
                      className="btn-primary"
                      style={{ fontSize: 'var(--text-xs)', background: '#10B981' }}
                      onClick={() => { onPaySelected(selected); exitSelectMode(); }}
                    >
                      <Check size={12} /> Pay {selected.length}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setSelectMode(true)}>
                    <CheckSquare size={12} /> Select
                  </button>
                  <button className="btn-primary" style={{ fontSize: 'var(--text-xs)' }} onClick={onMarkPaid}>
                    <Check size={12} /> Pay All
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {sortedDates.length === 0 ? (
          <div className="liquid-card">
            <EmptyState icon={<Utensils size={36} />} title="No unpaid credits" description="All clear! Record meals when you eat on credit." />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {sortedDates.map((date) => {
              const dayCredits = grouped[date];
              const dayTotal   = dayTotals[date];
              const barPct     = (dayTotal / maxDayTotal) * 100;
              const vsAvg      = avgDaySpend > 0 ? ((dayTotal - avgDaySpend) / avgDaySpend) * 100 : 0;
              const isAboveAvg = vsAvg > 10;
              const isBelowAvg = vsAvg < -10;
              const dayVendors = Array.from(new Set(dayCredits.map((c) => c.vendor_name)));

              return (
                <div
                  key={date}
                  style={{
                    background: 'var(--glass-bg-light)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 20,
                    overflow: 'hidden',
                  }}
                >
                  {/* Card header */}
                  <div style={{
                    padding: 'var(--space-4) var(--space-4) var(--space-3)',
                    borderBottom: '1px solid var(--glass-border)',
                    background: 'rgba(245,158,11,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {friendlyDate(date)}
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {dayCredits.length} meal{dayCredits.length !== 1 ? 's' : ''} · {dayVendors.join(', ')}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 800, color: '#F59E0B' }}>
                          {formatNaira(dayTotal)}
                        </p>
                        {avgDaySpend > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <TrendingUp
                              size={10}
                              style={{
                                color: isAboveAvg ? '#EF4444' : isBelowAvg ? '#10B981' : 'var(--text-muted)',
                                transform: isBelowAvg ? 'scaleY(-1)' : 'none',
                              }}
                            />
                            <span style={{ fontSize: '0.6rem', color: isAboveAvg ? '#EF4444' : isBelowAvg ? '#10B981' : 'var(--text-muted)', fontWeight: 600 }}>
                              {Math.abs(vsAvg).toFixed(0)}% {isAboveAvg ? 'above' : isBelowAvg ? 'below' : '~'} avg
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Day spending bar */}
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-overlay)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${barPct}%`,
                        background: isAboveAvg
                          ? 'linear-gradient(90deg,#F59E0B,#EF4444)'
                          : 'linear-gradient(90deg,#10B981,#F59E0B)',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>

                  {/* Meal rows */}
                  <div style={{ padding: 'var(--space-2) 0' }}>
                    {dayCredits.map((credit, i) => {
                      const isSelected = selected.includes(credit.id);
                      return (
                        <div
                          key={credit.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            padding: 'var(--space-2) var(--space-4)',
                            borderBottom: i < dayCredits.length - 1 ? '1px solid var(--glass-border)' : 'none',
                            background: isSelected ? 'rgba(245,158,11,0.06)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          {selectMode ? (
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: isSelected ? '#F59E0B' : 'var(--text-muted)', flexShrink: 0 }}
                              onClick={() => toggleSelect(credit.id)}
                            >
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                              {credit.meal_type ? MEAL_EMOJI[credit.meal_type] : <Utensils size={13} style={{ color: '#F59E0B' }} />}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {credit.meal_description ?? 'Meal'}
                            </p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              {credit.vendor_name}
                              {credit.meal_type && <span style={{ marginLeft: 6, color: '#F59E0B', textTransform: 'capitalize' }}>· {credit.meal_type}</span>}
                            </p>
                          </div>

                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
                            {formatNaira(toNum(credit.amount))}
                          </span>

                          {!selectMode && (
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => onEditCredit(credit)} title="Edit">
                                <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                              </button>
                              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => onDeleteCredit(credit.id)} title="Delete">
                                <Trash2 size={12} style={{ color: 'var(--accent-red)' }} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Card footer — per-vendor pay buttons */}
                  {!selectMode && dayVendors.length > 0 && (
                    <div style={{
                      padding: 'var(--space-2) var(--space-4)',
                      borderTop: '1px solid var(--glass-border)',
                      display: 'flex', gap: 6, flexWrap: 'wrap',
                      background: 'rgba(0,0,0,0.06)',
                    }}>
                      {dayVendors.map((vendor) => {
                        const vendorDayCredits = dayCredits.filter((c) => c.vendor_name === vendor);
                        const vendorDayTotal   = vendorDayCredits.reduce((s, c) => s + toNum(c.amount), 0);
                        return (
                          <button
                            key={vendor}
                            className="btn-ghost"
                            style={{ fontSize: '0.6rem', gap: 4, padding: '3px 8px' }}
                            onClick={() => onPayVendor(vendor, vendorDayCredits.map((c) => c.id))}
                          >
                            <Check size={9} />
                            Pay {vendor} · {formatNaira(vendorDayTotal)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Payment History ─────────────────────────────────────────── */}
      {payments.length > 0 && (
        <div className="liquid-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
            <CreditCard size={14} style={{ color: 'var(--accent-green)' }} />
            <p className="section-label" style={{ marginBottom: 0 }}>Payment History</p>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {payments.map((p) => {
              const detail     = getPaymentDetail(p.id);
              const isExpanded = expandedPayment === p.id;
              return (
                <div key={p.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', cursor: detail ? 'pointer' : 'default' }}
                    onClick={() => detail && setExpandedPayment(isExpanded ? null : p.id)}
                  >
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{p.vendor_name}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {format(new Date(p.paid_at), 'dd MMM yyyy · h:mm a')}
                        {detail && <span style={{ marginLeft: 6, color: '#F59E0B' }}>· {detail.credits.length} meals</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-green)' }}>
                          {formatNaira(toNum(p.amount_paid))}
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>✓ Paid</p>
                      </div>
                      {detail && (isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />)}
                    </div>
                  </div>

                  {isExpanded && detail && (
                    <div style={{ padding: 'var(--space-2) var(--space-3) var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 8, marginBottom: 'var(--space-2)' }}>
                      {detail.credits.map((c, i) => (
                        <div key={c.id ?? i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--text-xs)', borderBottom: i < detail.credits.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {c.meal_type && <span style={{ marginRight: 4 }}>{MEAL_EMOJI[c.meal_type]}</span>}
                            {c.meal_description || 'Meal'} · {format(new Date(c.purchase_date + 'T00:00:00'), 'dd MMM')}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {formatNaira(toNum(c.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
