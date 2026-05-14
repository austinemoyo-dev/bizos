'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api/inventory';
import { Modal } from '@/components/shared/Modal';
import { SlidePanel } from '@/components/shared/SlidePanel';
import { InventoryItemForm } from '@/components/business/InventoryItemForm';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatNaira, formatDate } from '@/lib/format';
import { Item, ItemCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import {
  ArrowLeft, AlertTriangle, Package, Loader2,
  Pencil, RefreshCw, TrendingUp, TrendingDown,
} from 'lucide-react';

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockQty, setRestockQty] = useState(1);
  const [restockCost, setRestockCost] = useState(0);
  const [restockDate, setRestockDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [restocking, setRestocking] = useState(false);

  const { data: item, isLoading } = useQuery<Item>({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryApi.get(id),
    enabled: !!id,
  });

  const handleEdit = async (data: ItemCreate) => {
    if (!item) return;
    await inventoryApi.update(item.id, data);
    qc.invalidateQueries({ queryKey: ['inventory-item', id] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
    addToast({ type: 'success', title: 'Item updated' });
    setEditOpen(false);
  };

  const handleRestock = async () => {
    if (!item || restockQty < 1) return;
    setRestocking(true);
    try {
      await inventoryApi.restock(item.id, { quantity: restockQty, unit_cost: restockCost, restock_date: restockDate });
      qc.invalidateQueries({ queryKey: ['inventory-item', id] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      addToast({ type: 'success', title: `Restocked ×${restockQty} units`, message: restockCost > 0 ? `₦${(restockQty * restockCost).toLocaleString()} expense recorded automatically` : undefined });
      setRestockOpen(false);
      setRestockQty(1);
      setRestockCost(0);
      setRestockDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (err) {
      addToast({ type: 'error', title: 'Restock failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setRestocking(false);
    }
  };

  if (isLoading) return <InventoryDetailSkeleton />;
  if (!item) return (
    <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
      Item not found.
      <button className="btn-ghost" style={{ display: 'block', margin: 'var(--space-4) auto' }} onClick={() => router.back()}>
        Go back
      </button>
    </div>
  );

  const isLowStock = item.quantity_in_stock <= item.reorder_level;
  const stockValue = item.purchase_price * item.quantity_in_stock;
  const margin = item.selling_price
    ? ((item.selling_price - item.purchase_price) / item.purchase_price) * 100
    : null;

  return (
    <>
      {/* Back + Header */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <button
          className="btn-ghost"
          onClick={() => router.back()}
          style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}
        >
          <ArrowLeft size={14} /> Back to Inventory
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>{item.name}</h1>
              {isLowStock && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
                  background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)',
                  fontSize: 'var(--text-xs)', fontWeight: 600,
                  padding: '2px var(--space-2)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}>
                  <AlertTriangle size={11} /> Low Stock
                </span>
              )}
              {!item.is_active && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
                  background: 'var(--bg-overlay)', color: 'var(--text-muted)',
                  fontSize: 'var(--text-xs)', fontWeight: 600,
                  padding: '2px var(--space-2)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                }}>
                  Inactive
                </span>
              )}
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {item.category}{item.sku ? ` · ${item.sku}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn-ghost" onClick={() => setEditOpen(true)} style={{ gap: 'var(--space-2)' }}>
              <Pencil size={14} /> Edit
            </button>
            <button className="btn-primary" onClick={() => setRestockOpen(true)} style={{ gap: 'var(--space-2)' }}>
              <RefreshCw size={14} /> Restock
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        {[
          {
            label: 'In Stock',
            value: String(item.quantity_in_stock),
            sub: `Reorder at ${item.reorder_level}`,
            color: isLowStock ? 'var(--accent-amber)' : 'var(--text-primary)',
            icon: <Package size={18} />,
          },
          {
            label: 'Stock Value',
            value: formatNaira(stockValue),
            sub: `${item.quantity_in_stock} × ${formatNaira(item.purchase_price)}`,
            color: 'var(--text-primary)',
            icon: <TrendingUp size={18} />,
          },
          {
            label: 'Purchase Price',
            value: formatNaira(item.purchase_price),
            sub: 'Cost per unit',
            color: 'var(--accent-red)',
            icon: <TrendingDown size={18} />,
          },
          {
            label: 'Selling Price',
            value: item.selling_price ? formatNaira(item.selling_price) : '—',
            sub: margin != null ? `${margin.toFixed(1)}% margin` : 'Not set',
            color: 'var(--accent-green)',
            icon: <TrendingUp size={18} />,
          },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </p>
              <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{icon}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color, marginBottom: 4 }}>
              {value}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-5)', alignItems: 'start' }}>

        {/* Left — Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Item details */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Item Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4) var(--space-8)' }}>
              {[
                { label: 'Name', value: item.name },
                { label: 'Category', value: item.category },
                { label: 'SKU / Barcode', value: item.sku ?? '—' },
                { label: 'Supplier', value: item.supplier ?? '—' },
                { label: 'Purchase Price', value: formatNaira(item.purchase_price), mono: true },
                { label: 'Selling Price', value: item.selling_price ? formatNaira(item.selling_price) : '—', mono: true },
                { label: 'Quantity in Stock', value: String(item.quantity_in_stock), mono: true },
                { label: 'Reorder Level', value: String(item.reorder_level), mono: true },
                { label: 'Status', value: item.is_active ? 'Active' : 'Inactive' },
                { label: 'Added', value: formatDate(item.created_at) },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
                  <p style={{
                    fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
                    fontFamily: mono ? 'var(--font-mono)' : undefined, fontWeight: 500,
                  }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing analysis */}
          {item.selling_price && (
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <p className="section-label">Pricing Analysis</p>
              {[
                { label: 'Purchase Price', value: formatNaira(item.purchase_price), color: 'var(--text-secondary)' },
                { label: 'Selling Price', value: formatNaira(item.selling_price), color: 'var(--text-primary)' },
                { label: 'Gross Margin per Unit', value: formatNaira(item.selling_price - item.purchase_price), color: 'var(--accent-green)' },
                { label: 'Margin %', value: `${margin?.toFixed(1)}%`, color: margin! >= 20 ? 'var(--accent-green)' : 'var(--accent-amber)' },
                { label: 'Total Potential Revenue', value: formatNaira(item.selling_price * item.quantity_in_stock), color: 'var(--text-primary)' },
                { label: 'Total Potential Profit', value: formatNaira((item.selling_price - item.purchase_price) * item.quantity_in_stock), color: 'var(--accent-green)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Stock health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Stock level visual */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Stock Level</p>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                <span>0</span>
                <span>{item.quantity_in_stock} / max visible</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (item.quantity_in_stock / Math.max(item.reorder_level * 3, item.quantity_in_stock)) * 100)}%`,
                  background: isLowStock ? 'var(--accent-amber)' : 'var(--accent-green)',
                  borderRadius: 4, transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                <span style={{ color: isLowStock ? 'var(--accent-amber)' : 'var(--accent-green)', fontWeight: 600 }}>
                  {item.quantity_in_stock} in stock
                </span>
                <span style={{ color: 'var(--text-muted)' }}>Reorder: {item.reorder_level}</span>
              </div>
            </div>

            {isLowStock && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)',
                marginTop: 'var(--space-3)',
              }}>
                <AlertTriangle size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', lineHeight: 1.5 }}>
                  Stock is at or below reorder level ({item.reorder_level}). Consider restocking soon.
                </p>
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}
              onClick={() => setRestockOpen(true)}
            >
              <RefreshCw size={14} /> Restock Now
            </button>
          </div>

          {/* Quick info */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Quick Info</p>
            {[
              { label: 'Total Stock Value', value: formatNaira(stockValue), mono: true },
              { label: 'Last Updated', value: formatDate(item.updated_at) },
              { label: 'Date Added', value: formatDate(item.created_at) },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit panel */}
      <SlidePanel isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Item">
        {editOpen && (
          <InventoryItemForm
            initial={item}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save Changes"
          />
        )}
      </SlidePanel>

      {/* Restock modal */}
      <Modal
        isOpen={restockOpen}
        onClose={() => setRestockOpen(false)}
        title={`Restock — ${item.name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRestockOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleRestock} disabled={restocking || restockQty < 1}>
              {restocking && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Confirm Restock
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Current stock</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {item.quantity_in_stock} units
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Date Restocked *</label>
          <input
            type="date"
            className="input"
            value={restockDate}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setRestockDate(e.target.value)}
            required
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            Sets the expense date for this purchase in the accounts.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity to Add *</label>
          <input
            type="number" className="input" value={restockQty} min={1}
            onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
          />
          {restockQty > 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              New stock will be {item.quantity_in_stock + restockQty} units
            </p>
          )}
        </div>
        <CurrencyInput label="Unit Cost Paid" value={restockCost} onChange={setRestockCost} />
        {restockQty > 0 && restockCost > 0 && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
            Total spend: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-red)' }}>
              {formatNaira(restockQty * restockCost)}
            </span> (will be recorded as an Inventory expense)
          </p>
        )}
      </Modal>
    </>
  );
}

function InventoryDetailSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Skeleton width={140} height={28} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
          <Skeleton width={220} height={36} />
          <Skeleton width={180} height={36} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        {[1,2,3,4].map((i) => <Skeleton key={i} width="100%" height={100} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Skeleton width="100%" height={280} />
          <Skeleton width="100%" height={180} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Skeleton width="100%" height={220} />
          <Skeleton width="100%" height={120} />
        </div>
      </div>
    </div>
  );
}
