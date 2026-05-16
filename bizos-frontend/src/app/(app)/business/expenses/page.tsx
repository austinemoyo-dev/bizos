'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from 'date-fns';
import { expensesApi } from '@/lib/api/expenses';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { StatWidget } from '@/components/shared/StatWidget';
import { formatNaira, formatDate } from '@/lib/format';
import { Expense, ExpenseCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Loader2, Download, Receipt, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { IfRole } from '@/components/shared/IfRole';
import { exportCsv } from '@/lib/exportCsv';

const CATEGORIES = [
  { value: '',              label: 'All' },
  { value: 'inventory',    label: 'Inventory' },
  { value: 'damage_loss',  label: 'Damage Loss' },
  { value: 'rent',         label: 'Rent' },
  { value: 'utilities',    label: 'Utilities' },
  { value: 'salary',       label: 'Salary' },
  { value: 'transport',    label: 'Transport' },
  { value: 'marketing',    label: 'Marketing' },
  { value: 'equipment',    label: 'Equipment' },
  { value: 'tithe',        label: 'Tithe' },
  { value: 'maintenance',  label: 'Maintenance' },
  { value: 'loan_repayment', label: 'Loan Repayment' },
  { value: 'miscellaneous', label: 'Other' },
];

type DatePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'this_week',   label: 'This Week' },
  { key: 'last_week',   label: 'Last Week' },
  { key: 'this_month',  label: 'This Month' },
  { key: 'last_month',  label: 'Last Month' },
  { key: 'custom',      label: 'Custom' },
];

