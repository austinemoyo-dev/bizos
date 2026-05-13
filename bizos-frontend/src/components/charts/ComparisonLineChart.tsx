'use client';

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { formatNaira, formatCompact } from '@/lib/format';

export interface ComparisonPoint {
  label: string;
  current: number;
  previous: number;
}

interface ComparisonLineChartProps {
  data: ComparisonPoint[];
  currentLabel: string;
  previousLabel: string;
  dataKey?: 'revenue' | 'profit' | 'expenses';
  height?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p: any) => p.dataKey === 'current');
  const prev = payload.find((p: any) => p.dataKey === 'previous');
  const diff = cur && prev ? cur.value - prev.value : 0;
  const pct = prev?.value ? ((diff / prev.value) * 100).toFixed(1) : null;

  return (
    <div style={{
      background: '#1A1C21', border: '1px solid #2C3040',
      borderRadius: 12, padding: '10px 14px', minWidth: 160,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: '0.65rem', color: '#4A5568', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      {cur && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: '#C8102E', fontWeight: 600 }}>{cur.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#ECEEF2' }}>{formatNaira(cur.value)}</span>
        </div>
      )}
      {prev && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: '#4A5568', fontWeight: 600 }}>{prev.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#8B96A8' }}>{formatNaira(prev.value)}</span>
        </div>
      )}
      {pct && (
        <div style={{
          marginTop: 8, paddingTop: 8, borderTop: '1px solid #21242C',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#4A5568' }}>Change</span>
          <span style={{
            fontSize: 'var(--text-xs)', fontWeight: 700,
            color: diff >= 0 ? '#10B981' : '#EF4444',
          }}>
            {diff >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(pct))}%
          </span>
        </div>
      )}
    </div>
  );
}

export function ComparisonLineChart({
  data, currentLabel, previousLabel, height = 220,
}: ComparisonLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21242C" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#4A5568', fontSize: 10 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fill: '#4A5568', fontSize: 10 }}
          axisLine={false} tickLine={false} width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone" dataKey="previous" name={previousLabel}
          stroke="#3E4558" strokeWidth={1.5} strokeDasharray="5 3"
          dot={false} activeDot={{ r: 4, fill: '#3E4558' }}
        />
        <Line
          type="monotone" dataKey="current" name={currentLabel}
          stroke="#C8102E" strokeWidth={2.5}
          dot={false} activeDot={{ r: 5, fill: '#C8102E', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
