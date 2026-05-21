'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { titheApi } from '@/lib/api/tithe';
import { PageHeader } from '@/components/shared/PageHeader';
import { TitheCard } from '@/components/business/TitheCard';
import { StatWidget } from '@/components/shared/StatWidget';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatNaira } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { HandCoins, RefreshCw, Loader2 } from 'lucide-react';

type Period = 'this_month' | 'last_month' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'all',        label: 'All Time'   },
];

function getPeriodDates(period: Period): { date_from?: string; date_to?: string } {
  const now = new Date();
  if (period === 'this_month') {
    return {
      date_from: format(startOfMonth(now), 'yyyy-MM-dd'),
      date_to:   format(endOfMonth(now),   'yyyy-MM-dd'),
    };
  }
  if (period === 'last_month') {
    const last = subMonths(now, 1);
    return {
      date_from: format(startOfMonth(last), 'yyyy-MM-dd'),
      date_to:   format(endOfMonth(last),   'yyyy-MM-dd'),
    };
  }
  return {};
}

export default function PersonalTithePage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>('this_month');
  const [generating, setGenerating] = useState(false);

  const dateRange = getPeriodDates(period);

  const { data: unpaidData, isLoading } = useQuery({
    queryKey: ['tithe', 'personal', 'unpaid', period],
    queryFn: () => titheApi.list({ scope: 'personal', paid: false, ...dateRange }),
  });

  const { data: paidData } = useQuery({
    queryKey: ['tithe', 'personal', 'paid', period],
    queryFn: () => titheApi.list({ scope: 'personal', paid: true, ...dateRange }),
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const targetPeriod = period === 'last_month' ? subMonths(now, 1) : now;
      await titheApi.generate(targetPeriod.getFullYear(), targetPeriod.getMonth() + 1, 'personal');
      qc.invalidateQueries({ queryKey: ['tithe'] });
      addToast({ type: 'success', title: 'Personal tithe recalculated' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to generate tithe', message: err instanceof Error ? err.message : '' });
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await titheApi.markPaid(id);
      qc.invalidateQueries({ queryKey: ['tithe'] });
      addToast({ type: 'success', title: 'Tithe marked as paid' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to mark tithe as paid', message: err instanceof Error ? err.message : '' });
    }
  };

  const totalDue  = (unpaidData?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);
  const totalPaid = (paidData?.items  ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);

  return (
    <div>
      <PageHeader
        title="Personal Tithe"
        subtitle="Give first from personal income"
        actions={
          <button className="btn-ghost" onClick={handleGenerate} disabled={generating} style={{ gap: 'var(--space-2)' }}>
            {generating
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <RefreshCw size={14} />
            }
            Recalculate
          </button>
        }
      />

      {/* Period selector */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 'var(--space-5)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 600, flexShrink: 0,
              background: period === p.key ? 'var(--accent-gold)' : 'var(--bg-elevated)',
              color: period === p.key ? '#000' : 'var(--text-secondary)',
              boxShadow: period === p.key ? '0 2px 8px rgba(212,165,53,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Due" value={formatNaira(totalDue)} numericValue={totalDue} numericFormat="currency" accent="warning" />
        <StatWidget label="Paid" value={formatNaira(totalPaid)} numericValue={totalPaid} numericFormat="currency" accent="profit" />
      </div>

      {/* Unpaid */}
      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
        Unpaid
        {period !== 'all' && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontWeight: 400, marginLeft: 8 }}>
            ({PERIODS.find(p => p.key === period)?.label})
          </span>
        )}
      </h2>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2].map(i => <Skeleton key={i} height={80} />)}
        </div>
      ) : unpaidData?.items.length === 0 ? (
        <EmptyState
          icon={<HandCoins size={48} />}
          title="All caught up!"
          description={period === 'all' ? 'No unpaid tithe.' : `No unpaid tithe for ${PERIODS.find(p => p.key === period)?.label?.toLowerCase()}.`}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
          {unpaidData?.items.map(tithe => (
            <TitheCard key={tithe.id} tithe={tithe} onMarkPaid={handleMarkPaid} />
          ))}
        </div>
      )}

      {/* Paid history */}
      {(paidData?.items.length ?? 0) > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
            Paid History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {paidData?.items.map(tithe => (
              <TitheCard key={tithe.id} tithe={tithe} onMarkPaid={async () => {}} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
