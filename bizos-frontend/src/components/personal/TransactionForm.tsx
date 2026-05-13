'use client';

import { useState } from 'react';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { PersonalTransactionCreate } from '@/types/api';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

const INCOME_CATS = ['Salary', 'Freelance', 'Gift', 'Investment Return', 'Other'];
const EXPENSE_CATS = ['Food', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Clothing', 'Personal Care', 'Other'];
const SAVINGS_CATS = ['Emergency Fund', 'Goal', 'Investment', 'Other'];

interface TransactionFormProps {
  onSubmit: (data: PersonalTransactionCreate) => Promise<void>;
  onCancel: () => void;
}

export function TransactionForm({ onSubmit, onCancel }: TransactionFormProps) {
  const [form, setForm] = useState<PersonalTransactionCreate>({
    type: 'expense',
    category: 'Food',
    amount: 0,
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = form.type === 'income' ? INCOME_CATS : form.type === 'savings' ? SAVINGS_CATS : EXPENSE_CATS;

  const set = <K extends keyof PersonalTransactionCreate>(k: K, v: PersonalTransactionCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleTypeChange = (type: PersonalTransactionCreate['type']) => {
    const cats = type === 'income' ? INCOME_CATS : type === 'savings' ? SAVINGS_CATS : EXPENSE_CATS;
    setForm((f) => ({ ...f, type, category: cats[0] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Type *</label>
        <div className="tabs">
          {(['income', 'expense', 'savings'] as const).map((t) => (
            <button key={t} type="button" className={`tab ${form.type === t ? 'active' : ''}`}
              onClick={() => handleTypeChange(t)} style={{ flex: 1, textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Category *</label>
        <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <CurrencyInput label="Amount *" value={form.amount} onChange={(v) => set('amount', v)} />
      </div>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input type="date" className="input" value={form.transaction_date}
          onChange={(e) => set('transaction_date', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <input className="input" value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)} placeholder="Optional note" />
      </div>

      {error && <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          Record
        </button>
      </div>
    </form>
  );
}
