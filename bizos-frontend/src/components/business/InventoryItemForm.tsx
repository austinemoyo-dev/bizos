'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ItemCreate, Item } from '@/types/api';
import { Loader2, Plus, X, Pencil } from 'lucide-react';
import { useInventoryCategories, DEFAULT_INV_CATEGORIES } from '@/lib/hooks/useCustomOptions';

interface InventoryItemFormProps {
  initial?: Partial<Item>;
  onSubmit: (data: ItemCreate) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function InventoryItemForm({
  initial, onSubmit, onCancel, submitLabel = 'Add Item',
}: InventoryItemFormProps) {
  const { categories, customCategories, addCategory, removeCategory } = useInventoryCategories();

  const [form, setForm] = useState<ItemCreate>({
    name:             initial?.name             ?? '',
    category:         initial?.category         ?? 'Screen',
    sku:              initial?.sku              ?? '',
    purchase_price:   initial?.purchase_price   ?? 0,
    selling_price:    initial?.selling_price    ?? 0,
    quantity_in_stock:initial?.quantity_in_stock ?? 0,
    reorder_level:    initial?.reorder_level    ?? 5,
    supplier:         initial?.supplier         ?? '',
    purchase_date:    initial?.created_at?.slice(0, 10) ?? format(new Date(), 'yyyy-MM-dd'),
  });

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showManageCat, setShowManageCat] = useState(false);
  const [newCatInput, setNewCatInput]     = useState('');
  const [addCatError, setAddCatError]     = useState('');

  const set = <K extends keyof ItemCreate>(k: K, v: ItemCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAddCategory = () => {
    const ok = addCategory(newCatInput);
    if (!ok) { setAddCatError('Already exists or empty'); return; }
    setForm(f => ({ ...f, category: newCatInput.trim() }));
    setNewCatInput('');
    setAddCatError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data: ItemCreate = {
        ...form,
        sku: form.sku?.trim() || undefined,
        supplier: form.supplier?.trim() || undefined,
        selling_price: form.selling_price && form.selling_price > 0 ? form.selling_price : undefined,
        purchase_date: initial ? undefined : form.purchase_date,
      };
      await onSubmit(data);
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
        <input
          className="input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
          placeholder="e.g. iPhone 14 Screen"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        {/* Category with Manage link */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label className="form-label" style={{ margin: 0 }}>Category *</label>
            <button
              type="button"
              onClick={() => setShowManageCat(v => !v)}
              style={{
                fontSize: '0.6rem', fontWeight: 700, color: '#C8102E',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <Pencil size={10} />
              {showManageCat ? 'Done' : 'Manage'}
            </button>
          </div>

          <select
            className="input"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>

          {/* Category manager panel */}
          {showManageCat && (
            <div style={{
              marginTop: 8, padding: '10px 12px',
              background: 'var(--bg-elevated)', borderRadius: 12,
              border: '1px solid var(--border-subtle)',
            }}>
              {/* Add new */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1, padding: '5px 10px', fontSize: 'var(--text-xs)' }}
                  placeholder="New category name..."
                  value={newCatInput}
                  onChange={e => { setNewCatInput(e.target.value); setAddCatError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '5px 10px', fontSize: 'var(--text-xs)' }}
                  onClick={handleAddCategory}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {addCatError && (
                <p style={{ fontSize: '0.6rem', color: 'var(--accent-red)', marginBottom: 6 }}>{addCatError}</p>
              )}

              {/* Custom categories list (removable) */}
              {customCategories.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {customCategories.map(cat => (
                    <div key={cat} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 20,
                      background: 'var(--accent-primary-glow)',
                      border: '1px solid rgba(200,16,46,0.2)',
                      fontSize: '0.6rem', fontWeight: 600, color: '#C8102E',
                    }}>
                      {cat}
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8102E', lineHeight: 0, padding: 0 }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {customCategories.length === 0 && (
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  No custom categories yet. Built-ins: {DEFAULT_INV_CATEGORIES.join(', ')}.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">SKU / Barcode</label>
          <input
            className="input"
            value={form.sku ?? ''}
            onChange={(e) => set('sku', e.target.value)}
            placeholder="SKU-001"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <CurrencyInput label="Purchase Price *" value={form.purchase_price} onChange={(v) => set('purchase_price', v)} />
        <CurrencyInput label="Selling Price"    value={form.selling_price ?? 0} onChange={(v) => set('selling_price', v)} />
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

      {!initial && (
        <div className="form-group">
          <label className="form-label">Purchase Date *</label>
          <input
            type="date"
            className="input"
            value={form.purchase_date ?? ''}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => set('purchase_date', e.target.value)}
            required
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            Sets the expense date in accounts — use the actual purchase date.
          </p>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Supplier</label>
        <input className="input" value={form.supplier ?? ''}
          onChange={(e) => set('supplier', e.target.value)} placeholder="Supplier name" />
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderLeft: '3px solid var(--accent-red)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 'var(--space-4)',
        }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent-red)' }}>
            {error}
          </p>
        </div>
      )}

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
