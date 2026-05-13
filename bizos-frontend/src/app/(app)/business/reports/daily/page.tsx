'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { repairsApi } from '@/lib/api/repairs';
import { salesApi } from '@/lib/api/sales';
import { settingsApi } from '@/lib/api/settings';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatNaira, formatCompact } from '@/lib/format';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { RepairJobCard } from '@/components/business/RepairJobCard';
import { SaleCard } from '@/components/business/SaleCard';

export default function DailyReportPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  const { data: profile } = useQuery({
    queryKey: ['businessProfile'],
    queryFn: () => settingsApi.getBusinessProfile(),
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['business-summary', today, today],
    queryFn: () => analyticsApi.businessSummary({ period_start: today, period_end: today }),
  });

  const { data: repairsData, isLoading: loadingRepairs } = useQuery({
    queryKey: ['repairs', { date: today }],
    queryFn: () => repairsApi.list({ date_from: today, date_to: today + 'T23:59:59', size: 100 }),
  });

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['sales', { date: today }],
    queryFn: () => salesApi.list({ date_from: today, date_to: today + 'T23:59:59', size: 100 }),
  });

  const todaysRepairs = repairsData?.items ?? [];
  const todaysSales = salesData?.items ?? [];

  const isLoading = loadingSummary || loadingRepairs || loadingSales;

  return (
    <div>
      <div className="print-hide">
        <PageHeader
          title="Daily Report"
          subtitle={`End of day summary for ${displayDate}`}
          actions={
            <button className="btn-primary" onClick={() => window.print()} style={{ gap: 'var(--space-2)' }}>
              <Printer size={15} /> Print Report
            </button>
          }
        />
      </div>

      <div className="print-only-show" style={{ display: 'none', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profile?.name || 'Business Daily Report'}</h1>
        <p style={{ color: '#666' }}>{profile?.address}</p>
        <p style={{ color: '#666' }}>{profile?.phone} | {profile?.email}</p>
        <div style={{ height: 1, background: '#ddd', margin: '16px 0' }} />
        <h2>End of Day Summary: {displayDate}</h2>
      </div>

      {isLoading ? (
        <Skeleton width="100%" height={400} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="card" style={{ padding: 'var(--space-4)', background: 'rgba(200,16,46,0.05)', border: '1px solid rgba(200,16,46,0.2)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue</p>
              <p style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--accent-primary)', marginTop: 4 }}>
                {summary ? formatNaira(summary.total_revenue) : '₦0.00'}
              </p>
            </div>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Net Profit</p>
              <p style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {summary ? formatNaira(summary.net_profit) : '₦0.00'}
              </p>
            </div>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Expenses</p>
              <p style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {summary ? formatNaira(summary.total_expenses) : '₦0.00'}
              </p>
            </div>
          </div>

          {/* Todays Sales */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
              Sales Today ({todaysSales.length})
            </h3>
            {todaysSales.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>No sales recorded today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {todaysSales.map((sale, i) => (
                  <SaleCard key={sale.id} sale={sale} showBorder={i < todaysSales.length - 1} onClick={() => {}} />
                ))}
              </div>
            )}
          </div>

          {/* Todays Repairs */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
              Repair Jobs Logged Today ({todaysRepairs.length})
            </h3>
            {todaysRepairs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>No repair jobs recorded today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {todaysRepairs.map((job, i) => (
                  <RepairJobCard key={job.id} job={job} showBorder={i < todaysRepairs.length - 1} onClick={() => {}} />
                ))}
              </div>
            )}
          </div>
          
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print-hide { display: none !important; }
          .print-only-show { display: block !important; }
          .card { border: 1px solid #ccc !important; box-shadow: none !important; break-inside: avoid; }
          body { background: white !important; }
        }
      `}} />
    </div>
  );
}
