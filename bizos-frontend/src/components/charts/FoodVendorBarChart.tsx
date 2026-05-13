'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCompact, formatNaira } from '@/lib/format';

interface FoodVendorBarChartProps {
  data: { label: string; amount: number }[];
}

export function FoodVendorBarChart({ data }: FoodVendorBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2535" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#8B96A8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={{ fill: '#8B96A8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
        <Tooltip
          contentStyle={{ background: '#181C24', border: '1px solid #2A3347', borderRadius: 8 }}
          formatter={(v: number) => [formatNaira(v), 'Amount']}
        />
        <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
