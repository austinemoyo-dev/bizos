'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FoodVendorAnalytics, VendorSpendingSummary } from '@/lib/api/food-vendor';
import { FoodCredit, FoodVendorPayment, MealType } from '@/types/api';
import { StatWidget } from '@/components/shared/StatWidget';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNaira } from '@/lib/format';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Utensils, Check, CreditCard, Users, Trash2, Pencil,
  CheckSquare, Square, AlertTriangle, Target, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Flame, ChevronRight,
} from 'lucide-react';

const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

// ── Meal type config ────────────────────────────────────────────────
const MEAL_CONFIG: Record<MealType, { emoji: string; color: string; bg: string; label: string; time: string }> = {
  breakfast: { emoji: '🌅', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'Breakfast', time: 'Morning' },
  lunch:     { emoji: '☀️',  color: '#F97316', bg: 'rgba(249,115,22,0.15)', label: 'Lunch',     time: 'Midday'  },
  dinner:    { emoji: '🌙', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', label: 'Dinner',    time: 'Evening' },
  snack:     { emoji: '🍿', color: '#10B981', bg: 'rgba(16,185,129,0.15)', label: 'Snack',     time: 'Anytime' },
};

// ── Date helpers ────────────────────────────────────────────────────
function friendlyDate(dateStr: string): { label: string; isSpecial: boolean } {
  const d = new Date(dateStr + 'T00:00:00');
  if (isToday(d))     return { label: 'Today',     isSpecial: true  };
  if (isYesterday(d)) return { label: 'Yesterday',  isSpecial: false };
  return { label: format(d, 'EEEE'), isSpecial: false };
}

function shortDate(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'dd MMM');
}

function dayNumber(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'dd');
}

// ── Group credits by date ───────────────────────────────────────────
function groupByDate(credits: FoodCredit[]) {
  return credits.reduce((acc, c) => {
    const k = c.purchase_date.slice(0, 10);
    if (!acc[k]) acc[k] = [];
    acc[k].push(c);
    return acc;
  }, {} as Record<string, FoodCredit[]>);
}

// ── Vendor initials ─────────────────────────────────────────────────
function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Vendor avatar colors ─────────────────────────────────────────────
const AVATAR_COLORS = ['#F59E0B', '#C8102E', '#8B5CF6', '#06B6D4', '#10B981', '#EC4899'];
function vendorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Meal type breakdown pills ───────────────────────────────────────
function MealTypePills({ credits }: { credits: FoodCredit[] }) {
  const counts = credits.reduce((acc, c) => {
    const key = c.meal_type ?? 'unset';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {Object.entries(counts).map(([type, count]) => {
        const cfg = MEAL_CONFIG[type as MealType];
        if (!cfg) return null;
        return (
          <span key={type} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: '0.6rem', fontWeight: 700,
            color: cfg.color, background: cfg.bg,
            border: `1px solid ${cfg.color}30`,
            padding: '2px 6px', borderRadius: 20,
          }}>
            {cfg.emoji} {count}
          </span>
        );
      })}
    </div>
  );
}

// ── Segmented spending bar ──────────────────────────────────────────
function MealTypeBar({ credits, totalAmount }: { credits: FoodCredit[]; totalAmount: number }) {
  const segments = Object.entries(MEAL_CONFIG).map(([type, cfg]) => {
    const amount = credits
      .filter((c) => c.meal_type === type)
      .reduce((s, c) => s + toNum(c.amount), 0);
    const width = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    return { type, cfg, width };
  }).filter((s) => s.width > 0);

  // Credits with no meal type
  const untyped = credits.filter((c) => !c.meal_type).reduce((s, c) => s + toNum(c.amount), 0);
  const untypedWidth = totalAmount > 0 ? (untyped / totalAmount) * 100 : 0;

  return (
    <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 1, marginTop: 8 }}>
      {segments.map((s) => (
        <div
          key={s.type}
          title={`${s.cfg.label}: ${formatNaira(credits.filter(c => c.meal_type === s.type).reduce((a,c) => a+toNum(c.amount),0))}`}
          style={{ height: '100%', width: `${s.width}%`, background: s.cfg.color, transition: 'width 0.5s ease', borderRadius: 3 }}
        />
      ))}
      {untypedWidth > 0 && (
        <div style={{ height: '100%', width: `${untypedWidth}%`, background: 'var(--border-default)', borderRadius: 3 }} />
      )}
    </div>
  );
}