function getPresetDates(preset: DatePreset, customFrom: string, customTo: string) {
  const now = new Date();
  switch (preset) {
    case 'this_week':
      return { date_from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), date_to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'last_week': {
      const s = subWeeks(now, 1);
      return { date_from: format(startOfWeek(s, { weekStartsOn: 1 }), 'yyyy-MM-dd'), date_to: format(endOfWeek(s, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    }
    case 'this_month':
      return { date_from: format(startOfMonth(now), 'yyyy-MM-dd'), date_to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'last_month': {
      const s = subMonths(now, 1);
      return { date_from: format(startOfMonth(s), 'yyyy-MM-dd'), date_to: format(endOfMonth(s), 'yyyy-MM-dd') };
    }
    case 'custom':
      return { date_from: customFrom || undefined, date_to: customTo || undefined };
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  inventory: '#3B82F6', damage_loss: '#EF4444', rent: '#8B5CF6',
  utilities: '#06B6D4', salary: '#F59E0B', transport: '#10B981',
  marketing: '#EC4899', equipment: '#84CC16', tithe: '#D4A535',
  maintenance: '#6B7280', loan_repayment: '#F97316', miscellaneous: '#94A3B8',
};

export default function ExpensesPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<ExpenseCreate>({
    category: 'miscellaneous',
    amount: 0,
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const dateRange = getPresetDates(datePreset, customFrom, customTo);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', activeCategory, datePreset, customFrom, customTo],
    queryFn: () => expensesApi.list({
      size: 200,
      category: activeCategory || undefined,
      ...dateRange,
    }),
  });

  const items = data?.items ?? [];
  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const item of items) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return Object.entries(map).sort((a, b) => {
      const sumA = a[1].reduce((s, i) => s + Number(i.amount), 0);
      const sumB = b[1].reduce((s, i) => s + Number(i.amount), 0);
      return sumB - sumA;
    });
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await expensesApi.create(form);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: 'Expense recorded' });
      setShowAdd(false);
      setForm({ category: 'miscellaneous', amount: 0, description: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await expensesApi.delete(id);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: 'Expense deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete', message: err instanceof Error ? err.message : '' });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleGroup = (cat: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat.replace('_', ' ');

  return (
    <div>
      <PageHeader
        title="Expenses"
        actions={
          <>
            <button
              className="btn-ghost"
              onClick={() => exportCsv('expenses', items.map((r) => ({
                category: r.category, description: r.description ?? '',
                amount: r.amount, date: r.expense_date,
              })))}
              style={{ gap: 'var(--space-2)' }}
            >
              <Download size={14} /> CSV
            </button>
            <IfRole minRole="accountant">
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add Expense
              </button>
            </IfRole>
          </>
        }
      />

      {/* Date preset pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 'var(--space-3)' }}>
        {DATE_PRESETS.map((p) => (
          <button key={p.key} onClick={() => setDatePreset(p.key)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
            fontSize: 'var(--text-xs)', fontWeight: 600,
            background: datePreset === p.key ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: datePreset === p.key ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {datePreset === 'custom' && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">From</label>
            <input type="date" className="input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">To</label>
            <input type="date" className="input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 'var(--space-5)' }}>
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setActiveCategory(c.value)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
            fontSize: 'var(--text-xs)', fontWeight: 600,
            background: activeCategory === c.value ? (CATEGORY_COLORS[c.value] ?? 'var(--accent-primary)') : 'var(--bg-elevated)',
            color: activeCategory === c.value ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Expenses" value={formatNaira(total)} accent="loss" />
        <StatWidget label="Transactions" value={String(items.length)} accent="neutral" />
        <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Group by Category</span>
          <button
            onClick={() => setGroupByCategory((v) => !v)}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: groupByCategory ? 'var(--accent-primary)' : 'var(--bg-overlay)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: groupByCategory ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%', background: 'white',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>
      </div>

      {/* Grouped view */}
      {groupByCategory ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {grouped.length === 0 && !isLoading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
              No expenses found for this period.
            </div>
          )}
          {grouped.map(([cat, catItems]) => {
            const catTotal = catItems.reduce((s, i) => s + Number(i.amount), 0);
            const pct = total > 0 ? (catTotal / total) * 100 : 0;
            const color = CATEGORY_COLORS[cat] ?? 'var(--accent-primary)';
            const collapsed = collapsedGroups.has(cat);
            return (
              <div key={cat} className="card" style={{ overflow: 'hidden' }}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(cat)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-4) var(--space-5)', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {categoryLabel(cat)}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {catItems.length} {catItems.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color }}>
                      {formatNaira(catTotal)}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {/* Progress bar */}
                <div style={{ height: 3, background: 'var(--bg-overlay)', marginBottom: collapsed ? 0 : 0 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
                </div>

                {/* Rows */}
                {!collapsed && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {catItems.map((item) => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 'var(--space-3) var(--space-5)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        <div>
                          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                            {item.description || <span style={{ color: 'var(--text-muted)' }}>No description</span>}
                          </p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                            {formatDate(item.expense_date)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--accent-red)' }}>
                            −{formatNaira(Number(item.amount))}
                          </span>
                          <IfRole minRole="accountant">
                            <button
                              className="btn-ghost"
                              style={{ padding: 4, color: 'var(--accent-red)' }}
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id
                                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </IfRole>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat list */
        <div className="liquid-card-flush" style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No expenses found for this period.
            </div>
          ) : (
            items.map((r, idx) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                {/* Mobile-style card */}
                <div className="mobile-txn-row" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'var(--accent-red-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Receipt size={16} style={{ color: 'var(--accent-red)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{
                        fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'capitalize',
                        color: CATEGORY_COLORS[r.category] ?? 'var(--accent-primary)',
                        background: `${CATEGORY_COLORS[r.category] ?? 'var(--accent-primary)'}18`,
                        padding: '1px 6px', borderRadius: 4,
                      }}>
                        {categoryLabel(r.category)}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.description || <span style={{ color: 'var(--text-muted)' }}>No description</span>}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{formatDate(r.expense_date)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-red)' }}>
                    −{formatNaira(Number(r.amount))}
                  </span>
                  <IfRole minRole="accountant">
                    <button
                      className="btn-ghost"
                      style={{ padding: 4, color: 'var(--accent-red)' }}
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </IfRole>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Expense"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" form="expense-form" type="submit" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Save
            </button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="input" value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.filter((c) => c.value !== '').map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <CurrencyInput label="Amount *" value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="input" value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="input" value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional note" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
