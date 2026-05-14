'use client';
import { FoodVendorAnalytics, VendorSpendingSummary } from '@/lib/api/food-vendor';
import { FoodCredit, FoodVendorPayment } from '@/types/api';
import { StatWidget } from '@/components/shared/StatWidget';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNaira } from '@/lib/format';
import { format } from 'date-fns';
import { Utensils, Check, CreditCard, Users } from 'lucide-react';

const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

function groupByDate(credits: FoodCredit[]) {
  return credits.reduce((acc, c) => {
    const k = c.purchase_date.slice(0, 10);
    if (!acc[k]) acc[k] = [];
    acc[k].push(c);
    return acc;
  }, {} as Record<string, FoodCredit[]>);
}

interface Props {
  unpaid: FoodCredit[];
  payments: FoodVendorPayment[];
  analytics: FoodVendorAnalytics | undefined;
  vendors: VendorSpendingSummary[];
  onMarkPaid: () => void;
}

export function FoodVendorOverview({ unpaid, payments, analytics, vendors, onMarkPaid }: Props) {
  const totalDebt = unpaid.reduce((s, c) => s + toNum(c.amount), 0);
  const grouped = groupByDate(unpaid);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }} className="stat-grid">
        <StatWidget label="Outstanding" value={formatNaira(toNum(analytics?.total_outstanding))} accent="warning" loading={!analytics} />
        <StatWidget label="This Week" value={formatNaira(toNum(analytics?.weekly_total))} accent="neutral" loading={!analytics} />
        <StatWidget label="This Month" value={formatNaira(toNum(analytics?.monthly_total))} accent="neutral" loading={!analytics} />
        <StatWidget label="Daily Avg" value={formatNaira(toNum(analytics?.daily_average))} accent="neutral" loading={!analytics} />
      </div>

      {/* Vendor Summary */}
      {vendors.length > 0 && (
        <div className="liquid-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
            <Users size={14} style={{ color: '#F59E0B' }} />
            <p className="section-label" style={{ marginBottom: 0 }}>Vendors</p>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {vendors.map((v, i) => {
              const maxSpent = toNum(vendors[0]?.total_spent);
              const pct = maxSpent > 0 ? (toNum(v.total_spent) / maxSpent) * 100 : 0;
              return (
                <div key={v.vendor_name} style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{v.vendor_name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>{formatNaira(toNum(v.total_spent))}</span>
                      {toNum(v.unpaid_amount) > 0 && (
                        <span style={{ fontSize: 'var(--text-xs)', color: '#F59E0B', marginLeft: 8 }}>
                          {formatNaira(toNum(v.unpaid_amount))} owed
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--glass-border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: i === 0 ? '#F59E0B' : '#6366F1', transition: 'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{v.total_meals} meals</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unpaid Credits */}
      <div className="liquid-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 2 }}>Unpaid Credits</p>
            {unpaid.length > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {unpaid.length} items · <span style={{ fontFamily: 'var(--font-mono)', color: '#F59E0B' }}>{formatNaira(totalDebt)}</span>
              </p>
            )}
          </div>
          {unpaid.length > 0 && (
            <button className="btn-primary" style={{ fontSize: 'var(--text-xs)' }} onClick={onMarkPaid}>
              <Check size={12} /> Mark All Paid
            </button>
          )}
        </div>
        {sortedDates.length === 0 ? (
          <EmptyState icon={<Utensils size={36} />} title="No unpaid credits" description="All clear! Record meals when you eat on credit." />
        ) : (
          <div style={{ position: 'relative', zIndex: 1 }}>
            {sortedDates.map((date) => (
              <div key={date} style={{ marginBottom: 'var(--space-3)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {format(new Date(date + 'T00:00:00'), 'EEE dd MMM')}
                </p>
                {grouped[date].map((credit) => (
                  <div key={credit.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-2)', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Utensils size={14} style={{ color: '#F59E0B' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{credit.meal_description ?? 'Meal'}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{credit.vendor_name}</p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>{formatNaira(toNum(credit.amount))}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="liquid-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
            <CreditCard size={14} style={{ color: 'var(--accent-green)' }} />
            <p className="section-label" style={{ marginBottom: 0 }}>Payment History</p>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{p.vendor_name}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{format(new Date(p.paid_at), 'dd MMM yyyy · h:mm a')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-green)' }}>{formatNaira(toNum(p.amount_paid))}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>✓ Paid</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
