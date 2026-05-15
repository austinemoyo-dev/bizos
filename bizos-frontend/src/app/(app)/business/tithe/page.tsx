'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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

type Period = 'this_month' | 'last_month' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'this_month',  label: 'This Month'  },
  { key: 'last_month',  label: 'Last Month'  },
  { key: 'all',         label: 'All Time'    },
];

function getPeriodDates(period: Period): { date_from?: string; date_to?: string } {
  const now = new Date();
  if (period === 'this_month') {
    return {
      date_from: format(startOfMonth(now), 'yyyy-MM-dd'),
      date_to:   format(endOfMonth(now),   'yyyy-MM-dd'),
    };
  }
  if (period === 'last_month') {
    const last = subMonths(now, 1);
    return {
      date_from: format(startOfMonth(last), 'yyyy-MM-dd'),
      date_to:   format(endOfMonth(last),   'yyyy-MM-dd'),
    };
  }
  return {};
}

export default function BusinessTithePage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>('this_month');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [payingAll, setPayingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paidDate, setPaidDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const dateRange = getPeriodDates(period);

  const { data: unpaidData, isLoading: loadingUnpaid } = useQuery({
    queryKey: ['tithe', 'business', 'unpaid', period],
    queryFn: () => titheApi.list({ scope: 'business', paid: false, ...dateRange }),
  });

  const { data: paidData } = useQuery({
    queryKey: ['tithe', 'business', 'paid', period],
    queryFn: () => titheApi.list({ scope: 'business', paid: true, ...dateRange }),
  });

  const unpaidItems = unpaidData?.items ?? [];
  const paidItems  = paidData?.items  ?? [];
  const totalDue   = unpaidItems.reduce((s, t) => s + Number(t.tithe_amount), 0);
  const totalPaid  = paidItems.reduce( (s, t) => s + Number(t.tithe_amount), 0);

  const selectedTotal = unpaidItems
    .filter(t => selectedIds.has(t.id))
    .reduce((s, t) => s + Number(t.tithe_amount), 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === unpaidItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpaidItems.map(t => t.id)));
    }
  };

  const handleMarkPaid = async (id: string) => {
    await titheApi.markPaid(id, { paid_date: paidDate });
    qc.invalidateQueries({ queryKey: ['tithe'] });
    qc.invalidateQueries({ queryKey: ['business-summary'] });
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    addToast({ type: 'success', title: 'Tithe marked as paid', message: 'Expense record created.' });
  };

  const handlePaySelected = async () => {
    const ids = selectedIds.size > 0
      ? Array.from(selectedIds)
      : unpaidItems.map(t => t.id);
    setPayingAll(true);
    let paid = 0;
    for (const id of ids) {
      try { await titheApi.markPaid(id, { paid_date: paidDate }); paid++; } catch {}
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
        subtitle="10% of monthly net profit"
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

      {/* Period selector */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 'var(--space-5)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); setSelectedIds(new Set()); }}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 600, flexShrink: 0,
              background: period === p.key ? 'var(--accent-amber)' : 'var(--bg-elevated)',
              color: period === p.key ? '#000' : 'var(--text-secondary)',
              boxShadow: period === p.key ? '0 2px 8px rgba(245,158,11,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Due" value={formatNaira(totalDue)} numericValue={totalDue} numericFormat="currency" accent="warning" />
        <StatWidget label="Paid" value={formatNaira(totalPaid)} numericValue={totalPaid} numericFormat="currency" accent="profit" />
      </div>

      {/* Payment date picker */}
      {unpaidItems.length > 0 && (
        <div className="form-group" style={{ maxWidth: 240, marginBottom: 'var(--space-4)' }}>
          <label className="form-label">Payment Date</label>
          <input
            type="date"
            className="input"
            value={paidDate}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => setPaidDate(e.target.value)}
          />
        </div>
      )}

      {/* Unpaid section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          Unpaid
          {period !== 'all' && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontWeight: 400, marginLeft: 8 }}>
              ({PERIODS.find(p => p.key === period)?.label})
            </span>
          )}
        </h2>
        {unpaidItems.length > 1 && (
          <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', gap: 'var(--space-2)' }} onClick={toggleSelectAll}>
            {selectedIds.size === unpaidItems.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {loadingUnpaid ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={80} />)}
        </div>
      ) : unpaidItems.length === 0 ? (
        <EmptyState
          icon={<HandCoins size={48} />}
          title="All caught up!"
          description={period === 'all' ? 'No unpaid tithe records.' : `No unpaid tithe for ${PERIODS.find(p => p.key === period)?.label?.toLowerCase()}.`}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
          {unpaidItems.map(tithe => (
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

      {/* Paid history */}
      {paidItems.length > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
            Paid History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {paidItems.map(tithe => (
              <TitheCard key={tithe.id} tithe={tithe} onMarkPaid={async () => {}} />
            ))}
          </div>
        </>
      )}

      {/* Bulk pay modal */}
      <Modal
        isOpen={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        title="Confirm Bulk Payment"
        accentColor="var(--accent-amber)"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmBulk(false)} disabled={payingAll}>Cancel</button>
            <button className="btn-primary" onClick={handlePaySelected} disabled={payingAll} style={{ gap: 'var(--space-2)' }}>
              {payingAll && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {payingAll ? 'Paying...' : `Pay ${formatNaira(payTotal)}`}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            You are about to mark{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{payCount} tithe record{payCount !== 1 ? 's' : ''}</strong> as paid.
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent-amber)' }}>
            {formatNaira(payTotal)}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
            Each item will create an Expense record automatically.
          </p>
          <div className="form-group" style={{ textAlign: 'left', marginTop: 'var(--space-4)' }}>
            <label className="form-label">Payment Date</label>
            <input
              type="date"
              className="input"
              value={paidDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setPaidDate(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
