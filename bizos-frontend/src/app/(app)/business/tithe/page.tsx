'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { titheApi } from '@/lib/api/tithe';
import { PageHeader } from '@/components/shared/PageHeader';
import { TitheCard } from '@/components/business/TitheCard';
import { StatWidget } from '@/components/shared/StatWidget';
import { Modal } from '@/components/shared/Modal';
import { formatNaira } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { HandCoins, Loader2, CheckCheck } from 'lucide-react';

export default function BusinessTithePage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [payingAll, setPayingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: unpaidData, isLoading: loadingUnpaid } = useQuery({
    queryKey: ['tithe', 'business', 'unpaid'],
    queryFn: () => titheApi.list({ scope: 'business', paid: false }),
  });

  const { data: paidData } = useQuery({
    queryKey: ['tithe', 'business', 'paid'],
    queryFn: () => titheApi.list({ scope: 'business', paid: true }),
  });

  const unpaidItems = unpaidData?.items ?? [];
  const totalDue = unpaidItems.reduce((s, t) => s + Number(t.tithe_amount), 0);
  const totalPaid = (paidData?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);

  const selectedTotal = unpaidItems
    .filter((t) => selectedIds.has(t.id))
    .reduce((s, t) => s + Number(t.tithe_amount), 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === unpaidItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpaidItems.map((t) => t.id)));
    }
  };

  const handleMarkPaid = async (id: string) => {
    await titheApi.markPaid(id);
    qc.invalidateQueries({ queryKey: ['tithe'] });
    qc.invalidateQueries({ queryKey: ['business-summary'] });
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    addToast({ type: 'success', title: 'Tithe marked as paid', message: 'Expense record created.' });
  };

  const handlePaySelected = async () => {
    const ids = selectedIds.size > 0
      ? Array.from(selectedIds)
      : unpaidItems.map((t) => t.id);
    setPayingAll(true);
    let paid = 0;
    for (const id of ids) {
      try {
        await titheApi.markPaid(id);
        paid++;
      } catch {}
    }
    qc.invalidateQueries({ queryKey: ['tithe'] });
    qc.invalidateQueries({ queryKey: ['business-summary'] });
    setSelectedIds(new Set());
    setConfirmBulk(false);
    setPayingAll(false);
    addToast({ type: 'success', title: `${paid} tithe${paid !== 1 ? 's' : ''} marked as paid` });
  };

  const payCount = selectedIds.size > 0 ? selectedIds.size : unpaidItems.length;
  const payTotal = selectedIds.size > 0 ? selectedTotal : totalDue;

  return (
    <div>
      <PageHeader
        title="Business Tithe"
        subtitle="10% of business profit, given first"
        actions={
          unpaidItems.length > 0 ? (
            <button
              className="btn-primary"
              style={{ gap: 'var(--space-2)' }}
              onClick={() => setConfirmBulk(true)}
            >
              <CheckCheck size={15} />
              {selectedIds.size > 0 ? `Pay Selected (${selectedIds.size})` : `Pay All (${unpaidItems.length})`}
            </button>
          ) : undefined
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Due" value={formatNaira(totalDue)} accent="warning" />
        <StatWidget label="Total Paid" value={formatNaira(totalPaid)} accent="profit" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          Unpaid Tithe
        </h2>
        {unpaidItems.length > 1 && (
          <button
            className="btn-ghost"
            style={{ fontSize: 'var(--text-xs)', gap: 'var(--space-2)' }}
            onClick={toggleSelectAll}
          >
            {selectedIds.size === unpaidItems.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {loadingUnpaid ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={80} />)}
        </div>
      ) : unpaidItems.length === 0 ? (
        <EmptyState icon={<HandCoins size={48} />} title="All caught up!" description="No unpaid tithe — you're doing great." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
          {unpaidItems.map((tithe) => (
            <div key={tithe.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {unpaidItems.length > 1 && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(tithe.id)}
                  onChange={() => toggleSelect(tithe.id)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <TitheCard tithe={tithe} onMarkPaid={handleMarkPaid} />
              </div>
            </div>
          ))}
        </div>
      )}

      {paidData && paidData.items.length > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
            Paid History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {paidData.items.map((tithe) => (
              <TitheCard key={tithe.id} tithe={tithe} onMarkPaid={async () => {}} />
            ))}
          </div>
        </>
      )}

      {/* Bulk confirm modal */}
      <Modal
        isOpen={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        title="Confirm Bulk Payment"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmBulk(false)} disabled={payingAll}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handlePaySelected} disabled={payingAll} style={{ gap: 'var(--space-2)' }}>
              {payingAll && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {payingAll ? 'Paying...' : `Pay ${formatNaira(payTotal)}`}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            You are about to mark <strong style={{ color: 'var(--text-primary)' }}>{payCount} tithe record{payCount !== 1 ? 's' : ''}</strong> as paid.
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent-amber)' }}>
            {formatNaira(payTotal)}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
            Each item will create an Expense record automatically.
          </p>
        </div>
      </Modal>
    </div>
  );
}
