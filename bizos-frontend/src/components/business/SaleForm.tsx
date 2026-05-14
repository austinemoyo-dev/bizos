'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { SaleCreate, Item } from '@/types/api';
import { inventoryApi } from '@/lib/api/inventory';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface SaleFormProps {
  onSubmit: (data: SaleCreate) => Promise<void>;
  onCancel: () => void;
}

export function SaleForm({ onSubmit, onCancel }: SaleFormProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [form, setForm] = useState<SaleCreate>({
    item_id: '',
    customer: '',
    quantity: 1,
    selling_price: 0,
    sold_at: format(new Date(), 'yyyy-MM-dd'),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load all active items once — filter client-side as user types
  const { data: allItems = [] } = useQuery({
    queryKey: ['inventory', 'all-active'],
    queryFn: async () => {
      const page = await inventoryApi.list({ size: 500 });
      return page.items.filter((i) => i.is_active && i.quantity_in_stock > 0);
    },
    staleTime: 60_000,
  });

  const results = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.sku ?? '').toLowerCase().includes(q),
    );
  }, [query, allItems]);

  const handleSelect = (item: Item) => {
    setSelected(item);
    setQuery(item.name);
    setForm((f) => ({ ...f, item_id: item.id, selling_price: item.selling_price ?? item.purchase_price }));
    setShowResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Please select an item'); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ position: 'relative' }}>
        <label className="form-label">Item *</label>
        <input
          className="input" value={query} autoComplete="off"
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="Search item..."
        />
        {showResults && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--input-radius)', marginTop: 4, maxHeight: 220, overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {results.length === 0 ? (
              <p style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {query ? 'No items match your search' : 'No items in stock'}
              </p>
            ) : results.map((item) => (
              <div key={item.id} onMouseDown={() => handleSelect(item)}
                style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div>
                  <p style={{ fontSize: 'var(--text-sm)' }}>{item.name}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.category ?? ''}</p>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '2px 8px', borderRadius: 4 }}>
                  {item.quantity_in_stock} left
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Customer</label>
        <input className="input" value={form.customer ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} placeholder="Optional" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div className="form-group">
          <label className="form-label">Quantity *</label>
          <input type="number" className="input" value={form.quantity} min={1}
            max={selected?.quantity_in_stock ?? undefined}
            onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} required />
          {selected && (
            <p style={{ fontSize: 'var(--text-xs)', color: form.quantity > selected.quantity_in_stock ? 'var(--accent-red)' : 'var(--text-muted)', marginTop: 4 }}>
              {selected.quantity_in_stock} in stock
            </p>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="input" value={form.sold_at ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, sold_at: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <CurrencyInput label="Selling Price (per unit) *" value={form.selling_price}
          onChange={(v) => setForm((f) => ({ ...f, selling_price: v }))} />
        <div className="form-group">
          <CurrencyInput label="Amount Paid" value={form.amount_paid ?? (form.selling_price * form.quantity)}
            onChange={(v) => setForm((f) => ({ ...f, amount_paid: v }))} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
            Balance: ₦{((form.selling_price * form.quantity) - (form.amount_paid ?? (form.selling_price * form.quantity))).toLocaleString()}
          </p>
        </div>
      </div>

      {error && <p className="form-error" style={{ marginBottom: 'var(--space-4)', marginTop: 'var(--space-3)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          Record Sale
        </button>
      </div>
    </form>
  );
}
