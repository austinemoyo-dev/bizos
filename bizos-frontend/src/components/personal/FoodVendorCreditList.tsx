'use client';

import { useState, useMemo } from 'react';
import { FoodCredit, MealType } from '@/types/api';
import { formatNaira, formatDate } from '@/lib/format';
import { Pencil, Trash2, Download, Search, X, Filter, Utensils } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿',
};

const MEAL_TYPE_OPTIONS: { key: MealType | 'all'; label: string }[] = [
  { key: 'all',       label: 'All types'  },
  { key: 'breakfast', label: '🌅 Breakfast' },
  { key: 'lunch',     label: '☀️ Lunch'     },
  { key: 'dinner',    label: '🌙 Dinner'    },
  { key: 'snack',     label: '🍿 Snack'     },
];

interface Props {
  allCredits: FoodCredit[];
  allVendorNames: string[];
  onEdit: (credit: FoodCredit) => void;
  onDelete: (id: string) => void;
}

export function FoodVendorCreditList({ allCredits, allVendorNames, onEdit, onDelete }: Props) {
  const [search,     setSearch]     = useState('');
  const [vendor,     setVendor]     = useState('all');
  const [paidFilter, setPaidFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [mealType,   setMealType]   = useState<MealType | 'all'>('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allCredits
      .filter((c) => {
        if (q && !c.vendor_name.toLowerCase().includes(q) && !(c.meal_description ?? '').toLowerCase().includes(q)) return false;
        if (vendor !== 'all' && c.vendor_name !== vendor) return false;
        if (paidFilter === 'paid'   && !c.paid) return false;
        if (paidFilter === 'unpaid' && c.paid)  return false;
        if (mealType !== 'all' && c.meal_type !== mealType) return false;
        if (dateFrom && c.purchase_date < dateFrom) return false;
        if (dateTo   && c.purchase_date > dateTo)   return false;
        return true;
      })
      .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
  }, [allCredits, search, vendor, paidFilter, mealType, dateFrom, dateTo]);

  const totalAmount = filtered.reduce((s, c) => s + Number(c.amount), 0);

  const hasActiveFilter =
    vendor !== 'all' || paidFilter !== 'all' || mealType !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setVendor('all'); setPaidFilter('all'); setMealType('all');
    setDateFrom(''); setDateTo('');
  };

  const handleExport = () => {
    const rows = [
      ['Date', 'Vendor', 'Meal', 'Type', 'Amount', 'Status'],
      ...filtered.map((c) => [
        c.purchase_date,
        c.vendor_name,
        c.meal_description ?? '',
        c.meal_type ?? '',
        Number(c.amount).toFixed(2),
        c.paid ? 'Paid' : 'Unpaid',
      ]),
    ];
    const csv  = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `food-credits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Search + controls row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Search vendor or meal…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="btn-ghost"
          style={{ gap: 6, position: 'relative', color: hasActiveFilter ? '#F59E0B' : undefined, borderColor: hasActiveFilter ? 'rgba(245,158,11,0.4)' : undefined }}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={14} /> Filters
          {hasActiveFilter && (
            <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
          )}
        </button>
        <button className="btn-ghost" style={{ gap: 6 }} onClick={handleExport} title="Export CSV">
          <Download size={14} />
        </button>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="liquid-card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Vendor</label>
              <select className="input" value={vendor} onChange={(e) => setVendor(e.target.value)}>
                <option value="all">All vendors</option>
                {allVendorNames.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select className="input" value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Meal Type</label>
              <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value as any)}>
                {MEAL_TYPE_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          {hasActiveFilter && (
            <button className="btn-ghost" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', gap: 4, color: 'var(--accent-red)' }} onClick={clearFilters}>
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: '#F59E0B', fontWeight: 700 }}>
          {formatNaira(totalAmount)}
        </span>
      </div>

      {/* Credit rows */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Utensils size={36} />} title="No records found" description="Try adjusting your search or filters." />
      ) : (
        <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((credit, i) => (
            <div
              key={credit.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--glass-border)' : 'none',
              }}
            >
              {/* Meal type icon */}
              <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: credit.paid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                {credit.meal_type ? MEAL_EMOJI[credit.meal_type] : <Utensils size={14} style={{ color: credit.paid ? '#10B981' : '#F59E0B' }} />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {credit.meal_description ?? 'Meal'}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {credit.vendor_name} · {formatDate(credit.purchase_date)}
                </p>
              </div>

              {/* Amount + status */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: credit.paid ? 'var(--accent-green)' : '#F59E0B' }}>
                  {formatNaira(Number(credit.amount))}
                </p>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: credit.paid ? 'var(--accent-green)' : '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {credit.paid ? '✓ Paid' : 'Unpaid'}
                </p>
              </div>

              {/* Actions — only on unpaid */}
              {!credit.paid && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn-ghost" style={{ padding: 4 }} onClick={() => onEdit(credit)} title="Edit">
                    <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button className="btn-ghost" style={{ padding: 4 }} onClick={() => onDelete(credit.id)} title="Delete">
                    <Trash2 size={12} style={{ color: 'var(--accent-red)' }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
