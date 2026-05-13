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
import { Plus, Loader2, CheckCircle, Banknote } from 'lucide-react';
import { format } from 'date-fns';

const columns: Column<Investment>[] = [
  { key: 'party_name', label: 'Lender' },
  { key: 'amount', label: 'Borrowed', numeric: true, render: (r) => formatNaira(r.amount) },
  { key: 'amount_repaid', label: 'Repaid', numeric: true, render: (r) => formatNaira(r.amount_repaid) },
  { key: 'balance_outstanding', label: 'Still Owe', numeric: true,
    render: (r) => (
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        color: r.balance_outstanding > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
      }}>
        {formatNaira(r.balance_outstanding)}
      </span>
    )
  },
  { key: 'purpose', label: 'Purpose', render: (r) => <span className="muted">{r.purpose ?? '—'}</span> },
  { key: 'due_date', label: 'Due Date', render: (r) => <span className="muted">{r.due_date ? formatDate(r.due_date) : '—'}</span> },
  { key: 'is_settled', label: 'Status',
    render: (r) => (
      <span style={{
        fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase',
        color: r.is_settled ? 'var(--accent-green)' : 'var(--accent-red)',
      }}>
        {r.is_settled ? 'Fully Paid' : 'Outstanding'}
      </span>
    )
  },
  { key: 'received_at', label: 'Borrowed On', render: (r) => <span className="muted">{formatDate(r.received_at)}</span> },
];

export default function LoansPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'outstanding' | 'paid'>('outstanding');
  const [showAdd, setShowAdd] = useState(false);
  const [repayTarget, setRepayTarget] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(false);
  const [repayAmount, setRepayAmount] = useState(0);

  const [form, setForm] = useState<InvestmentCreate>({
    party_name: '',
    type: 'loan',
    amount: 0,
    purpose: '',
    due_date: '',
  });

  const { data: allLoans = [], isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => investmentsApi.list('loan'),
  });

  const outstanding = allLoans.filter((l) => !l.is_settled);
  const paid        = allLoans.filter((l) => l.is_settled);
  const items       = tab === 'outstanding' ? outstanding : paid;

  const totalBorrowed    = allLoans.reduce((s, l) => s + l.amount, 0);
  const totalOutstanding = outstanding.reduce((s, l) => s + l.balance_outstanding, 0);
  const totalRepaid      = allLoans.reduce((s, l) => s + l.amount_repaid, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await investmentsApi.create({ ...form, type: 'loan' });
      qc.invalidateQueries({ queryKey: ['loans'] });
      addToast({ type: 'success', title: 'Loan recorded' });
      setShowAdd(false);
      setForm({ party_name: '', type: 'loan', amount: 0, purpose: '', due_date: '' });
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
      qc.invalidateQueries({ queryKey: ['loans'] });
      const isNowPaid = repayAmount >= repayTarget.balance_outstanding;
      addToast({
        type: 'success',
        title: isNowPaid ? 'Loan fully repaid!' : 'Repayment recorded',
        message: isNowPaid ? `${repayTarget.party_name} is now fully settled.` : undefined,
      });
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
        title="Loans & Borrowings"
        subtitle="Money you've borrowed — track who you still owe"
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Record Loan
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Borrowed" value={formatNaira(totalBorrowed)} accent="neutral" />
        <StatWidget label="Still Owe" value={formatNaira(totalOutstanding)} accent={totalOutstanding > 0 ? 'loss' : 'neutral'} />
        <StatWidget label="Total Repaid" value={formatNaira(totalRepaid)} accent="profit" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)' }}>
        {(['outstanding', 'paid'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.02em',
              background: tab === t ? '#C8102E' : 'var(--bg-elevated)',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              boxShadow: tab === t ? '0 2px 8px rgba(200,16,46,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {t === 'outstanding' ? `Outstanding (${outstanding.length})` : `Fully Paid (${paid.length})`}
          </button>
        ))}
      </div>

      <div className="liquid-card-flush" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyMessage={tab === 'outstanding' ? 'No outstanding loans — great!' : 'No fully repaid loans yet'}
          emptyAction={tab === 'outstanding' ? { label: 'Record a loan', onClick: () => setShowAdd(true) } : undefined}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => { if (!r.is_settled) { setRepayTarget(r); setRepayAmount(r.balance_outstanding); } }}
          mobileRender={(r) => (
            <div className="mobile-txn-card">
              <div className="mobile-txn-row">
                <div className="mobile-txn-icon" style={{ background: r.is_settled ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)' }}>
                  <Banknote size={18} style={{ color: r.is_settled ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                </div>
                <div className="mobile-txn-info">
                  <div className="mobile-txn-primary">{r.party_name}</div>
                  <div className="mobile-txn-secondary">{r.purpose || 'No purpose'}{r.due_date ? ` · Due ${formatDate(r.due_date)}` : ''}</div>
                </div>
                <div className="mobile-txn-amount" style={{ color: r.balance_outstanding > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {formatNaira(r.balance_outstanding > 0 ? r.balance_outstanding : r.amount)}
                </div>
              </div>
              <div className="mobile-txn-meta">
                <span className="mobile-txn-chip" style={{
                  background: r.is_settled ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
                  color: r.is_settled ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {r.is_settled ? 'Fully Paid' : 'Outstanding'}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(r.received_at)}</span>
              </div>
            </div>
          )}
        />
      </div>

      {tab === 'outstanding' && outstanding.length > 0 && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
          Click any row to record a repayment
        </p>
      )}

      {/* Add loan modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Loan"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" form="loan-form" type="submit" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Save
            </button>
          </>
        }
      >
        <form id="loan-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Lender Name *</label>
            <input className="input" value={form.party_name}
              onChange={(e) => setForm((f) => ({ ...f, party_name: e.target.value }))}
              required placeholder="e.g. Uncle John, First Bank" />
          </div>
          <div className="form-group">
            <CurrencyInput label="Amount Borrowed *" value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input className="input" value={form.purpose ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              placeholder="e.g. Buy tools, restock inventory" />
          </div>
          <div className="form-group">
            <label className="form-label">Borrowed On</label>
            <input type="date" className="input"
              value={format(new Date(), 'yyyy-MM-dd')}
              onChange={() => {}} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Repayment Due Date (optional)</label>
            <input type="date" className="input" value={form.due_date ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Repayment modal */}
      <Modal
        isOpen={!!repayTarget}
        onClose={() => setRepayTarget(null)}
        title={`Record Repayment — ${repayTarget?.party_name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRepayTarget(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleRepay} disabled={loading || repayAmount <= 0}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Record Repayment
            </button>
          </>
        }
      >
        {repayTarget && (
          <>
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Original Loan</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{formatNaira(repayTarget.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Already Repaid</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>{formatNaira(repayTarget.amount_repaid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Still Owe</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--accent-red)', fontWeight: 700 }}>
                  {formatNaira(repayTarget.balance_outstanding)}
                </span>
              </div>
            </div>
            <CurrencyInput label="Amount Paid Now" value={repayAmount} onChange={setRepayAmount} />
            {repayAmount >= repayTarget.balance_outstanding && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)',
                marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--accent-green)',
              }}>
                <CheckCircle size={13} />
                This will fully settle the loan!
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
