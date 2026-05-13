'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { investmentsApi } from '@/lib/api/investments';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { StatWidget } from '@/components/shared/StatWidget';
import { formatNaira, formatDate } from '@/lib/format';
import { Investment, InvestmentCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const columns: Column<Investment>[] = [
  { key: 'party_name', label: 'Investor' },
  { key: 'amount', label: 'Amount', numeric: true, render: (r) => formatNaira(r.amount) },
  { key: 'amount_repaid', label: 'Returned', numeric: true, render: (r) => formatNaira(r.amount_repaid) },
  { key: 'balance_outstanding', label: 'Still Active', numeric: true,
    render: (r) => (
      <span style={{ fontFamily: 'var(--font-mono)', color: r.balance_outstanding > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
        {formatNaira(r.balance_outstanding)}
      </span>
    )
  },
  { key: 'purpose', label: 'Purpose', render: (r) => <span className="muted">{r.purpose ?? '—'}</span> },
  { key: 'is_settled', label: 'Status',
    render: (r) => (
      <span style={{
        fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase',
        color: r.is_settled ? 'var(--accent-green)' : 'var(--accent-amber)',
      }}>
        {r.is_settled ? 'Settled' : 'Active'}
      </span>
    )
  },
  { key: 'received_at', label: 'Date', render: (r) => <span className="muted">{formatDate(r.received_at)}</span> },
];

export default function InvestmentsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [repayTarget, setRepayTarget] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(false);
  const [repayAmount, setRepayAmount] = useState(0);

  const [form, setForm] = useState<InvestmentCreate>({
    party_name: '',
    type: 'investment',
    amount: 0,
    expected_return: 0,
    due_date: '',
    purpose: '',
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: () => investmentsApi.list('investment'),
  });

  const totalReceived   = items.reduce((s, i) => s + i.amount, 0);
  const totalActive     = items.filter((i) => !i.is_settled).reduce((s, i) => s + i.balance_outstanding, 0);
  const activeCount     = items.filter((i) => !i.is_settled).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await investmentsApi.create({ ...form, type: 'investment' });
      qc.invalidateQueries({ queryKey: ['investments'] });
      addToast({ type: 'success', title: 'Investment recorded' });
      setShowAdd(false);
      setForm({ party_name: '', type: 'investment', amount: 0, purpose: '' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!repayTarget || repayAmount <= 0) return;
    setLoading(true);
    try {
      await investmentsApi.repay(repayTarget.id, { amount: repayAmount });
      qc.invalidateQueries({ queryKey: ['investments'] });
      addToast({ type: 'success', title: 'Return recorded' });
      setRepayTarget(null);
      setRepayAmount(0);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Investor Funding"
        subtitle="People who have invested money into the business"
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Investor
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Received" value={formatNaira(totalReceived)} accent="investment" />
        <StatWidget label="Still Active" value={formatNaira(totalActive)} accent={totalActive > 0 ? 'warning' : 'neutral'} />
        <StatWidget label="Active Investors" value={String(activeCount)} accent="neutral" />
      </div>

      <div className="liquid-card-flush" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyMessage="No investor funding recorded"
          emptyAction={{ label: 'Add first investor', onClick: () => setShowAdd(true) }}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => { if (!r.is_settled) { setRepayTarget(r); setRepayAmount(r.balance_outstanding); } }}
          mobileRender={(r) => (
            <div className="mobile-txn-card">
              <div className="mobile-txn-row">
                <div className="mobile-txn-icon" style={{ background: 'var(--accent-gold-glow)' }}>
                  <TrendingUp size={18} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <div className="mobile-txn-info">
                  <div className="mobile-txn-primary">{r.party_name}</div>
                  <div className="mobile-txn-secondary">{r.purpose || 'No purpose specified'}</div>
                </div>
                <div className="mobile-txn-amount" style={{ color: 'var(--accent-gold)' }}>
                  {formatNaira(r.amount)}
                </div>
              </div>
              <div className="mobile-txn-meta">
                <span className="mobile-txn-chip" style={{
                  background: r.is_settled ? 'var(--accent-green-glow)' : 'var(--accent-amber-glow)',
                  color: r.is_settled ? 'var(--accent-green)' : 'var(--accent-amber)',
                }}>
                  {r.is_settled ? 'Settled' : `Active · ${formatNaira(r.balance_outstanding)}`}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(r.received_at)}</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Add investor modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Investor Funding"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" form="inv-form" type="submit" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Save
            </button>
          </>
        }
      >
        <form id="inv-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Investor Name *</label>
            <input className="input" value={form.party_name}
              onChange={(e) => setForm((f) => ({ ...f, party_name: e.target.value }))}
              required placeholder="e.g. Uncle Femi, GTBank Loan" />
          </div>
          <div className="form-group">
            <CurrencyInput label="Amount Received *" value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input className="input" value={form.purpose ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              placeholder="e.g. Shop expansion, equipment" />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Return (optional)</label>
            <CurrencyInput label="" value={form.expected_return ?? 0}
              onChange={(v) => setForm((f) => ({ ...f, expected_return: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Due / Maturity Date (optional)</label>
            <input type="date" className="input" value={form.due_date ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Record return modal */}
      <Modal
        isOpen={!!repayTarget}
        onClose={() => setRepayTarget(null)}
        title={`Record Return — ${repayTarget?.party_name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRepayTarget(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleRepay} disabled={loading || repayAmount <= 0}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Record Return
            </button>
          </>
        }
      >
        {repayTarget && (
          <>
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Original Amount</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{formatNaira(repayTarget.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Outstanding</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', fontWeight: 700 }}>
                  {formatNaira(repayTarget.balance_outstanding)}
                </span>
              </div>
            </div>
            <CurrencyInput label="Amount to Return" value={repayAmount} onChange={setRepayAmount} />
          </>
        )}
      </Modal>
    </div>
  );
}
