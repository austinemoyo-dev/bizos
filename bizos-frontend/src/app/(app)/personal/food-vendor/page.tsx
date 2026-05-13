'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { foodVendorApi } from '@/lib/api/food-vendor';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { FoodVendorForm } from '@/components/personal/FoodVendorForm';
import { StatWidget } from '@/components/shared/StatWidget';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNaira, formatDate } from '@/lib/format';
import { FoodCredit, FoodCreditCreate, FoodVendorPayment } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Check, Utensils, Loader2 } from 'lucide-react';
import { format, startOfWeek, differenceInDays } from 'date-fns';

function groupByDate(credits: FoodCredit[]): Record<string, FoodCredit[]> {
  return credits.reduce((acc, c) => {
    const key = c.purchase_date.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, FoodCredit[]>);
}

export default function FoodVendorPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paying, setPaying] = useState(false);

  const { data: unpaid } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn: () => foodVendorApi.credits.list({ paid: false }),
  });

  const { data: payments } = useQuery({
    queryKey: ['food-payments'],
    queryFn: () => foodVendorApi.payments(),
  });

  const weekStart = startOfWeek(new Date());
  const thisWeekCredits = (unpaid ?? []).filter(
    (c) => new Date(c.purchase_date) >= weekStart,
  );
  const weeklyTotal = thisWeekCredits.reduce((s, c) => s + c.amount, 0);
  const daysSinceWeekStart = Math.max(differenceInDays(new Date(), weekStart), 1);
  const dailyAvg = weeklyTotal / daysSinceWeekStart;
  const totalDebt = (unpaid ?? []).reduce((s, c) => s + c.amount, 0);

  const recentVendors = Array.from(new Set((unpaid ?? []).map((c) => c.vendor_name)));

  const handleCreate = async (data: FoodCreditCreate) => {
    await foodVendorApi.credits.create(data);
    qc.invalidateQueries({ queryKey: ['food-credits'] });
    addToast({ type: 'success', title: 'Meal recorded' });
    setShowAdd(false);
  };

  const handlePayAll = async () => {
    if (!unpaid?.length) return;
    setPaying(true);
    try {
      await foodVendorApi.pay(unpaid.map((c) => c.id));
      qc.invalidateQueries({ queryKey: ['food-credits'] });
      qc.invalidateQueries({ queryKey: ['food-payments'] });
      addToast({ type: 'success', title: 'All credits paid', message: 'Personal expense recorded.' });
      setShowConfirm(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Payment failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setPaying(false);
    }
  };

  const grouped = groupByDate(unpaid ?? []);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <PageHeader
        title="Food Vendor"
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Record Meal
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Outstanding Debt" value={formatNaira(totalDebt)} accent="warning" />
        <StatWidget label="This Week Total" value={formatNaira(weeklyTotal)} accent="neutral" />
        <StatWidget label="Daily Average" value={formatNaira(dailyAvg)} accent="neutral" />
      </div>

      {/* Unpaid credits */}
      <div className="liquid-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', position: 'relative', zIndex: 1 }}>
          <p className="section-label" style={{ marginBottom: 0 }}>This Week</p>
          {(unpaid?.length ?? 0) > 0 && (
            <button className="btn-primary" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setShowConfirm(true)}>
              <Check size={12} /> Mark All Paid
            </button>
          )}
        </div>

        {sortedDates.length === 0 ? (
          <EmptyState icon={<Utensils size={36} />} title="No unpaid credits" description="Record your food vendor meals." />
        ) : (
          <div style={{ position: 'relative', zIndex: 1 }}>
            {sortedDates.map((date) => (
              <div key={date} style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                  {format(new Date(date), 'EEE dd MMM')}
                </p>
                {grouped[date].map((credit) => (
                  <div key={credit.id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-2)',
                    borderBottom: '1px solid var(--glass-border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                      background: 'var(--accent-amber-glow)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Utensils size={15} style={{ color: 'var(--accent-amber)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{credit.meal_description ?? 'Meal'}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{credit.vendor_name}</p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-amber)', flexShrink: 0 }}>
                      {formatNaira(credit.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      {(payments?.length ?? 0) > 0 && (
        <div className="liquid-card">
          <p className="section-label" style={{ marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>Payment History</p>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {payments!.map((payment) => (
              <div key={payment.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) 0', borderBottom: '1px solid var(--glass-border)',
              }}>
                <div>
                  <p style={{ fontSize: 'var(--text-sm)' }}>Week of {format(new Date(payment.paid_at), 'MMM dd')}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {payment.credit_ids.length} items
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {formatNaira(payment.total_amount)}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>✓ Paid</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Meal">
        <FoodVendorForm recentVendors={recentVendors} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Mark All Paid"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
            <button className="btn-primary" onClick={handlePayAll} disabled={paying}>
              {paying && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Confirm Payment
            </button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          This will mark all {unpaid?.length} unpaid credits as paid and create a personal expense record of{' '}
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatNaira(totalDebt)}
          </strong>.
        </p>
      </Modal>
    </div>
  );
}
