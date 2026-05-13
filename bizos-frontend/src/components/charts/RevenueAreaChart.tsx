'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { RevenueTrendPoint } from '@/types/api';
import { formatCompact, formatNaira } from '@/lib/format';
import { format, parseISO } from 'date-fns';

const CHART_THEME = {
  gridColor: '#1F2535',
  axisColor: '#4A5568',
  labelColor: '#8B96A8',
  tooltipBg: '#181C24',
  tooltipBorder: '#2A3347',
};

interface RevenueAreaChartProps {
  data: RevenueTrendPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: CHART_THEME.tooltipBg,
      border: `1px solid ${CHART_THEME.tooltipBorder}`,
      borderRadius: 'var(--card-radius)', padding: 'var(--space-3) var(--space-4)',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
          color: item.name === 'revenue' ? 'var(--accent-primary)' : 'var(--accent-red)',
        }}>
          {item.name === 'revenue' ? 'Revenue' : 'Expenses'}: {formatNaira(item.value)}
        </p>
      ))}
    </div>
  );
}

export function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: (() => { try { return format(parseISO(d.date), 'MMM d'); } catch { return d.date; } })(),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_THEME.labelColor, fontSize: 11 }}
          axisLine={{ stroke: CHART_THEME.gridColor }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fill: CHART_THEME.labelColor, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone" dataKey="revenue" name="revenue"
          stroke="#3B82F6" strokeWidth={2}
          fill="url(#revenueGrad)"
        />
        <Area
          type="monotone" dataKey="expenses" name="expenses"
          stroke="#EF4444" strokeWidth={2}
          fill="url(#expenseGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
