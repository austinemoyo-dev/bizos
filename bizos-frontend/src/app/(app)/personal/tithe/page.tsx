'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { titheApi } from '@/lib/api/tithe';
import { PageHeader } from '@/components/shared/PageHeader';
import { TitheCard } from '@/components/business/TitheCard';
import { StatWidget } from '@/components/shared/StatWidget';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatNaira } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { HandCoins } from 'lucide-react';

export default function PersonalTithePage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const { data: unpaidData, isLoading } = useQuery({
    queryKey: ['tithe', 'personal', 'unpaid'],
    queryFn: () => titheApi.list({ scope: 'personal', paid: false }),
  });

  const { data: paidData } = useQuery({
    queryKey: ['tithe', 'personal', 'paid'],
    queryFn: () => titheApi.list({ scope: 'personal', paid: true }),
  });

  const handleMarkPaid = async (id: string) => {
    await titheApi.markPaid(id);
    qc.invalidateQueries({ queryKey: ['tithe'] });
    addToast({ type: 'success', title: 'Tithe marked as paid' });
  };

  const totalDue = (unpaidData?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);
  const totalPaid = (paidData?.items ?? []).reduce((s, t) => s + Number(t.tithe_amount), 0);

  return (
    <div>
      <PageHeader title="Personal Tithe" subtitle="Give first from personal income" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }} className="stat-grid">
        <StatWidget label="Total Due" value={formatNaira(totalDue)} accent="warning" />
        <StatWidget label="Total Paid" value={formatNaira(totalPaid)} accent="profit" />
      </div>

      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>Unpaid Tithe</h2>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2].map((i) => <Skeleton key={i} height={80} />)}
        </div>
      ) : unpaidData?.items.length === 0 ? (
        <EmptyState icon={<HandCoins size={48} />} title="All caught up!" description="No unpaid tithe." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
          {unpaidData?.items.map((tithe) => (
            <TitheCard key={tithe.id} tithe={tithe} onMarkPaid={handleMarkPaid} />
          ))}
        </div>
      )}

      {paidData && paidData.items.length > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>Paid History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {paidData.items.map((tithe) => (
              <TitheCard key={tithe.id} tithe={tithe} onMarkPaid={async () => {}} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