// ── Types ───────────────────────────────────────────────────────────
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
  const [selectMode,      setSelectMode]      = useState(false);
  const [selected,        setSelected]        = useState<string[]>([]);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [collapsedDays,   setCollapsedDays]   = useState<Set<string>>(new Set());

  const totalDebt   = unpaid.reduce((s, c) => s + toNum(c.amount), 0);
  const grouped     = groupByDate(unpaid);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const dayTotals = useMemo(
    () => Object.fromEntries(sortedDates.map((d) => [d, grouped[d].reduce((s, c) => s + toNum(c.amount), 0)])),
    [grouped, sortedDates],
  );
  const maxDayTotal  = Math.max(...Object.values(dayTotals), 1);
  const heaviestDay  = sortedDates.find((d) => dayTotals[d] === maxDayTotal);
  const avgDaySpend  = toNum(analytics?.daily_average);
  const budgetPct    = budget > 0 ? Math.min((monthlySpent / budget) * 100, 100) : 0;
  const budgetOver   = budget > 0 && monthlySpent > budget;

  const toggleSelect  = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const exitSelectMode = () => { setSelectMode(false); setSelected([]); };
  const toggleCollapse = (date: string) =>
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-4)' }}>
        <StatWidget label="Outstanding" value={formatNaira(toNum(analytics?.total_outstanding))} accent="warning" loading={!analytics} />
        <StatWidget label="This Week"   value={formatNaira(toNum(analytics?.weekly_total))}      accent="neutral" loading={!analytics} />
        <StatWidget label="This Month"  value={formatNaira(toNum(analytics?.monthly_total))}     accent="neutral" loading={!analytics} />
        <StatWidget label="Daily Avg"   value={formatNaira(toNum(analytics?.daily_average))}     accent="neutral" loading={!analytics} />
      </div>

      {/* ── Monthly budget tracker ──────────────────────────────────── */}
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

      {/* ── Vendor Summary ──────────────────────────────────────────── */}
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
              const color        = vendorColor(v.vendor_name);
              return (
                <div key={v.vendor_name} style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {/* Avatar */}
                      <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, background: `${color}20`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color }}>
                        {initials(v.vendor_name)}
                      </div>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => onVendorClick(v.vendor_name)}
                      >
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.vendor_name}
                        </span>
                        <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </button>
                      {(overLimit || nearLimit) && <AlertTriangle size={12} style={{ color: overLimit ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>{formatNaira(toNum(v.total_spent))}</p>
                        {toNum(v.unpaid_amount) > 0 && (
                          <p style={{ fontSize: '0.6rem', color: '#F59E0B', fontWeight: 600 }}>{formatNaira(toNum(v.unpaid_amount))} owed</p>
                        )}
                      </div>
                      {vendorUnpaid.length > 0 && (
                        <button
                          className="btn-primary"
                          style={{ fontSize: '0.6rem', padding: '4px 10px', gap: 4, borderRadius: 20 }}
                          onClick={() => onPayVendor(v.vendor_name, vendorUnpaid.map((c) => c.id))}
                        >
                          <Check size={10} /> Pay
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--glass-border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: color, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
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

      {/* ── Unpaid Credits — Advanced Day Cards ────────────────────── */}
      <div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedDates.map((date, cardIdx) => {
              const dayCredits  = grouped[date];
              const dayTotal    = dayTotals[date];
              const vsAvg       = avgDaySpend > 0 ? ((dayTotal - avgDaySpend) / avgDaySpend) * 100 : 0;
              const isAboveAvg  = vsAvg > 10;
              const isBelowAvg  = vsAvg < -10;
              const isHeaviest  = date === heaviestDay && sortedDates.length > 1;
              const dayVendors  = Array.from(new Set(dayCredits.map((c) => c.vendor_name)));
              const collapsed   = collapsedDays.has(date);
              const { label: dayLabel, isSpecial } = friendlyDate(date);

              // Left stripe color: red = above avg, green = below avg, amber = normal / today
              const stripeColor = isSpecial
                ? '#F59E0B'
                : isAboveAvg ? '#EF4444' : isBelowAvg ? '#10B981' : '#F59E0B';

              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: cardIdx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    background: 'var(--glass-bg-light)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: isSpecial ? `0 0 0 1px ${stripeColor}30, 0 4px 20px rgba(0,0,0,0.15)` : '0 2px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* ── Left accent stripe ── */}
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 3, flexShrink: 0, background: `linear-gradient(180deg, ${stripeColor}, ${stripeColor}60)` }} />

                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* ── Card header ── */}
                      <div
                        style={{ padding: '14px 16px 10px', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleCollapse(date)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>

                          {/* Left: date block */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            {/* Day number bubble */}
                            <div style={{
                              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                              background: isSpecial ? `${stripeColor}20` : 'var(--bg-overlay)',
                              border: `1.5px solid ${isSpecial ? `${stripeColor}50` : 'var(--border-default)'}`,
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: isSpecial ? stripeColor : 'var(--text-primary)', lineHeight: 1 }}>
                                {dayNumber(date)}
                              </span>
                              <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {format(new Date(date + 'T00:00:00'), 'MMM')}
                              </span>
                            </div>

                            {/* Day info */}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {dayLabel}
                                </span>
                                {/* Today pulsing dot */}
                                {isSpecial && (
                                  <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: stripeColor,
                                    boxShadow: `0 0 0 2px ${stripeColor}40`,
                                    animation: 'pulse-dot 1.5s ease-in-out infinite',
                                    flexShrink: 0,
                                  }} />
                                )}
                                {/* Heaviest day badge */}
                                {isHeaviest && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: '0.55rem', fontWeight: 700,
                                    color: '#EF4444', background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    padding: '1px 6px', borderRadius: 20,
                                  }}>
                                    <Flame size={9} /> Highest
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                  {dayCredits.length} meal{dayCredits.length !== 1 ? 's' : ''}
                                </span>
                                <MealTypePills credits={dayCredits} />
                              </div>
                            </div>
                          </div>

                          {/* Right: total + vs-avg */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 800, color: '#F59E0B', lineHeight: 1.1 }}>
                              {formatNaira(dayTotal)}
                            </p>
                            {avgDaySpend > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 2 }}>
                                {isAboveAvg
                                  ? <TrendingUp size={10} style={{ color: '#EF4444' }} />
                                  : isBelowAvg
                                    ? <TrendingDown size={10} style={{ color: '#10B981' }} />
                                    : null
                                }
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: isAboveAvg ? '#EF4444' : isBelowAvg ? '#10B981' : 'var(--text-muted)' }}>
                                  {Math.abs(vsAvg) < 5 ? '~ avg' : `${Math.abs(vsAvg).toFixed(0)}% ${isAboveAvg ? 'above' : 'below'}`}
                                </span>
                              </div>
                            )}
                            <ChevronDown
                              size={13}
                              style={{ color: 'var(--text-muted)', marginTop: 4, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}
                            />
                          </div>
                        </div>

                        {/* Segmented meal type bar */}
                        <MealTypeBar credits={dayCredits} totalAmount={dayTotal} />
                      </div>

                      {/* ── Vendor chips row ── */}
                      {!collapsed && dayVendors.length > 1 && (
                        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {dayVendors.map((vendor) => {
                            const vc  = vendorColor(vendor);
                            const amt = dayCredits.filter((c) => c.vendor_name === vendor).reduce((s, c) => s + toNum(c.amount), 0);
                            return (
                              <div key={vendor} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 8px', borderRadius: 20,
                                background: `${vc}12`, border: `1px solid ${vc}30`,
                              }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${vc}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 800, color: vc }}>
                                  {initials(vendor)}
                                </div>
                                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: vc }}>{vendor}</span>
                                <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{formatNaira(amt)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Meal rows ── */}
                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ borderTop: '1px solid var(--glass-border)' }}>
                              {dayCredits.map((credit, i) => {
                                const isSelected = selected.includes(credit.id);
                                const mealCfg    = credit.meal_type ? MEAL_CONFIG[credit.meal_type] : null;

                                return (
                                  <div
                                    key={credit.id}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 12,
                                      padding: '10px 16px',
                                      borderBottom: i < dayCredits.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                      background: isSelected ? 'rgba(245,158,11,0.07)' : 'transparent',
                                      transition: 'background 0.15s',
                                    }}
                                  >
                                    {/* Checkbox or meal icon */}
                                    {selectMode ? (
                                      <button
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: isSelected ? '#F59E0B' : 'var(--text-muted)', flexShrink: 0 }}
                                        onClick={() => toggleSelect(credit.id)}
                                      >
                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                      </button>
                                    ) : (
                                      <div style={{
                                        width: 38, height: 38, borderRadius: 13, flexShrink: 0,
                                        background: mealCfg ? mealCfg.bg : 'rgba(245,158,11,0.1)',
                                        border: `1px solid ${mealCfg ? mealCfg.color + '30' : 'rgba(245,158,11,0.2)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18,
                                      }}>
                                        {mealCfg ? mealCfg.emoji : <Utensils size={14} style={{ color: '#F59E0B' }} />}
                                      </div>
                                    )}

                                    {/* Meal info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                        {credit.meal_description ?? 'Meal'}
                                      </p>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        {/* Vendor chip */}
                                        <span style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 3,
                                          fontSize: '0.6rem', fontWeight: 600,
                                          color: vendorColor(credit.vendor_name),
                                          background: `${vendorColor(credit.vendor_name)}15`,
                                          padding: '1px 6px', borderRadius: 20,
                                          border: `1px solid ${vendorColor(credit.vendor_name)}25`,
                                        }}>
                                          {credit.vendor_name}
                                        </span>
                                        {mealCfg && (
                                          <span style={{ fontSize: '0.55rem', color: mealCfg.color, fontWeight: 600 }}>
                                            {mealCfg.time}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Amount */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color: '#F59E0B' }}>
                                        {formatNaira(toNum(credit.amount))}
                                      </span>
                                    </div>

                                    {/* Actions */}
                                    {!selectMode && (
                                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                        <button
                                          className="btn-ghost"
                                          style={{ padding: '5px', borderRadius: 8 }}
                                          onClick={() => onEditCredit(credit)}
                                          title="Edit"
                                        >
                                          <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                        <button
                                          className="btn-ghost"
                                          style={{ padding: '5px', borderRadius: 8 }}
                                          onClick={() => onDeleteCredit(credit.id)}
                                          title="Delete"
                                        >
                                          <Trash2 size={12} style={{ color: 'var(--accent-red)' }} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* ── Card footer: settle buttons ── */}
                            {!selectMode && (
                              <div style={{
                                padding: '8px 16px',
                                borderTop: '1px solid var(--glass-border)',
                                background: 'rgba(0,0,0,0.05)',
                                display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
                              }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 2 }}>Settle:</span>
                                {dayVendors.map((vendor) => {
                                  const vc              = vendorColor(vendor);
                                  const vendorDayIds    = dayCredits.filter((c) => c.vendor_name === vendor).map((c) => c.id);
                                  const vendorDayTotal  = dayCredits.filter((c) => c.vendor_name === vendor).reduce((s, c) => s + toNum(c.amount), 0);
                                  return (
                                    <button
                                      key={vendor}
                                      onClick={() => onPayVendor(vendor, vendorDayIds)}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                        background: `${vc}15`, border: `1px solid ${vc}35`,
                                        fontSize: '0.6rem', fontWeight: 700, color: vc,
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      <Check size={9} />
                                      {vendor} · {formatNaira(vendorDayTotal)}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>
                </motion.div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#10B981' }}>
                        {initials(p.vendor_name)}
                      </div>
                      <div>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{p.vendor_name}</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {format(new Date(p.paid_at), 'dd MMM yyyy · h:mm a')}
                          {detail && <span style={{ marginLeft: 6, color: '#F59E0B' }}>· {detail.credits.length} meals</span>}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-green)' }}>
                          {formatNaira(toNum(p.amount_paid))}
                        </p>
                        <p style={{ fontSize: '0.6rem', color: 'var(--accent-green)', fontWeight: 600 }}>✓ Paid</p>
                      </div>
                      {detail && (isExpanded
                        ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                        : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                  </div>

                  {isExpanded && detail && (
                    <div style={{ padding: 'var(--space-2) var(--space-3) var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 10, marginBottom: 'var(--space-2)' }}>
                      {detail.credits.map((c, i) => {
                        const mCfg = c.meal_type ? MEAL_CONFIG[c.meal_type] : null;
                        return (
                          <div key={c.id ?? i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 'var(--text-xs)', borderBottom: i < detail.credits.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              {mCfg && <span>{mCfg.emoji}</span>}
                              {c.meal_description || 'Meal'} · {format(new Date(c.purchase_date + 'T00:00:00'), 'dd MMM')}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {formatNaira(toNum(c.amount))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
