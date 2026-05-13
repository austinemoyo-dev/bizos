'use client';

import { formatNaira, formatDate } from '@/lib/format';
import { Sale } from '@/types/api';
import { ShoppingCart, ChevronRight } from 'lucide-react';

interface SaleCardProps {
  sale: Sale;
  onClick?: (sale: Sale) => void;
  showBorder?: boolean;
}

export function SaleCard({ sale, onClick, showBorder = true }: SaleCardProps) {
  return (
    <div
      onClick={() => onClick?.(sale)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: showBorder ? '1px solid var(--border-subtle)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 14, flexShrink: 0,
        background: 'var(--accent-primary-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent-primary)',
      }}>
        <ShoppingCart size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sale.item_name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {sale.customer ?? 'Walk-in'} · Qty {sale.quantity}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {formatNaira(sale.selling_price * sale.quantity)}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: sale.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 2 }}>
          {sale.profit >= 0 ? '+' : ''}{formatNaira(sale.profit)}
        </p>
      </div>
    </div>
  );
}
