'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatCompact, formatNaira } from '@/lib/format';

interface ProfitBarChartProps {
  data: { label: string; profit: number }[];
}

export function ProfitBarChart({ data }: ProfitBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2535" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#8B96A8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={{ fill: '#8B96A8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
        <Tooltip
          contentStyle={{ background: '#181C24', border: '1px solid #2A3347', borderRadius: 8 }}
          labelStyle={{ color: 'var(--text-secondary)', fontSize: 11 }}
          formatter={(v: number) => [formatNaira(v), 'Profit']}
        />
        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.profit >= 0 ? '#10B981' : '#EF4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
