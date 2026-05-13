'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { formatNaira, formatCompact } from '@/lib/format';

interface ProfitLossBarProps {
  data: { label: string; profit: number }[];
  height?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0]?.value ?? 0;
  return (
    <div style={{
      background: '#1A1C21', border: '1px solid #2C3040',
      borderRadius: 12, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: '0.65rem', color: '#4A5568', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: val >= 0 ? '#10B981' : '#EF4444' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: val >= 0 ? '#10B981' : '#EF4444' }}>
          {val >= 0 ? '+' : ''}{formatNaira(val)}
        </span>
      </div>
    </div>
  );
}

export function ProfitLossBar({ data, height = 200 }: ProfitLossBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21242C" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#4A5568', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={{ fill: '#4A5568', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
        <ReferenceLine y={0} stroke="#3E4558" strokeWidth={1.5} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="profit" radius={[6, 6, 2, 2]} maxBarSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.profit >= 0 ? '#10B981' : '#EF4444'}
              fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
