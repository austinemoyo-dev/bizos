'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ExpenseBreakdownItem } from '@/types/api';
import { formatNaira } from '@/lib/format';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

interface ExpensePieChartProps {
  data: ExpenseBreakdownItem[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ExpenseBreakdownItem }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div style={{
      background: '#181C24', border: '1px solid #2A3347',
      borderRadius: 'var(--card-radius)', padding: 'var(--space-3) var(--space-4)',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 4 }}>{item.category}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
        {formatNaira(item.amount)}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function ExpensePieChart({ data }: ExpensePieChartProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data} dataKey="amount" nameKey="category"
            cx="50%" cy="50%" innerRadius={55} outerRadius={85}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center', marginTop: 'var(--space-3)' }}>
        {data.map((item, i) => (
          <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
