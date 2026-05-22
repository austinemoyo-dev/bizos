'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { inventoryApi } from '@/lib/api/inventory';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { SlidePanel } from '@/components/shared/SlidePanel';
import { StatWidget } from '@/components/shared/StatWidget';
import { InventoryItemForm } from '@/components/business/InventoryItemForm';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatNaira } from '@/lib/format';
import { Item, ItemCreate, RestockPayload } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Search, AlertTriangle, Loader2, ExternalLink, Download, Upload, Package, Trash2, ChevronDown, PackageX, PackageCheck } from 'lucide-react';
import { useBottomBar } from '@/lib/hooks/useBottomBar';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import { exportCsv } from '@/lib/exportCsv';
import { IfRole } from '@/components/shared/IfRole';

interface GroupedCategory {
  category: string;
  inStock: Item[];
  outOfStock: Item[];
}

function groupByCategory(items: Item[]): GroupedCategory[] {
  const map = new Map<string, { inStock: Item[]; outOfStock: Item[] }>();
  for (const item of items) {
    const cat = item.category || 'Uncategorized';
    if (!map.has(cat)) map.set(cat, { inStock: [], outOfStock: [] });
    const group = map.get(cat)!;
    if (item.quantity_in_stock > 0) group.inStock.push(item);
    else group.outOfStock.push(item);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, data]) => ({ category, ...data }));
}

