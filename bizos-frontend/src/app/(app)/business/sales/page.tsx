'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/lib/api/sales';
import { PageHeader } from '@/components/shared/PageHeader';
import { useBottomBar } from '@/lib/hooks/useBottomBar';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { SaleForm } from '@/components/business/SaleForm';
import { StatWidget } from '@/components/shared/StatWidget';
import { formatNaira, formatDate, formatProfit } from '@/lib/format';
import { Sale, SaleCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, FileText, Download, Trash, ShoppingCart } from 'lucide-react';
import { IfRole } from '@/components/shared/IfRole';
import { generateSaleReceipt } from '@/lib/pdfReports';
import { exportCsv } from '@/lib/exportCsv';

export default function SalesPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const searchParams = useSearchParams();
  useEffect(() => { if (searchParams.get('new') === '1') setShowAdd(true); }, [searchParams]);

  useBottomBar({ onAdd: () => setShowAdd(true) });

  const handleDelete = async (sale: Sale) => {
    if (!confirm(`Are you sure you want to cancel the sale of ${sale.quantity}x ${sale.item_name}? This will return the items to inventory.`)) return;
    try {
      await salesApi.delete(sale.id);
      if (!navigator.onLine) {
        qc.setQueryData(['sales'], (old: { items: Sale[]; total: number; page: number; size: number; pages: number } | undefined) => ({
          ...(old ?? { total: 0, page: 1, size: 100, pages: 1 }),
          items: (old?.items ?? []).filter((s) => s.id !== sale.id),
          total: Math.max(0, (old?.total ?? 0) - 1),
        }));
      } else {
        qc.invalidateQueries({ queryKey: ['sales'] });
        qc.invalidateQueries({ queryKey: ['business-summary'] });
      }
      addToast({ type: 'success', title: 'Sale cancelled' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to cancel sale', message: err instanceof Error ? err.message : '' });
    }
  };

  const handleSettle = async (sale: Sale) => {
    const total = sale.selling_price * sale.quantity;
    const amountStr = window.prompt(`Update payment for ${sale.item_name}.\nTotal Cost: ${formatNaira(total)}\nCurrent Paid: ${formatNaira(sale.amount_paid)}\nBalance: ${formatNaira(sale.balance)}\n\nEnter new total amount paid:`, String(total));
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      addToast({ type: 'error', title: 'Invalid amount' });
      return;
    }
    try {
      await salesApi.updatePayment(sale.id, amount);
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: 'Payment updated' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update payment', message: err instanceof Error ? err.message : '' });
    }
  };

  const columns: Column<Sale>[] = [
    { key: 'item_name', label: 'Item' },
    { key: 'customer', label: 'Customer', render: (r) => <span className="muted">{r.customer ?? '—'}</span> },
    { key: 'quantity', label: 'Qty', numeric: true },
    { key: 'selling_price', label: 'Selling Price', numeric: true, render: (r) => formatNaira(r.selling_price) },
    { key: 'profit', label: 'Profit', numeric: true, render: (r) => {
      const p = formatProfit(r.profit);
      return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: p.color }}>{p.sign}{p.formatted}</span>;
    }},
    { key: 'balance', label: 'Owing', numeric: true, render: (r) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: r.balance > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
        {r.balance > 0 ? formatNaira(r.balance) : '—'}
      </span>
    )},
    { key: 'sold_at', label: 'Date', render: (r) => <span className="muted">{formatDate(r.sold_at)}</span> },
    {
      key: 'id',
      label: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button
            className="btn-ghost"
            style={{ padding: '3px 8px', fontSize: 'var(--text-xs)', gap: 4, display: 'flex', alignItems: 'center' }}
            onClick={(e) => { e.stopPropagation(); generateSaleReceipt(r); }}
            title="Download receipt"
          >
            <FileText size={12} /> Receipt
          </button>
          {r.balance > 0 && (
            <button
              className="btn-ghost"
              style={{ padding: '3px 8px', fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', fontWeight: 600 }}
              onClick={(e) => { e.stopPropagation(); handleSettle(r); }}
            >
              Update Payment
            </button>
          )}
          <IfRole minRole="owner">
            <button
              className="btn-ghost"
              style={{ padding: '3px 8px', fontSize: 'var(--text-xs)', color: 'var(--accent-red)' }}
              onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
              title="Cancel Order"
            >
              <Trash size={12} />
            </button>
          </IfRole>
        </div>
      ),
    },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.list({ size: 100 }),
  });

  const handleCreate = async (formData: SaleCreate) => {
    const result = await salesApi.create(formData);
    if ((result as any)?._queued) {
      const r = result as any;
      const sale = {
        item_name: '(syncing…)', customer: r.customer, profit: 0, cost_price: 0,
        amount_paid: r.amount_paid ?? 0,
        balance: Number(r.selling_price ?? 0) * Number(r.quantity ?? 0) - Number(r.amount_paid ?? 0),
        sold_at: r.sold_at ?? new Date().toISOString(),
        ...r,
      } as Sale;
      qc.setQueryData(['sales'], (old: { items: Sale[]; total: number; page: number; size: number; pages: number } | undefined) => ({
        ...(old ?? { total: 0, page: 1, size: 100, pages: 1 }),
        items: [sale, ...(old?.items ?? [])],
        total: (old?.total ?? 0) + 1,
      }));
    } else {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
    }
    addToast({ type: 'success', title: 'Sale recorded' });
    setShowAdd(false);
  };

  const items = data?.items ?? [];
  const totalRevenue = items.reduce((s, i) => s + i.selling_price * i.quantity, 0);
  const totalProfit = items.reduce((s, i) => s + i.profit, 0);

  return (
    <div>
      <div className="mobile-header-only">
        <PageHeader
          title="Sales"
          actions={
            <>
              <button className="btn-ghost" onClick={() => exportCsv('sales', items.map(r => ({ item: r.item_name, customer: r.customer ?? '', quantity: r.quantity, selling_price: r.selling_price, cost_price: r.cost_price, profit: r.profit, sold_at: r.sold_at })))} style={{ gap: 'var(--space-2)' }}>
                <Download size={14} /> CSV
              </button>
              <IfRole minRole="staff">
                <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Record Sale</button>
              </IfRole>
            </>
          }
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Transactions" value={String(data?.total ?? 0)} accent="neutral" />
        <StatWidget label="Total Revenue" value={formatNaira(totalRevenue)} accent="neutral" />
        <StatWidget label="Total Profit" value={formatNaira(totalProfit)} accent={totalProfit >= 0 ? 'profit' : 'loss'} />
      </div>

      <div className="liquid-card-flush" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyMessage="No sales recorded"
          emptyAction={{ label: 'Record first sale', onClick: () => setShowAdd(true) }}
          keyExtractor={(r) => r.id}
          mobileRender={(r) => (
            <div className="mobile-txn-card">
              <div className="mobile-txn-row">
                <div className="mobile-txn-icon" style={{ background: 'var(--accent-primary-glow)' }}>
                  <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div className="mobile-txn-info">
                  <div className="mobile-txn-primary">{r.item_name}</div>
                  <div className="mobile-txn-secondary">{r.customer ?? 'Walk-in'} · Qty {r.quantity}</div>
                </div>
                <div className="mobile-txn-amount" style={{ color: 'var(--text-primary)' }}>
                  {formatNaira(r.selling_price * r.quantity)}
                </div>
              </div>
              <div className="mobile-txn-meta">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(r.sold_at)}</span>
                <div className="mobile-txn-actions">
                  {r.balance > 0 && (
                    <span className="mobile-txn-chip" style={{ background: 'var(--accent-red-glow)', color: 'var(--accent-red)' }}>
                      Owes {formatNaira(r.balance)}
                    </span>
                  )}
                  <span className="mobile-txn-chip" style={{
                    background: r.profit >= 0 ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
                    color: r.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>
                    {r.profit >= 0 ? '+' : ''}{formatNaira(r.profit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        />
      </div>

      <div className="bsb-spacer" />

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Sale">
        <SaleForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}
