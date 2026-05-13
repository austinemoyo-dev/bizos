'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { personalApi } from '@/lib/api/personal';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNaira } from '@/lib/format';
import { MarketItem, MarketItemCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { useUndoDelete } from '@/lib/hooks/useUndoDelete';
import { Plus, Trash2, Check, ShoppingBag, Loader2, Send, X } from 'lucide-react';

export default function MarketListPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const { deleteWithUndo } = useUndoDelete({ label: 'Item removed', delay: 4000 });

  // Quick-add state
  const [quickName, setQuickName] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);
  const [quickLoading, setQuickLoading] = useState(false);

  // Full-form add
  const [showAdd, setShowAdd] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState<MarketItemCreate>({ name: '', quantity: '', estimated_price: 0 });

  // Check-off with actual price
  const [checkingItem, setCheckingItem] = useState<MarketItem | null>(null);
  const [actualPrice, setActualPrice] = useState(0);
  const [checkingLoading, setCheckingLoading] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['market-list'],
    queryFn: () => personalApi.marketList.list(),
  });

  const pending = (items ?? []).filter((i) => !i.purchased);
  const done = (items ?? []).filter((i) => i.purchased);
  const totalEstimate = pending.reduce((s, i) => s + (i.estimated_price ?? 0), 0);
  const totalSpent = done.reduce((s, i) => s + (i.estimated_price ?? 0), 0);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    setQuickLoading(true);
    try {
      await personalApi.marketList.create({ name: quickName.trim(), quantity: '', estimated_price: 0 });
      qc.invalidateQueries({ queryKey: ['market-list'] });
      setQuickName('');
      quickRef.current?.focus();
    } catch {
      addToast({ type: 'error', title: 'Failed to add item' });
    } finally {
      setQuickLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await personalApi.marketList.create(form);
      qc.invalidateQueries({ queryKey: ['market-list'] });
      addToast({ type: 'success', title: 'Item added' });
      setShowAdd(false);
      setForm({ name: '', quantity: '', estimated_price: 0 });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setFormLoading(false);
    }
  };

  const openCheck = (item: MarketItem) => {
    setCheckingItem(item);
    setActualPrice(item.estimated_price ?? 0);
  };

  const handleCheckOff = async () => {
    if (!checkingItem) return;
    setCheckingLoading(true);
    try {
      await personalApi.marketList.toggle(checkingItem.id);
      qc.invalidateQueries({ queryKey: ['market-list'] });
      addToast({ type: 'success', title: `✓ ${checkingItem.name} purchased` });
      setCheckingItem(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setCheckingLoading(false);
    }
  };

  const handleToggle = async (item: MarketItem) => {
    if (!item.purchased) { openCheck(item); return; }
    await personalApi.marketList.toggle(item.id);
    qc.invalidateQueries({ queryKey: ['market-list'] });
  };

  const handleDelete = (id: string) => {
    deleteWithUndo(async () => {
      await personalApi.marketList.delete(id);
      qc.invalidateQueries({ queryKey: ['market-list'] });
    });
  };

  const handleClearPurchased = async () => {
    for (const item of done) {
      await personalApi.marketList.delete(item.id);
    }
    qc.invalidateQueries({ queryKey: ['market-list'] });
    addToast({ type: 'success', title: `${done.length} purchased items cleared` });
  };

  return (
    <div>
      <PageHeader
        title="Market List"
        subtitle={pending.length > 0 ? `${pending.length} item${pending.length !== 1 ? 's' : ''} · Est. ${formatNaira(totalEstimate)}` : 'All done!'}
        actions={
          <button className="btn-ghost" onClick={() => setShowAdd(true)} style={{ gap: 'var(--space-2)' }}>
            <Plus size={15} /> Detailed Add
          </button>
        }
      />

      {/* Summary row */}
      {(items ?? []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[
            { label: 'Still Needed', value: String(pending.length), color: 'var(--text-primary)' },
            { label: 'Est. Remaining', value: formatNaira(totalEstimate), color: 'var(--accent-amber)' },
            { label: 'Purchased', value: String(done.length), color: 'var(--accent-green)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick-add inline */}
      <form onSubmit={handleQuickAdd} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <input
          ref={quickRef}
          className="input"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          placeholder="Quick add — type item name and press Enter…"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" disabled={!quickName.trim() || quickLoading} style={{ gap: 'var(--space-2)', flexShrink: 0 }}>
          {quickLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          Add
        </button>
      </form>

      {isLoading ? null : (items ?? []).length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={48} />}
          title="Market list is empty"
          description="Type above to quickly add items, or use Detailed Add for pricing."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 0 }}>
              <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <p className="section-label" style={{ marginBottom: 0 }}>To Buy ({pending.length})</p>
              </div>
              <div style={{ padding: 'var(--space-2)' }}>
                {pending.map((item) => (
                  <MarketRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{
                padding: 'var(--space-4) var(--space-4) var(--space-2)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <p className="section-label" style={{ marginBottom: 0 }}>Purchased ({done.length})</p>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-red)', gap: 'var(--space-1)' }}
                  onClick={handleClearPurchased}
                >
                  <X size={11} /> Clear All
                </button>
              </div>
              <div style={{ padding: 'var(--space-2)', opacity: 0.65 }}>
                {done.map((item) => (
                  <MarketRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Check-off modal with actual price */}
      <Modal
        isOpen={!!checkingItem}
        onClose={() => setCheckingItem(null)}
        title={`Mark as Purchased — ${checkingItem?.name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCheckingItem(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleCheckOff} disabled={checkingLoading} style={{ gap: 'var(--space-2)' }}>
              {checkingLoading
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Check size={14} />
              }
              Mark Purchased
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Item</p>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{checkingItem?.name}</p>
          {checkingItem?.quantity && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Qty: {checkingItem.quantity}</p>
          )}
        </div>
        <CurrencyInput
          label="Actual Price Paid (optional)"
          value={actualPrice}
          onChange={setActualPrice}
        />
        {checkingItem?.estimated_price && checkingItem.estimated_price > 0 && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            Estimated: {formatNaira(checkingItem.estimated_price)}
            {actualPrice > 0 && actualPrice !== checkingItem.estimated_price && (
              <span style={{ color: actualPrice > checkingItem.estimated_price ? 'var(--accent-red)' : 'var(--accent-green)', marginLeft: 8, fontWeight: 600 }}>
                ({actualPrice > checkingItem.estimated_price ? '+' : ''}{formatNaira(actualPrice - checkingItem.estimated_price)} variance)
              </span>
            )}
          </p>
        )}
      </Modal>

      {/* Detailed add modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Market Item"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" form="market-form" type="submit" disabled={formLoading}>
              {formLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Add Item
            </button>
          </>
        }
      >
        <form id="market-form" onSubmit={handleAdd}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input className="input" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Rice" />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity / Size</label>
            <input className="input" value={form.quantity ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 2 bags, 5kg" />
          </div>
          <CurrencyInput label="Estimated Price" value={form.estimated_price ?? 0}
            onChange={(v) => setForm((f) => ({ ...f, estimated_price: v }))} />
        </form>
      </Modal>
    </div>
  );
}

function MarketRow({ item, onToggle, onDelete }: { item: MarketItem; onToggle: (i: MarketItem) => void; onDelete: (id: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-2)', borderRadius: 'var(--radius-sm)',
      transition: 'background 0.1s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <button
        onClick={() => onToggle(item)}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${item.purchased ? 'var(--accent-green)' : 'var(--border-default)'}`,
          background: item.purchased ? 'var(--accent-green)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        aria-label="Toggle purchased"
      >
        {item.purchased && <Check size={13} style={{ color: '#fff' }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 'var(--text-sm)', fontWeight: 500,
          color: 'var(--text-primary)',
          textDecoration: item.purchased ? 'line-through' : 'none',
        }}>
          {item.name}
        </p>
        {item.quantity && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.quantity}</p>
        )}
      </div>

      {item.estimated_price != null && item.estimated_price > 0 && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
          color: item.purchased ? 'var(--accent-green)' : 'var(--text-secondary)',
          flexShrink: 0,
        }}>
          {formatNaira(item.estimated_price)}
        </span>
      )}

      <button
        className="btn-icon"
        style={{ width: 26, height: 26, flexShrink: 0, opacity: 0.5 }}
        onClick={() => onDelete(item.id)}
        aria-label="Delete"
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.5')}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
