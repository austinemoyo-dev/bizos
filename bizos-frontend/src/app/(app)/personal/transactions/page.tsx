'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { personalApi } from '@/lib/api/personal';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { TransactionForm } from '@/components/personal/TransactionForm';
import { StatWidget } from '@/components/shared/StatWidget';
import { formatNaira, formatDate, formatProfit } from '@/lib/format';
import { PersonalTransaction, PersonalTransactionCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, ArrowUpCircle, ArrowDownCircle, PiggyBank, Search, Download, Trash2 } from 'lucide-react';
import { exportCsv } from '@/lib/exportCsv';
import { useDebounce } from '@/lib/hooks/useDebounce';

const TYPE_COLORS: Record<string, string> = { income: 'var(--accent-green)', expense: 'var(--accent-red)', savings: 'var(--accent-purple)' };
const TYPE_GLOW: Record<string, string> = { income: 'var(--accent-green-glow)', expense: 'var(--accent-red-glow)', savings: 'var(--accent-purple-glow)' };
const TYPE_ICONS: Record<string, React.ElementType> = { income: ArrowUpCircle, expense: ArrowDownCircle, savings: PiggyBank };
const TYPE_FILTERS = ['all', 'income', 'expense', 'savings'] as const;

export default function TransactionsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const searchParams = useSearchParams();
  useEffect(() => { if (searchParams.get('new') === '1') setShowAdd(true); }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['personal-transactions', typeFilter],
    queryFn: () => personalApi.transactions.list({
      size: 200,
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    }),
  });

  const handleCreate = async (formData: PersonalTransactionCreate) => {
    await personalApi.transactions.create(formData);
    qc.invalidateQueries({ queryKey: ['personal-transactions'] });
    qc.invalidateQueries({ queryKey: ['personal-summary'] });
    addToast({ type: 'success', title: 'Transaction recorded' });
    setShowAdd(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await personalApi.transactions.delete(deleteId);
      qc.invalidateQueries({ queryKey: ['personal-transactions'] });
      qc.invalidateQueries({ queryKey: ['personal-summary'] });
      addToast({ type: 'success', title: 'Transaction deleted' });
      setDeleteId(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete', message: err instanceof Error ? err.message : '' });
    } finally {
      setIsDeleting(false);
    }
  };

  const allItems = data?.items ?? [];

  // Client-side search filter
  const items = useMemo(() => {
    if (!debouncedSearch) return allItems;
    const q = debouncedSearch.toLowerCase();
    return allItems.filter(
      (i) =>
        i.category?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        String(i.amount).includes(q)
    );
  }, [allItems, debouncedSearch]);

  const totalIncome   = items.filter((i) => i.type === 'income').reduce((s, i)  => s + Number(i.amount), 0);
  const totalExpenses = items.filter((i) => i.type === 'expense').reduce((s, i) => s + Number(i.amount), 0);
  const totalSavings  = items.filter((i) => i.type === 'savings').reduce((s, i) => s + Number(i.amount), 0);

  const handleExport = () => {
    if (items.length === 0) return;
    exportCsv('personal-transactions', items.map((i) => ({
      Type: i.type,
      Category: i.category,
      Description: i.description || '',
      Amount: i.amount,
      Date: i.transaction_date,
    })));
    addToast({ type: 'success', title: 'CSV exported' });
  };

  const columns: Column<PersonalTransaction>[] = [
    { key: 'type', label: 'Type', render: (r) => (
      <span style={{ color: TYPE_COLORS[r.type], fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase' }}>
        {r.type}
      </span>
    )},
    { key: 'category', label: 'Category', render: (r) => (
      <span style={{ textTransform: 'capitalize' }}>{r.category?.replace('_', ' ')}</span>
    )},
    { key: 'description', label: 'Description', render: (r) => <span className="muted">{r.description ?? '—'}</span> },
    { key: 'amount', label: 'Amount', numeric: true, render: (r) => {
      const color = TYPE_COLORS[r.type] || 'var(--text-primary)';
      return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color }}>{formatNaira(r.amount)}</span>;
    }},
    { key: 'transaction_date', label: 'Date', render: (r) => <span className="muted">{formatDate(r.transaction_date)}</span> },
    { key: 'id', label: '', render: (r) => (
      <button
        className="btn-icon"
        style={{ width: 28, height: 28, color: 'var(--text-muted)' }}
        onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Transactions"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn-ghost" onClick={handleExport} disabled={items.length === 0} title="Export CSV">
              <Download size={16} />
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }} className="stat-grid">
        <StatWidget label="Income" value={formatNaira(totalIncome)} accent="profit" />
        <StatWidget label="Expenses" value={formatNaira(totalExpenses)} accent="loss" />
        <StatWidget label="Savings" value={formatNaira(totalSavings)} accent="neutral" />
      </div>

      {/* Search + Type Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{
          flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          background: 'var(--glass-bg-light)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)', padding: '0 var(--space-3)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            className="input"
            style={{ border: 'none', background: 'transparent', padding: '10px 0', boxShadow: 'none' }}
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type filter pills */}
        <div style={{
          display: 'inline-flex', gap: 2, padding: 3, borderRadius: 50,
          background: 'var(--glass-bg-light)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
                fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'capitalize',
                background: typeFilter === t ? (t === 'all' ? '#C8102E' : TYPE_COLORS[t] ?? '#C8102E') : 'transparent',
                color: typeFilter === t ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="liquid-card-flush" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyMessage={searchQuery ? 'No matching transactions' : 'No transactions recorded'}
          emptyAction={!searchQuery ? { label: 'Add first transaction', onClick: () => setShowAdd(true) } : undefined}
          keyExtractor={(r) => r.id}
          mobileRender={(r) => {
            const Icon = TYPE_ICONS[r.type] || ArrowDownCircle;
            return (
              <div className="mobile-txn-card">
                <div className="mobile-txn-row">
                  <div className="mobile-txn-icon" style={{ background: TYPE_GLOW[r.type] }}>
                    <Icon size={18} style={{ color: TYPE_COLORS[r.type] }} />
                  </div>
                  <div className="mobile-txn-info">
                    <div className="mobile-txn-primary" style={{ textTransform: 'capitalize' }}>{r.category?.replace('_', ' ')}</div>
                    <div className="mobile-txn-secondary">{r.description || 'No description'}</div>
                  </div>
                  <div className="mobile-txn-amount" style={{ color: TYPE_COLORS[r.type] }}>
                    {r.type === 'expense' ? '-' : '+'}{formatNaira(r.amount)}
                  </div>
                </div>
                <div className="mobile-txn-meta">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(r.transaction_date)}</span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <span className="mobile-txn-chip" style={{ background: TYPE_GLOW[r.type], color: TYPE_COLORS[r.type] }}>
                      {r.type}
                    </span>
                    <button
                      className="btn-icon"
                      style={{ width: 24, height: 24, color: 'var(--text-muted)' }}
                      onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction">
        <TransactionForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Transaction"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleDelete} disabled={isDeleting}
              style={{ background: 'var(--accent-red)' }}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
