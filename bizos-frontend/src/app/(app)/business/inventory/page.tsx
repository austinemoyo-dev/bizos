'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { inventoryApi } from '@/lib/api/inventory';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { SlidePanel } from '@/components/shared/SlidePanel';
import { StatWidget } from '@/components/shared/StatWidget';
import { InventoryItemForm } from '@/components/business/InventoryItemForm';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatNaira } from '@/lib/format';
import { Item, ItemCreate, RestockPayload } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Search, AlertTriangle, Loader2, ExternalLink, Download, Upload, Package } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import { exportCsv } from '@/lib/exportCsv';
import { IfRole } from '@/components/shared/IfRole';

const columns: Column<Item>[] = [
  { key: 'name', label: 'Item Name' },
  { key: 'sku', label: 'SKU', render: (r) => <span className="muted">{r.sku ?? '—'}</span> },
  { key: 'category', label: 'Category' },
  {
    key: 'quantity_in_stock',
    label: 'Stock',
    numeric: true,
    render: (r) => (
      <span style={{ color: r.quantity_in_stock <= r.reorder_level ? 'var(--accent-amber)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
        {r.quantity_in_stock}
        {r.quantity_in_stock <= r.reorder_level && <AlertTriangle size={10} style={{ marginLeft: 4 }} />}
      </span>
    ),
  },
  { key: 'reorder_level', label: 'Reorder', numeric: true },
  { key: 'purchase_price', label: 'Purchase', numeric: true, render: (r) => formatNaira(r.purchase_price) },
  { key: 'selling_price', label: 'Selling', numeric: true, render: (r) => r.selling_price ? formatNaira(r.selling_price) : '—' },
];

export default function InventoryPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [restockItem, setRestockItem] = useState<Item | null>(null);
  const [restockQty, setRestockQty] = useState(0);
  const [restockCost, setRestockCost] = useState(0);
  const [restockDate, setRestockDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [restocking, setRestocking] = useState(false);
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', debouncedSearch],
    queryFn: () => inventoryApi.list({ q: debouncedSearch || undefined, size: 100 }),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => inventoryApi.lowStock(),
  });

  const items = tab === 'low' ? (lowStockData ?? []) : (data?.items ?? []);
  const totalItems = data?.total ?? 0;
  const totalValue = (data?.items ?? []).reduce((s, i) => s + i.purchase_price * i.quantity_in_stock, 0);
  const lowCount = lowStockData?.length ?? 0;

  const handleCreate = async (formData: ItemCreate) => {
    await inventoryApi.create(formData);
    qc.invalidateQueries({ queryKey: ['inventory'] });
    addToast({ type: 'success', title: 'Item added' });
    setShowAdd(false);
  };

  const handleEdit = async (formData: ItemCreate) => {
    if (!editItem) return;
    await inventoryApi.update(editItem.id, formData);
    qc.invalidateQueries({ queryKey: ['inventory'] });
    addToast({ type: 'success', title: 'Item updated' });
    setEditItem(null);
  };

  const handleRestock = async () => {
    if (!restockItem) return;
    setRestocking(true);
    try {
      await inventoryApi.restock(restockItem.id, { quantity: restockQty, unit_cost: restockCost, restock_date: restockDate });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: `Restocked ${restockQty} units` });
      setRestockItem(null);
      setRestockQty(0);
      setRestockCost(0);
      setRestockDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (err) {
      addToast({ type: 'error', title: 'Restock failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setRestocking(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = 'name,category,sku,purchase_price,selling_price,quantity_in_stock,reorder_level,supplier\niPhone Screen,Spare Parts,SCR-IP14,15000,22000,10,3,TechParts Ltd\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventory_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await inventoryApi.importCsv(file);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      const msg = result.errors.length
        ? `${result.created} imported, ${result.errors.length} rows had errors`
        : `${result.created} items imported successfully`;
      addToast({ type: result.errors.length ? 'warning' : 'success', title: 'CSV Import', message: msg });
      if (result.errors.length) {
        console.error('CSV import errors:', result.errors);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Import failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        actions={
          <>
            {/* Hidden file input for CSV import */}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportCsv}
            />
            <button className="btn-ghost" onClick={handleDownloadTemplate} style={{ gap: 'var(--space-2)' }} title="Download CSV template">
              <Download size={14} /> Template
            </button>
            <IfRole minRole="technician">
              <button
                className="btn-ghost"
                onClick={() => csvInputRef.current?.click()}
                disabled={importing}
                style={{ gap: 'var(--space-2)' }}
                title="Import items from CSV"
              >
                {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                Import
              </button>
            </IfRole>
            <button
              className="btn-ghost"
              onClick={() => exportCsv('inventory', (data?.items ?? []).map(r => ({
                name: r.name, category: r.category, sku: r.sku ?? '',
                quantity_in_stock: r.quantity_in_stock, reorder_level: r.reorder_level,
                purchase_price: r.purchase_price, selling_price: r.selling_price ?? '',
                supplier: r.supplier ?? '',
              })))}
              style={{ gap: 'var(--space-2)' }}
              title="Export current inventory to CSV"
            >
              <Download size={14} /> Export
            </button>
            <IfRole minRole="technician">
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add Item
              </button>
            </IfRole>
          </>
        }
      />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Items" value={String(totalItems)} accent="neutral" />
        <StatWidget label="Inventory Value" value={formatNaira(totalValue)} accent="neutral" />
        <StatWidget label="Low Stock" value={String(lowCount)} accent={lowCount > 5 ? 'loss' : 'warning'} />
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div className="tabs">
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Items</button>
          <button className={`tab ${tab === 'low' ? 'active' : ''}`} onClick={() => setTab('low')}>
            Low Stock {lowCount > 0 && `(${lowCount})`}
          </button>
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            style={{ paddingLeft: 'calc(var(--space-3) + 14px + var(--space-2))' }}
          />
        </div>
      </div>

      {/* Table with action column */}
      <div className="liquid-card-flush" style={{ padding: 0 }}>
        <DataTable
          columns={[
            ...columns,
            {
              key: 'id',
              label: 'Actions',
              render: (item) => (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }} onClick={(e) => e.stopPropagation()}>
                  <IfRole minRole="technician">
                    <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                      onClick={() => setEditItem(item)}>Edit</button>
                    <button className="btn-primary" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                      onClick={() => setRestockItem(item)}>Restock</button>
                  </IfRole>
                  <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
                    onClick={() => router.push(`/business/inventory/${item.id}`)}>
                    <ExternalLink size={12} />
                  </button>
                </div>
              ),
            },
          ]}
          data={items}
          loading={isLoading}
          emptyMessage="No inventory items found"
          emptyAction={{ label: 'Add first item', onClick: () => setShowAdd(true) }}
          keyExtractor={(r) => r.id}
          mobileRender={(r) => (
            <div className="mobile-txn-card" onClick={() => router.push(`/business/inventory/${r.id}`)}>
              <div className="mobile-txn-row">
                <div className="mobile-txn-icon" style={{ background: r.quantity_in_stock <= r.reorder_level ? 'var(--accent-red-glow)' : 'var(--accent-green-glow)' }}>
                  <Package size={18} style={{ color: r.quantity_in_stock <= r.reorder_level ? 'var(--accent-red)' : 'var(--accent-green)' }} />
                </div>
                <div className="mobile-txn-info">
                  <div className="mobile-txn-primary">{r.name}</div>
                  <div className="mobile-txn-secondary">{r.category}{r.supplier ? ` · ${r.supplier}` : ''}</div>
                </div>
                <div className="mobile-txn-amount" style={{ color: 'var(--text-primary)' }}>
                  {formatNaira(r.selling_price ?? r.purchase_price)}
                </div>
              </div>
              <div className="mobile-txn-meta">
                <span className="mobile-txn-chip" style={{
                  background: r.quantity_in_stock <= r.reorder_level ? 'var(--accent-red-glow)' : 'var(--accent-green-glow)',
                  color: r.quantity_in_stock <= r.reorder_level ? 'var(--accent-red)' : 'var(--accent-green)',
                }}>
                  {r.quantity_in_stock} in stock
                </span>
                <div className="mobile-txn-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                    onClick={() => setRestockItem(r)}>Restock</button>
                  <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                    onClick={() => setEditItem(r)}>Edit</button>
                </div>
              </div>
            </div>
          )}
        />
      </div>

      {/* Mobile FAB — always reachable even when header scrolls out of view */}
      <IfRole minRole="technician">
        <button
          onClick={() => setShowAdd(true)}
          className="mobile-fab"
          aria-label="Add inventory item"
        >
          <Plus size={22} />
        </button>
      </IfRole>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item">
        <InventoryItemForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* Edit Panel */}
      <SlidePanel isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Item">
        {editItem && (
          <InventoryItemForm
            initial={editItem}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
            submitLabel="Save Changes"
          />
        )}
      </SlidePanel>

      {/* Restock Modal */}
      <Modal isOpen={!!restockItem} onClose={() => setRestockItem(null)} title={`Restock — ${restockItem?.name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRestockItem(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleRestock} disabled={restocking || restockQty === 0}>
              {restocking && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Confirm Restock
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Date Restocked *</label>
          <input
            type="date"
            className="input"
            value={restockDate}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setRestockDate(e.target.value)}
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            Sets the expense date for this purchase in the accounts.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity to Add</label>
          <input type="number" className="input" value={restockQty} min={1}
            onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)} />
        </div>
        <CurrencyInput label="Unit Cost Paid" value={restockCost} onChange={setRestockCost} />
      </Modal>
    </div>
  );
}
