'use client';

import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api/inventory';
import { Item, AddPartPayload } from '@/types/api';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatNaira } from '@/lib/format';

interface AddPartFormProps {
  onSubmit: (data: AddPartPayload) => Promise<void>;
  onCancel: () => void;
}

export function AddPartForm({ onSubmit, onCancel }: AddPartFormProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [chargePrice, setChargePrice] = useState(0);
  const [damaged, setDamaged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); return; }
    inventoryApi.search(debouncedQuery).then(setResults).catch(() => {});
  }, [debouncedQuery]);

  const handleSelect = (item: Item) => {
    setSelected(item);
    setQuery(item.name);
    setPurchaseCost(item.purchase_price);
    setChargePrice(item.selling_price ?? item.purchase_price);
    setShowResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Please select an item'); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        item_id: selected.id,
        quantity,
        unit_cost: purchaseCost,
        selling_price: chargePrice,
        damaged,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add part');
    } finally {
      setLoading(false);
    }
  };

  const margin = selected && chargePrice > 0 && purchaseCost > 0
    ? ((chargePrice - purchaseCost) / purchaseCost) * 100
    : null;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ position: 'relative' }}>
        <label className="form-label">Search Item *</label>
        <input
          className="input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setShowResults(true); }}
          placeholder="Type to search inventory..."
          autoComplete="off"
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
        />
        {showResults && results.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--input-radius)', marginTop: 4, maxHeight: 220, overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {results.map((item) => (
              <div
                key={item.id}
                onMouseDown={() => handleSelect(item)}
                style={{
                  padding: 'var(--space-3) var(--space-4)', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{item.name}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Stock: {item.quantity_in_stock}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-red)' }}>
                      Cost {formatNaira(item.purchase_price)}
                    </p>
                    {item.selling_price && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>
                        Sell {formatNaira(item.selling_price)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Quantity *</label>
        <input
          type="number" className="input" value={quantity} min={1}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <CurrencyInput label="Your Cost (Purchase Price)" value={purchaseCost} onChange={setPurchaseCost} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>What you paid</p>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <CurrencyInput label="Charge to Customer" value={chargePrice} onChange={setChargePrice} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            {margin != null ? (
              <span style={{ color: margin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                {margin >= 0 ? '+' : ''}{margin.toFixed(0)}% margin
              </span>
            ) : 'Selling price'}
          </p>
        </div>
      </div>

      {selected && quantity > 0 && chargePrice > 0 && (
        <div style={{
          margin: 'var(--space-3) 0',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-overlay)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}>
          Adds <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', fontWeight: 600 }}>
            {formatNaira(chargePrice * quantity)}
          </span> to customer charge
          {' · '}cost <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-red)' }}>
            {formatNaira(purchaseCost * quantity)}
          </span>
        </div>
      )}

      <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
          <input
            type="checkbox" checked={damaged}
            onChange={(e) => setDamaged(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent-amber)' }}
          />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Mark as Damaged</span>
        </label>
        {damaged && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'var(--accent-amber-glow)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--input-radius)', padding: 'var(--space-3) var(--space-4)', marginTop: 'var(--space-2)',
          }}>
            <AlertTriangle size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)' }}>
              This will create a damage loss expense and stock movement.
            </p>
          </div>
        )}
      </div>

      {error && <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading || !selected}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          Add Part
        </button>
      </div>
    </form>
  );
}
