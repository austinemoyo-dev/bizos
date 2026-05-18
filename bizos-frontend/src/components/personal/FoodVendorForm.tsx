'use client';

import { useState } from 'react';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { FoodCredit, FoodCreditCreate, MealType } from '@/types/api';
import { format } from 'date-fns';
import { Loader2, RotateCcw } from 'lucide-react';

const MEAL_TYPES: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️'  },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { key: 'snack',     label: 'Snack',     emoji: '🍿' },
];

interface FoodVendorFormProps {
  allVendors?: string[];          // all historical vendor names (paid + unpaid)
  allCredits?: FoodCredit[];      // all historical credits for quick-repeat
  initialValues?: Partial<FoodCreditCreate>;
  onSubmit: (data: FoodCreditCreate) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function FoodVendorForm({
  allVendors = [],
  allCredits = [],
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Record Meal',
}: FoodVendorFormProps) {
  const [form, setForm] = useState<FoodCreditCreate>({
    vendor_name:      initialValues?.vendor_name      ?? '',
    purchase_date:    initialValues?.purchase_date    ?? format(new Date(), 'yyyy-MM-dd'),
    meal_description: initialValues?.meal_description ?? '',
    amount:           initialValues?.amount           ?? 0,
    meal_type:        initialValues?.meal_type,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = <K extends keyof FoodCreditCreate>(k: K, v: FoodCreditCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Quick-repeat: find the most recent credit from the current vendor
  const lastCreditForVendor = allCredits
    .filter((c) => c.vendor_name.toLowerCase() === form.vendor_name.toLowerCase())
    .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))[0] ?? null;

  const handleRepeat = () => {
    if (!lastCreditForVendor) return;
    setForm((f) => ({
      ...f,
      meal_description: lastCreditForVendor.meal_description ?? '',
      amount:           Number(lastCreditForVendor.amount),
      meal_type:        lastCreditForVendor.meal_type,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendor_name.trim()) { setError('Vendor name is required.'); return; }
    if (!form.amount || form.amount <= 0) { setError('Enter a valid amount.'); return; }
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

      {/* Vendor */}
      <div className="form-group">
        <label className="form-label">Vendor Name *</label>
        <input
          className="input"
          list="fv-vendors"
          value={form.vendor_name}
          onChange={(e) => set('vendor_name', e.target.value)}
          required
          placeholder="Mama Tunde's Kitchen"
        />
        <datalist id="fv-vendors">
          {allVendors.map((v) => <option key={v} value={v} />)}
        </datalist>
      </div>

      {/* Quick-repeat */}
      {lastCreditForVendor && (
        <button
          type="button"
          onClick={handleRepeat}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%', marginBottom: 'var(--space-4)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10, cursor: 'pointer',
            fontSize: 'var(--text-xs)', color: '#F59E0B', fontWeight: 600,
          }}
        >
          <RotateCcw size={12} />
          Repeat last: {lastCreditForVendor.meal_description || 'Meal'} — ₦{Number(lastCreditForVendor.amount).toLocaleString()}
        </button>
      )}

      {/* Date */}
      <div className="form-group">
        <label className="form-label">Date</label>
        <input
          type="date" className="input"
          value={form.purchase_date}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => set('purchase_date', e.target.value)}
        />
      </div>

      {/* Meal type picker */}
      <div className="form-group">
        <label className="form-label">Meal Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {MEAL_TYPES.map((m) => {
            const active = form.meal_type === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => set('meal_type', active ? undefined : m.key)}
                style={{
                  flex: 1, padding: '6px 4px',
                  borderRadius: 10, border: `1.5px solid ${active ? '#F59E0B' : 'var(--border-default)'}`,
                  background: active ? 'rgba(245,158,11,0.12)' : 'var(--bg-overlay)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{m.emoji}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: active ? '#F59E0B' : 'var(--text-muted)' }}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Meal Description</label>
        <input
          className="input"
          value={form.meal_description ?? ''}
          onChange={(e) => set('meal_description', e.target.value)}
          placeholder="Jollof rice + chicken"
        />
      </div>

      {/* Amount */}
      <div className="form-group">
        <CurrencyInput label="Amount *" value={form.amount} onChange={(v) => set('amount', v)} />
      </div>

      {error && <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
