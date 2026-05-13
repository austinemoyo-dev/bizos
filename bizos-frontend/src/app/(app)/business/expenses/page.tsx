'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '@/lib/api/expenses';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { StatWidget } from '@/components/shared/StatWidget';
import { formatNaira, formatDate } from '@/lib/format';
import { Expense, ExpenseCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Loader2, Download, Receipt } from 'lucide-react';
import { IfRole } from '@/components/shared/IfRole';
import { format } from 'date-fns';
import { exportCsv } from '@/lib/exportCsv';
const CATEGORIES = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'damage_loss', label: 'Damage Loss' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salary', label: 'Salary' },
  { value: 'transport', label: 'Transport' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'miscellaneous', label: 'Other' }
];
const columns: Column<Expense>[] = [
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description', render: (r) => <span className="muted">{r.description ?? '—'}</span> },
  { key: 'amount', label: 'Amount', numeric: true, render: (r) => formatNaira(r.amount) },
  { key: 'expense_date', label: 'Date', render: (r) => <span className="muted">{formatDate(r.expense_date)}</span> },
];

export default function ExpensesPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ExpenseCreate>({
    category: 'miscellaneous',
    amount: 0,
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.list({ size: 100 }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await expensesApi.create(form);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: 'Expense recorded' });
      setShowAdd(false);
      setForm({ category: 'miscellaneous', amount: 0, description: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  };

  const items = data?.items ?? [];
  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        actions={
          <>
            <button
              className="btn-ghost"
              onClick={() => exportCsv('expenses', items.map(r => ({
                category: r.category,
                description: r.description ?? '',
                amount: r.amount,
                date: r.expense_date,
              })))}
              style={{ gap: 'var(--space-2)' }}
            >
              <Download size={14} /> CSV
            </button>
            <IfRole minRole="accountant">
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add Expense
              </button>
            </IfRole>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Expenses" value={formatNaira(total)} accent="loss" />
        <StatWidget label="Transactions" value={String(data?.total ?? 0)} accent="neutral" />
      </div>

      <div className="liquid-card-flush" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyMessage="No expenses recorded"
          emptyAction={{ label: 'Add first expense', onClick: () => setShowAdd(true) }}
          keyExtractor={(r) => r.id}
          mobileRender={(r) => (
            <div className="mobile-txn-card">
              <div className="mobile-txn-row">
                <div className="mobile-txn-icon" style={{ background: 'var(--accent-red-glow)' }}>
                  <Receipt size={18} style={{ color: 'var(--accent-red)' }} />
                </div>
                <div className="mobile-txn-info">
                  <div className="mobile-txn-primary" style={{ textTransform: 'capitalize' }}>{r.category.replace('_', ' ')}</div>
                  <div className="mobile-txn-secondary">{r.description || 'No description'}</div>
                </div>
                <div className="mobile-txn-amount" style={{ color: 'var(--accent-red)' }}>
                  -{formatNaira(Number(r.amount))}
                </div>
              </div>
              <div className="mobile-txn-meta">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(r.expense_date)}</span>
              </div>
            </div>
          )}
        />
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Expense"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" form="expense-form" type="submit" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Save
            </button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="input" value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <CurrencyInput label="Amount *" value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="input" value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="input" value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional note" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