function ItemCard({ item, onEdit, onRestock, onDelete, onView }: {
  item: Item;
  onEdit: (i: Item) => void;
  onRestock: (i: Item) => void;
  onDelete: (i: Item) => void;
  onView: (i: Item) => void;
}) {
  const isLow = item.quantity_in_stock <= item.reorder_level;
  const isOut = item.quantity_in_stock === 0;

  return (
    <div
      className="mobile-txn-card"
      style={{ cursor: 'pointer' }}
      onClick={() => onView(item)}
    >
      <div className="mobile-txn-row">
        <div className="mobile-txn-icon" style={{
          background: isOut ? 'var(--accent-red-glow)' : isLow ? 'var(--accent-amber-glow)' : 'var(--accent-green-glow)',
        }}>
          {isOut
            ? <PackageX size={18} style={{ color: 'var(--accent-red)' }} />
            : <Package size={18} style={{ color: isLow ? 'var(--accent-amber)' : 'var(--accent-green)' }} />
          }
        </div>
        <div className="mobile-txn-info">
          <div className="mobile-txn-primary">{item.name}</div>
          <div className="mobile-txn-secondary">
            {item.sku ? `${item.sku} · ` : ''}{item.supplier || ''}
          </div>
        </div>
        <div className="mobile-txn-amount" style={{ color: 'var(--text-primary)' }}>
          {formatNaira(item.selling_price ?? item.purchase_price)}
        </div>
      </div>
      <div className="mobile-txn-meta">
        <span className="mobile-txn-chip" style={{
          background: isOut ? 'var(--accent-red-glow)' : isLow ? 'var(--accent-amber-glow)' : 'var(--accent-green-glow)',
          color: isOut ? 'var(--accent-red)' : isLow ? 'var(--accent-amber)' : 'var(--accent-green)',
        }}>
          {isOut ? 'Out of stock' : `${item.quantity_in_stock} in stock`}
          {isLow && !isOut && <AlertTriangle size={9} style={{ marginLeft: 4 }} />}
        </span>
        <div className="mobile-txn-actions" onClick={(e) => e.stopPropagation()}>
          <IfRole minRole="technician">
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
              onClick={() => onRestock(item)}>Restock</button>
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
              onClick={() => onEdit(item)}>Edit</button>
          </IfRole>
          <IfRole minRole="owner">
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '4px 8px', color: 'var(--accent-red)' }}
              onClick={() => onDelete(item)}>
              <Trash2 size={13} />
            </button>
          </IfRole>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ group, collapsed, onToggle, onEdit, onRestock, onDelete, onView }: {
  group: GroupedCategory;
  collapsed: boolean;
  onToggle: () => void;
  onEdit: (i: Item) => void;
  onRestock: (i: Item) => void;
  onDelete: (i: Item) => void;
  onView: (i: Item) => void;
}) {
  const total = group.inStock.length + group.outOfStock.length;

  return (
    <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Category header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-primary-glow)',
          }}>
            <Package size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{group.category}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {total} item{total !== 1 ? 's' : ''}
              {group.outOfStock.length > 0 && (
                <span style={{ color: 'var(--accent-red)', marginLeft: 6 }}>
                  · {group.outOfStock.length} out
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {group.outOfStock.length > 0 && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 50,
              background: 'var(--accent-red-glow)', color: 'var(--accent-red)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {group.outOfStock.length} out
            </span>
          )}
          <ChevronDown size={16} style={{
            color: 'var(--text-muted)',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }} />
        </div>
      </button>

      {/* Collapsible content */}
      {!collapsed && (
        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          {/* In Stock section */}
          {group.inStock.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-1)', marginBottom: 'var(--space-2)',
              }}>
                <PackageCheck size={13} style={{ color: 'var(--accent-green)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  In Stock ({group.inStock.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {group.inStock.map(item => (
                  <ItemCard key={item.id} item={item} onEdit={onEdit} onRestock={onRestock} onDelete={onDelete} onView={onView} />
                ))}
              </div>
            </div>
          )}

          {/* Out of Stock section */}
          {group.outOfStock.length > 0 && (
            <div style={{ marginTop: group.inStock.length > 0 ? 'var(--space-4)' : 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-1)', marginBottom: 'var(--space-2)',
              }}>
                <PackageX size={13} style={{ color: 'var(--accent-red)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Out of Stock ({group.outOfStock.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {group.outOfStock.map(item => (
                  <ItemCard key={item.id} item={item} onEdit={onEdit} onRestock={onRestock} onDelete={onDelete} onView={onView} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const [showAdd, setShowAdd] = useState(false);

  useBottomBar({ placeholder: 'Search items…', onSearch: setSearch, onAdd: () => setShowAdd(true) });
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowAdd(true);
  }, [searchParams]);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [restockItem, setRestockItem] = useState<Item | null>(null);
  const [restockQty, setRestockQty] = useState(0);
  const [restockCost, setRestockCost] = useState(0);
  const [restockDate, setRestockDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [restocking, setRestocking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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
  const totalValue = (data?.items ?? []).reduce((s, i) => s + Number(i.purchase_price) * Number(i.quantity_in_stock), 0);
  const lowCount = lowStockData?.length ?? 0;
  const outOfStockCount = useMemo(() => (data?.items ?? []).filter(i => i.quantity_in_stock === 0).length, [data]);

  const groupedItems = useMemo(() => groupByCategory(items), [items]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

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

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await inventoryApi.delete(deleteItem.id);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      addToast({ type: 'success', title: 'Item deleted', message: `${deleteItem.name} removed from inventory.` });
      setDeleteItem(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = 'name,category,sku,purchase_price,selling_price,quantity_in_stock,reorder_level,supplier\niPhone Screen,Spare Parts,SCR-IP14,15000,22000,10,3,TechParts Ltd\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventory_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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

  const handleViewItem = (item: Item) => router.push(`/business/inventory/${item.id}`);

  return (
    <div>
      {/* Desktop header */}
      <div className="mobile-header-only">
        <PageHeader
          title="Inventory"
          actions={
            <>
              <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
              <button className="btn-ghost" onClick={handleDownloadTemplate} style={{ gap: 'var(--space-2)' }}><Download size={14} /> Template</button>
              <IfRole minRole="technician">
                <button className="btn-ghost" onClick={() => csvInputRef.current?.click()} disabled={importing} style={{ gap: 'var(--space-2)' }}>
                  {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />} Import
                </button>
              </IfRole>
              <button className="btn-ghost" onClick={() => exportCsv('inventory', (data?.items ?? []).map(r => ({ name: r.name, category: r.category, sku: r.sku ?? '', quantity_in_stock: r.quantity_in_stock, reorder_level: r.reorder_level, purchase_price: r.purchase_price, selling_price: r.selling_price ?? '', supplier: r.supplier ?? '' })))} style={{ gap: 'var(--space-2)' }}>
                <Download size={14} /> Export
              </button>
              <IfRole minRole="technician">
                <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Item</button>
              </IfRole>
            </>
          }
        />
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }} className="stat-grid">
        <StatWidget label="Total Items" value={String(totalItems)} numericValue={totalItems} numericFormat="number" accent="neutral" />
        <StatWidget label="Stock Value" value={formatNaira(totalValue)} numericValue={totalValue} numericFormat="currency" accent="neutral" />
        <StatWidget label="Low Stock" value={String(lowCount)} numericValue={lowCount} numericFormat="number" accent={lowCount > 5 ? 'loss' : 'warning'} />
        <StatWidget label="Out of Stock" value={String(outOfStockCount)} numericValue={outOfStockCount} numericFormat="number" accent={outOfStockCount > 0 ? 'loss' : 'profit'} />
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div className="tabs">
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Items</button>
          <button className={`tab ${tab === 'low' ? 'active' : ''}`} onClick={() => setTab('low')}>
            Low Stock {lowCount > 0 && `(${lowCount})`}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="desktop-search" style={{ position: 'relative', marginBottom: 'var(--space-4)', maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." style={{ paddingLeft: 'calc(var(--space-3) + 14px + var(--space-2))' }} />
      </div>

      {/* Grouped inventory */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="liquid-card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 12 }} />
                <div>
                  <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: 80, height: 10 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groupedItems.length === 0 ? (
        <div className="liquid-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <PackageX size={40} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>No inventory items found</p>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add first item
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {groupedItems.map(group => (
            <CategorySection
              key={group.category}
              group={group}
              collapsed={collapsedCategories.has(group.category)}
              onToggle={() => toggleCategory(group.category)}
              onEdit={setEditItem}
              onRestock={setRestockItem}
              onDelete={setDeleteItem}
              onView={handleViewItem}
            />
          ))}
        </div>
      )}

      <div className="bsb-spacer" />

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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title={`Delete — ${deleteItem?.name}`}
        accentColor="#EF4444"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteItem(null)} disabled={deleting}>Cancel</button>
            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Delete Item
            </button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteItem?.name}</strong>? This will hide the item from inventory. Historical records (sales, job parts) are not affected.
        </p>
      </Modal>
    </div>
  );
}
