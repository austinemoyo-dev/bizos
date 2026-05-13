'use client';

import { useState } from 'react';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { FoodCreditCreate } from '@/types/api';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface FoodVendorFormProps {
  recentVendors?: string[];
  onSubmit: (data: FoodCreditCreate) => Promise<void>;
  onCancel: () => void;
}

export function FoodVendorForm({ recentVendors = [], onSubmit, onCancel }: FoodVendorFormProps) {
  const [form, setForm] = useState<FoodCreditCreate>({
    vendor_name: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    meal_description: '',
    amount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FoodCreditCreate>(k: K, v: FoodCreditCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record meal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Vendor Name *</label>
        <input
          className="input" list="vendors" value={form.vendor_name}
          onChange={(e) => set('vendor_name', e.target.value)}
          required placeholder="Mama Tunde's Kitchen"
        />
        <datalist id="vendors">
          {recentVendors.map((v) => <option key={v} value={v} />)}
        </datalist>
      </div>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input type="date" className="input" value={form.purchase_date}
          onChange={(e) => set('purchase_date', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Meal Description</label>
        <input className="input" value={form.meal_description ?? ''}
          onChange={(e) => set('meal_description', e.target.value)} placeholder="Jollof rice + chicken" />
      </div>
      <div className="form-group">
        <CurrencyInput label="Amount *" value={form.amount} onChange={(v) => set('amount', v)} />
      </div>

      {error && <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          Record Meal
        </button>
      </div>
    </form>
  );
}
