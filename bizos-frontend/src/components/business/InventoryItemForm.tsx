'use client';

import { useState } from 'react';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ItemCreate, Item } from '@/types/api';
import { Loader2 } from 'lucide-react';

const CATEGORIES = ['Screen', 'Battery', 'Charging Port', 'Speaker', 'Camera', 'Housing', 'Tools', 'Accessories', 'Other'];

interface InventoryItemFormProps {
  initial?: Partial<Item>;
  onSubmit: (data: ItemCreate) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function InventoryItemForm({ initial, onSubmit, onCancel, submitLabel = 'Add Item' }: InventoryItemFormProps) {
  const [form, setForm] = useState<ItemCreate>({
    name: initial?.name ?? '',
    category: initial?.category ?? 'Screen',
    sku: initial?.sku ?? '',
    purchase_price: initial?.purchase_price ?? 0,
    selling_price: initial?.selling_price ?? 0,
    quantity_in_stock: initial?.quantity_in_stock ?? 0,
    reorder_level: initial?.reorder_level ?? 5,
    supplier: initial?.supplier ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof ItemCreate>(k: K, v: ItemCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Item Name *</label>
        <input className="input" value={form.name}
          onChange={(e) => set('name', e.target.value)} required placeholder="iPhone 13 Screen" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="input" value={form.category}
            onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">SKU / Barcode</label>
          <input className="input" value={form.sku ?? ''}
            onChange={(e) => set('sku', e.target.value)} placeholder="SKU-001" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <CurrencyInput label="Purchase Price *" value={form.purchase_price}
          onChange={(v) => set('purchase_price', v)} />
        <CurrencyInput label="Selling Price" value={form.selling_price ?? 0}
          onChange={(v) => set('selling_price', v)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <div className="form-group">
          <label className="form-label">Initial Quantity *</label>
          <input type="number" className="input" value={form.quantity_in_stock} min={0}
            onChange={(e) => set('quantity_in_stock', parseInt(e.target.value) || 0)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Reorder Level</label>
          <input type="number" className="input" value={form.reorder_level} min={0}
            onChange={(e) => set('reorder_level', parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Supplier</label>
        <input className="input" value={form.supplier ?? ''}
          onChange={(e) => set('supplier', e.target.value)} placeholder="Supplier name" />
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
