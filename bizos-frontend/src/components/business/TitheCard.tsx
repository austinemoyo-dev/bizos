'use client';

import { Tithe } from '@/types/api';
import { formatNaira, formatDate } from '@/lib/format';
import { HandCoins, Loader2, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface TitheCardProps {
  tithe: Tithe;
  onMarkPaid: (id: string) => Promise<void>;
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

  return (
    <div className="liquid-card" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 14,
          background: tithe.paid ? 'var(--accent-green-glow)' : 'var(--accent-amber-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {tithe.paid
            ? <CheckCircle size={18} style={{ color: 'var(--accent-green)' }} />
            : <HandCoins size={18} style={{ color: 'var(--accent-amber)' }} />
          }
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatNaira(Number(tithe.tithe_amount))}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {tithe.source ?? 'Business Tithe'} • {formatDate(tithe.paid ? tithe.paid_at ?? tithe.created_at : tithe.created_at)}
          </p>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {!tithe.paid ? (
          <button className="btn-primary" style={{ fontSize: 'var(--text-xs)' }} onClick={handlePay} disabled={loading}>
            {loading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            Mark Paid
          </button>
        ) : (
          <span className="mobile-txn-chip" style={{
            background: 'var(--accent-green-glow)',
            color: 'var(--accent-green)',
            padding: '4px 12px',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
          }}>
            ✓ Paid
          </span>
        )}
      </div>
    </div>
  );
}
