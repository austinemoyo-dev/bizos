'use client';
import { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { FoodTrendPoint, VendorSpendingSummary } from '@/lib/api/food-vendor';
import { formatNaira, formatCompact } from '@/lib/format';
import { format } from 'date-fns';

const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

const VENDOR_COLORS = ['#F59E0B', '#C8102E', '#8B5CF6', '#06B6D4', '#10B981', '#EC4899'];

const TooltipStyle = { background: '#181C24', border: '1px solid #2A3347', borderRadius: 10, padding: '8px 12px' };

function SpendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TooltipStyle}>
      <p style={{ fontSize: '0.65rem', color: '#4A5568', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#F59E0B', fontWeight: 700 }}>{formatNaira(payload[0]?.value ?? 0)}</p>
      {payload[0]?.payload?.count > 0 && <p style={{ fontSize: '0.65rem', color: '#4A5568' }}>{payload[0].payload.count} meals</p>}
    </div>
  );
}

interface Props {
  trend: FoodTrendPoint[];
  vendors: VendorSpendingSummary[];
  loading: boolean;
}

export function FoodVendorAnalyticsTab({ trend, vendors, loading }: Props) {
  const chartData = useMemo(() => trend.map((t) => ({
    label: format(new Date(t.date + 'T00:00:00'), 'dd MMM'),
    amount: toNum(t.total),
    count: t.count,
  })), [trend]);

  const vendorData = vendors.map((v) => ({
    name: v.vendor_name.length > 14 ? v.vendor_name.slice(0, 12) + '…' : v.vendor_name,
    fullName: v.vendor_name,
    spent: toNum(v.total_spent),
    meals: v.total_meals,
    owed: toNum(v.unpaid_amount),
  }));

  // Day-of-week breakdown
  const dow = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const map: Record<string, number> = {};
    days.forEach((d) => (map[d] = 0));
    trend.forEach((t) => {
      const d = days[new Date(t.date + 'T00:00:00').getDay()];
      map[d] = (map[d] ?? 0) + toNum(t.total);
    });
    return days.map((d) => ({ day: d, amount: map[d] }));
  }, [trend]);

  const maxDow = Math.max(...dow.map((d) => d.amount), 1);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {[200, 160, 180].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* 30-day Spending Trend */}
      <div className="liquid-card" style={{ padding: 'var(--space-5)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 2 }}>30-Day Spending Trend</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Daily food credit amounts</p>
          {chartData.some((d) => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21242C" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#4A5568', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tickFormatter={formatCompact} tick={{ fill: '#4A5568', fontSize: 9 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<SpendTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={2} fill="url(#fvGrad)" dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No data for the last 30 days
            </div>
          )}
        </div>
      </div>

      {/* Vendor Spending Breakdown */}
      {vendorData.length > 0 && (
        <div className="liquid-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 2 }}>Spending by Vendor</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Total spent per food vendor</p>
            <ResponsiveContainer width="100%" height={Math.max(vendorData.length * 44, 120)}>
              <BarChart data={vendorData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                <XAxis type="number" tickFormatter={formatCompact} tick={{ fill: '#4A5568', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#8B96A8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={TooltipStyle}
                  formatter={(v: number, _: any, props: any) => [
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatNaira(v)}</span>,
                    props.payload?.fullName ?? 'Spent',
                  ]}
                />
                <Bar dataKey="spent" radius={[0, 4, 4, 0]}>
                  {vendorData.map((_, i) => <Cell key={i} fill={VENDOR_COLORS[i % VENDOR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Day-of-Week Pattern */}
      <div className="liquid-card" style={{ padding: 'var(--space-5)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 2 }}>Spending by Day of Week</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Which days you spend the most</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {dow.map((d) => {
              const h = maxDow > 0 ? Math.max((d.amount / maxDow) * 72, d.amount > 0 ? 8 : 2) : 2;
              const isTop = d.amount === maxDow && maxDow > 0;
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0', background: isTop ? '#F59E0B' : 'rgba(245,158,11,0.3)', transition: 'height 0.4s' }} />
                  <span style={{ fontSize: '0.6rem', color: isTop ? '#F59E0B' : 'var(--text-muted)', fontWeight: isTop ? 700 : 400 }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
