'use client';

import { useState } from 'react';
import { SlidePanel } from '@/components/shared/SlidePanel';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { FoodCredit, FoodVendorPayment, MealType } from '@/types/api';
import { formatNaira, formatDate } from '@/lib/format';
import { format } from 'date-fns';
import {
  Utensils, CreditCard, AlertTriangle, Check, ShieldAlert,
  CheckCircle,
} from 'lucide-react';

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿',
};

const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

interface Props {
  isOpen: boolean;
  vendorName: string;
  credits: FoodCredit[];
  payments: FoodVendorPayment[];
  limit: number;
  onSetLimit: (limit: number) => void;
  onClose: () => void;
  onPayVendor: (vendorName: string, creditIds: string[]) => void;
}

export function FoodVendorVendorPanel({
  isOpen, vendorName, credits, payments, limit, onSetLimit, onClose, onPayVendor,
}: Props) {
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput,   setLimitInput]   = useState(limit);

  const vendorCredits  = credits.filter((c) => c.vendor_name === vendorName);
  const vendorPayments = payments.filter((p) => p.vendor_name === vendorName);
  const unpaidCredits  = vendorCredits.filter((c) => !c.paid);
  const paidCredits    = vendorCredits.filter((c) => c.paid);

  const totalSpent     = vendorCredits.reduce((s, c) => s + toNum(c.amount), 0);
  const totalOwed      = unpaidCredits.reduce((s, c) => s + toNum(c.amount), 0);
  const totalPaid      = paidCredits.reduce((s, c) => s + toNum(c.amount), 0);

  const overLimit  = limit > 0 && totalOwed >= limit;
  const nearLimit  = limit > 0 && !overLimit && totalOwed >= limit * 0.8;

  const handleSaveLimit = () => {
    onSetLimit(limitInput);
    setEditingLimit(false);
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title={vendorName} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
          {[
            { label: 'Total Spent', value: formatNaira(totalSpent), color: 'var(--text-primary)' },
            { label: 'Currently Owed', value: formatNaira(totalOwed), color: '#F59E0B' },
            { label: 'Total Paid', value: formatNaira(totalPaid), color: 'var(--accent-green)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-overlay)', borderRadius: 12, padding: 'var(--space-3)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Pay vendor button */}
        {unpaidCredits.length > 0 && (
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            onClick={() => { onPayVendor(vendorName, unpaidCredits.map((c) => c.id)); onClose(); }}
          >
            <Check size={14} /> Pay {formatNaira(totalOwed)} to {vendorName}
          </button>
        )}

        {/* Credit limit */}
        <div style={{ background: 'var(--bg-overlay)', borderRadius: 14, padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={14} style={{ color: overLimit ? '#EF4444' : nearLimit ? '#F59E0B' : 'var(--text-muted)' }} />
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Credit Limit</p>
            </div>
            <button
              className="btn-ghost"
              style={{ fontSize: 'var(--text-xs)', padding: '3px 8px' }}
              onClick={() => { setLimitInput(limit); setEditingLimit((v) => !v); }}
            >
              {editingLimit ? 'Cancel' : limit > 0 ? 'Edit' : 'Set Limit'}
            </button>
          </div>

          {editingLimit ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <CurrencyInput value={limitInput} onChange={setLimitInput} placeholder="Max credit allowed" />
              </div>
              <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 'var(--text-xs)' }} onClick={handleSaveLimit}>
                Save
              </button>
            </div>
          ) : limit > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 6 }}>
                <span style={{ color: overLimit ? '#EF4444' : '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {formatNaira(totalOwed)} owed
                </span>
                <span style={{ color: 'var(--text-muted)' }}>limit {formatNaira(limit)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border-default)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${Math.min((totalOwed / limit) * 100, 100)}%`,
                  background: overLimit ? '#EF4444' : nearLimit ? '#F59E0B' : '#10B981',
                  transition: 'width 0.4s',
                }} />
              </div>
              {overLimit && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                  <AlertTriangle size={11} style={{ color: '#EF4444' }} />
                  <p style={{ fontSize: '0.65rem', color: '#EF4444', fontWeight: 600 }}>
                    Over limit by {formatNaira(totalOwed - limit)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              No limit set. Add one to get warned when you owe too much to this vendor.
            </p>
          )}
        </div>

        {/* Unpaid credits */}
        {unpaidCredits.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: 'var(--space-3)' }}>Unpaid ({unpaidCredits.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {unpaidCredits.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)).map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'rgba(245,158,11,0.06)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
                  <span style={{ fontSize: 16 }}>{c.meal_type ? MEAL_EMOJI[c.meal_type] : '🍽️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.meal_description ?? 'Meal'}
                    </p>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{formatDate(c.purchase_date)}</p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
                    {formatNaira(toNum(c.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment history for this vendor */}
        {vendorPayments.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: 'var(--space-3)' }}>Payment History</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {vendorPayments.sort((a, b) => b.paid_at.localeCompare(a.paid_at)).map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)' }}>
                  <CheckCircle size={14} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Payment</p>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                      {format(new Date(p.paid_at), 'dd MMM yyyy · h:mm a')}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-green)', flexShrink: 0 }}>
                    {formatNaira(toNum(p.amount_paid))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paid credit history */}
        {paidCredits.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: 'var(--space-3)' }}>All Meals ({vendorCredits.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {vendorCredits.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)).map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 10 }}>
                  <span style={{ fontSize: 14 }}>{c.meal_type ? MEAL_EMOJI[c.meal_type] : '🍽️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.meal_description ?? 'Meal'}
                    </p>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{formatDate(c.purchase_date)}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: c.paid ? 'var(--text-muted)' : '#F59E0B' }}>
                      {formatNaira(toNum(c.amount))}
                    </p>
                    {c.paid && <p style={{ fontSize: '0.55rem', color: 'var(--accent-green)' }}>✓ paid</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SlidePanel>
  );
}
