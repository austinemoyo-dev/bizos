'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { salesApi } from '@/lib/api/sales';
import { repairsApi } from '@/lib/api/repairs';
import { DebtorItem } from '@/types/api';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatNaira, formatDate } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { ScrollText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { useState } from 'react';

export default function DebtorsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const { data: debtors, isLoading } = useQuery({
    queryKey: ['debtors'],
    queryFn: () => analyticsApi.debtors(),
  });

  const [selectedDebtor, setSelectedDebtor] = useState<DebtorItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSettle = async () => {
    if (!selectedDebtor) return;
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      addToast({ type: 'error', title: 'Please enter a valid amount greater than 0' });
      return;
    }
    
    const newTotalPaid = Number(selectedDebtor.amount_paid) + paymentAmount;
    if (newTotalPaid > Number(selectedDebtor.total_amount)) {
      addToast({ type: 'error', title: 'Payment exceeds total balance' });
      return;
    }
    
    setIsUpdating(true);
    try {
      if (selectedDebtor.type === 'sale') {
        await salesApi.updatePayment(selectedDebtor.id, newTotalPaid);
      } else {
        await repairsApi.updatePayment(selectedDebtor.id, newTotalPaid);
      }
      qc.invalidateQueries({ queryKey: ['debtors'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['repairs'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: 'Payment updated' });
      setSelectedDebtor(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update payment', message: err instanceof Error ? err.message : '' });
    } finally {
      setIsUpdating(false);
    }
  };

  const openModal = (debtor: DebtorItem) => {
    setSelectedDebtor(debtor);
    setPaymentAmount(0);
  };

  const columns: Column<DebtorItem>[] = [
    { key: 'customer_name', label: 'Customer', render: (r) => <span style={{ fontWeight: 500 }}>{r.customer_name}</span> },
    { key: 'type', label: 'Type', render: (r) => (
      <Badge variant={r.type === 'sale' ? 'info' : 'warning'}>{r.type.toUpperCase()}</Badge>
    )},
    { key: 'reference', label: 'Item / Job' },
    { key: 'total_amount', label: 'Total', numeric: true, render: (r) => formatNaira(r.total_amount) },
    { key: 'amount_paid', label: 'Paid', numeric: true, render: (r) => <span style={{ color: 'var(--accent-green)' }}>{formatNaira(r.amount_paid)}</span> },
    { key: 'balance', label: 'Owing', numeric: true, render: (r) => <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{formatNaira(r.balance)}</span> },
    { key: 'date', label: 'Date', render: (r) => <span className="muted">{formatDate(r.date)}</span> },
    { key: 'id', label: '', render: (r) => (
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <button
          className="btn-primary"
          style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}
          onClick={(e) => { e.stopPropagation(); openModal(r); }}
        >
          Update Payment
        </button>
      </div>
    )},
  ];

  const totalOwed = debtors?.reduce((sum, d) => sum + Number(d.balance), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', height: '100%' }}>
      <PageHeader
        title="Debtors Tracker"
        subtitle="Track outstanding payments from both sales and repair jobs."
        icon={ScrollText}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
        <div className="liquid-card" style={{ padding: 'var(--space-5)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)' }}>
              <ScrollText size={20} />
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Money Owed</p>
              <h2 className="hero-amount" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {formatNaira(totalOwed)}
              </h2>
            </div>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', position: 'relative', zIndex: 1 }}>
            This is the total outstanding balance across {debtors?.length || 0} customer(s).
          </p>
        </div>
      </div>

      <div className="liquid-card-flush" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          </div>
        ) : debtors && debtors.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <DataTable
              columns={columns}
              data={debtors}
              keyExtractor={(d) => d.id}
              mobileRender={(r) => (
                <div className="mobile-txn-card">
                  <div className="mobile-txn-row">
                    <div className="mobile-txn-icon" style={{ background: 'var(--accent-red-glow)' }}>
                      <ScrollText size={18} style={{ color: 'var(--accent-red)' }} />
                    </div>
                    <div className="mobile-txn-info">
                      <div className="mobile-txn-primary">{r.customer_name}</div>
                      <div className="mobile-txn-secondary">{r.reference} · {r.type.toUpperCase()}</div>
                    </div>
                    <div className="mobile-txn-amount" style={{ color: 'var(--accent-red)' }}>
                      {formatNaira(r.balance)}
                    </div>
                  </div>
                  <div className="mobile-txn-meta">
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Paid {formatNaira(r.amount_paid)} of {formatNaira(r.total_amount)}
                    </span>
                    <button
                      className="btn-primary"
                      style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}
                      onClick={(e) => { e.stopPropagation(); openModal(r); }}
                    >
                      Pay
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 'var(--space-8)' }}>
            <ScrollText size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>No Debtors Found</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>All customers have fully paid their balances!</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedDebtor}
        onClose={() => setSelectedDebtor(null)}
        title="Update Payment"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setSelectedDebtor(null)} disabled={isUpdating}>Cancel</button>
            <button className="btn-primary" onClick={handleSettle} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Save Payment'}
            </button>
          </>
        }
      >
        {selectedDebtor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--bg-base)', padding: 'var(--space-3)', borderRadius: 8, fontSize: 'var(--text-sm)' }}>
              <p><strong>Customer:</strong> {selectedDebtor.customer_name}</p>
              <p><strong>Item/Job:</strong> {selectedDebtor.reference}</p>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="muted">Total Cost:</span> <span>{formatNaira(selectedDebtor.total_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="muted">Currently Paid:</span> <span style={{ color: 'var(--accent-green)' }}>{formatNaira(selectedDebtor.amount_paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Balance:</span> <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{formatNaira(selectedDebtor.balance)}</span>
              </div>
            </div>

            <div className="input-group">
              <label>Enter new payment amount</label>
              <CurrencyInput
                value={paymentAmount}
                onChange={setPaymentAmount}
                placeholder="Amount just paid"
              />
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                This amount will be added to the {formatNaira(selectedDebtor.amount_paid)} currently paid.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
