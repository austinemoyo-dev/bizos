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
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
        {item.category.replace(/_/g, ' ')}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
        {formatNaira(item.amount)}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function ExpensePieChart({ data }: ExpensePieChartProps) {
  const activeData = data.filter(item => item.amount > 0);
  const total = activeData.reduce((sum, item) => sum + item.amount, 0);

  if (activeData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        No expenses recorded yet
      </div>
    );
  }

  return (
    <div>
      {/* Donut chart with center total */}
      <div style={{ position: 'relative', height: 200 }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={activeData} dataKey="amount" nameKey="category"
              cx="50%" cy="50%" innerRadius={62} outerRadius={88}
              paddingAngle={2} startAngle={90} endAngle={-270}
            >
              {activeData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
            {formatNaira(total)}
          </p>
        </div>
      </div>

      {/* Category breakdown rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'var(--space-3)' }}>
        {activeData.map((item, i) => (
          <div key={item.category}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: COLORS[i % COLORS.length], flexShrink: 0,
                }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {item.category.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                  {item.percentage.toFixed(1)}%
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {formatNaira(item.amount)}
                </span>
              </div>
            </div>
            <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${item.percentage}%`, height: '100%',
                background: COLORS[i % COLORS.length],
                borderRadius: 2,
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
