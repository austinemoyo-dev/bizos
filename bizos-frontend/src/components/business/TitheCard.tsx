'use client';

import { Tithe } from '@/types/api';
import { formatNaira } from '@/lib/format';
import { HandCoins, Loader2, CheckCircle, Calendar } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';

interface TitheCardProps {
  tithe: Tithe;
  onMarkPaid: (id: string) => Promise<void>;
}

function formatTitheDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function getTithePeriod(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'MMMM yyyy');
  } catch {
    return '';
  }
}

export function TitheCard({ tithe, onMarkPaid }: TitheCardProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      await onMarkPaid(tithe.id);
    } finally {
      setLoading(false);
    }
  };

  // The source date is the repair completion date (when tithe was generated)
  const sourceDate = tithe.created_at;
  const paidDate   = tithe.paid_at;
  const period     = getTithePeriod(sourceDate);

  return (
    <div className="liquid-card" style={{
      padding: 'var(--space-4) var(--space-5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>

        {/* Left: icon + details */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: tithe.paid ? 'var(--accent-green-glow)' : 'var(--accent-amber-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {tithe.paid
              ? <CheckCircle size={18} style={{ color: 'var(--accent-green)' }} />
              : <HandCoins size={18} style={{ color: 'var(--accent-amber)' }} />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Amount */}
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)',
              fontWeight: 700, color: 'var(--text-primary)',
            }}>
              {formatNaira(Number(tithe.tithe_amount))}
            </p>

            {/* Source */}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {tithe.source ?? 'Business Tithe'}
            </p>

            {/* Period: when the income was earned */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              <Calendar size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 700 }}>For:</span> {period}
                {' '}
                <span style={{ color: 'var(--border-strong)' }}>•</span>
                {' '}
                Earned {formatTitheDate(sourceDate)}
              </p>
            </div>

            {/* Paid date (if paid) */}
            {tithe.paid && paidDate && (
              <p style={{ fontSize: '0.6rem', color: 'var(--accent-green)', marginTop: 3, fontWeight: 600 }}>
                ✓ Paid on {formatTitheDate(paidDate)}
              </p>
            )}
          </div>
        </div>

        {/* Right: action */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          {!tithe.paid ? (
            <button
              className="btn-primary"
              style={{ fontSize: 'var(--text-xs)', padding: '6px 14px' }}
              onClick={handlePay}
              disabled={loading}
            >
              {loading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
              Mark Paid
            </button>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--accent-green-glow)',
              color: 'var(--accent-green)',
              padding: '4px 12px', borderRadius: 20,
              fontSize: 'var(--text-xs)', fontWeight: 700,
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              ✓ Paid
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
