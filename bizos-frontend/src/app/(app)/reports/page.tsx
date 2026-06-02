'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { inventoryApi } from '@/lib/api/inventory';
import { useUIStore } from '@/lib/stores/uiStore';
import { generateProfitLossPDF, generateInventoryPDF } from '@/lib/pdfReports';
import { requestNotificationPermission, notify } from '@/lib/notifications';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import {
  FileText, Package, BarChart3, Download, Loader2,
  Bell, BellOff, CheckCircle,
} from 'lucide-react';

type PeriodPreset = 'this_month' | 'this_year' | 'custom';

export default function ReportsPage() {
  const { addToast } = useUIStore();
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission);
    else setNotifPermission('unsupported');
  }, []);

  const periodRange = (() => {
    const now = new Date();
    if (preset === 'this_month') return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd'), label: format(now, 'MMMM yyyy') };
    if (preset === 'this_year') return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd'), label: `Year ${format(now, 'yyyy')}` };
    return { start: customStart || format(startOfMonth(now), 'yyyy-MM-dd'), end: customEnd || format(endOfMonth(now), 'yyyy-MM-dd'), label: `${customStart} to ${customEnd}` };
  })();

  const { data: summary } = useQuery({
    queryKey: ['summary', periodRange.start, periodRange.end],
    queryFn: () => analyticsApi.businessSummary({ period_start: periodRange.start, period_end: periodRange.end }),
  });
  const { data: expenseBreakdown } = useQuery({
    queryKey: ['expense-breakdown', periodRange.start, periodRange.end],
    queryFn: () => analyticsApi.expenseBreakdown({ period_start: periodRange.start, period_end: periodRange.end }),
  });
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-all'],
    queryFn: () => inventoryApi.list({ size: 500 }),
  });

  const handleNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      addToast({ type: 'success', title: 'Notifications enabled' });
      notify('✅ Notifications Active', 'You\'ll get alerts for low stock, tithe due, and more.');
    } else {
      addToast({ type: 'warning', title: 'Notifications blocked', message: 'Enable in browser settings.' });
    }
  };

  const handlePLReport = async () => {
    if (!summary) { addToast({ type: 'warning', title: 'Loading data…' }); return; }
    setLoadingReport('pl');
    try {
      await generateProfitLossPDF({
        period: periodRange.label,
        revenue: summary.total_revenue,
        expenses: summary.total_expenses,
        profit: summary.net_profit,
        tithe: summary.tithe_due,
        available: summary.available_balance,
        expenseBreakdown: expenseBreakdown ?? [],
      });
      addToast({ type: 'success', title: 'P&L Report downloaded' });
    } catch (err) {
      addToast({ type: 'error', title: 'PDF failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoadingReport(null);
    }
  };

  const handleInventoryReport = async () => {
    if (!inventoryData?.items.length) { addToast({ type: 'warning', title: 'Loading data…' }); return; }
    setLoadingReport('inventory');
    try {
      await generateInventoryPDF(inventoryData.items);
      addToast({ type: 'success', title: 'Inventory Report downloaded' });
    } catch (err) {
      addToast({ type: 'error', title: 'PDF failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoadingReport(null);
    }
  };

  const handleJSONReport = async (type: string, fetchFn: () => Promise<unknown>) => {
    setLoadingReport(type);
    try {
      const data = await fetchFn();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `dash-${type}-${periodRange.start}.json`; a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: `${type} report downloaded` });
    } catch (err) {
      addToast({ type: 'error', title: 'Download failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoadingReport(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">One-click PDF and data exports</p>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-5)', border: '1px solid var(--border-subtle)' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          Report Period
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: preset === 'custom' ? 'var(--space-3)' : 0 }}>
          {(['this_month', 'this_year', 'custom'] as PeriodPreset[]).map(p => (
            <button key={p} onClick={() => setPreset(p)} style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'capitalize',
              background: preset === p ? '#C8102E' : 'var(--bg-elevated)',
              color: preset === p ? '#fff' : 'var(--text-secondary)',
              boxShadow: preset === p ? '0 2px 8px rgba(200,16,46,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>
              {p === 'this_month' ? 'This Month' : p === 'this_year' ? 'This Year' : 'Custom'}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">From</label>
              <input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ fontSize: 'var(--text-xs)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">To</label>
              <input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ fontSize: 'var(--text-xs)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Summary banner */}
      {summary && (
        <div style={{
          background: 'linear-gradient(135deg, #8B0018, #C8102E)',
          borderRadius: 16, padding: 'var(--space-4) var(--space-5)',
          marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap',
        }}>
          {[
            ['Revenue', summary.total_revenue],
            ['Expenses', summary.total_expenses],
            ['Net Profit', summary.net_profit],
            ['Available', summary.available_balance],
          ].map(([label, val]) => (
            <div key={String(label)}>
              <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#fff', fontWeight: 700 }}>
                ₦{safeNum(val).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>

        {/* P&L PDF */}
        <ReportCard
          icon={<FileText size={20} />}
          color="#C8102E"
          title="Profit & Loss Report"
          description="Beautifully formatted PDF with revenue, expenses, profit breakdown — ready for your accountant."
          badge="PDF"
          loading={loadingReport === 'pl'}
          onDownload={handlePLReport}
          buttonLabel="Download PDF"
        />

        {/* Inventory PDF */}
        <ReportCard
          icon={<Package size={20} />}
          color="#C07800"
          title="Inventory Report"
          description="Full stock list with quantities, prices, values, and low-stock status — landscape PDF."
          badge="PDF"
          loading={loadingReport === 'inventory'}
          onDownload={handleInventoryReport}
          buttonLabel="Download PDF"
        />

        {/* Repairs JSON */}
        <ReportCard
          icon={<BarChart3 size={20} />}
          color="#067A52"
          title="Repair Jobs Data"
          description="All repair jobs with status, charges, and profitability for the selected period."
          badge="JSON"
          loading={loadingReport === 'repairs'}
          onDownload={() => handleJSONReport('repairs', () => import('@/lib/api/repairs').then(m => m.repairsApi.list({ size: 1000 })))}
          buttonLabel="Export JSON"
        />

        {/* Personal Finance JSON */}
        <ReportCard
          icon={<BarChart3 size={20} />}
          color="#6B3FA0"
          title="Personal Finance"
          description="Personal income, expenses, and savings summary for year-end review."
          badge="JSON"
          loading={loadingReport === 'personal'}
          onDownload={() => handleJSONReport('personal', () => analyticsApi.personalSummary({ period_start: periodRange.start, period_end: periodRange.end }))}
          buttonLabel="Export JSON"
        />
      </div>

      {/* Push Notifications */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 'var(--space-5)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: notifPermission === 'granted' ? 'rgba(6,122,82,0.1)' : 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: notifPermission === 'granted' ? '#067A52' : 'var(--text-secondary)',
            }}>
              {notifPermission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Push Notifications</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                Get alerts for low stock, tithe due, and job updates
              </p>
              {notifPermission === 'granted' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <CheckCircle size={11} style={{ color: '#067A52' }} />
                  <span style={{ fontSize: '0.6rem', color: '#067A52', fontWeight: 600 }}>Notifications active</span>
                </div>
              )}
              {notifPermission === 'denied' && (
                <p style={{ fontSize: '0.6rem', color: 'var(--accent-red)', marginTop: 4 }}>
                  Blocked — enable in browser settings
                </p>
              )}
            </div>
          </div>

          {notifPermission !== 'granted' && notifPermission !== 'denied' && notifPermission !== 'unsupported' && (
            <button className="btn-primary" onClick={handleNotifications} style={{ fontSize: 'var(--text-xs)' }}>
              <Bell size={13} /> Enable Notifications
            </button>
          )}
        </div>

        {notifPermission === 'granted' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
            {[
              { label: 'Low Stock Alert', action: () => notify('⚠️ Low Stock', 'Test: 3 items need restocking') },
              { label: 'Tithe Reminder', action: () => notify('🙏 Tithe Due', 'Test: ₦5,000 tithe waiting') },
              { label: 'Job Assigned', action: () => notify('🔧 New Job', 'Test: Job #047 — Samsung S21') },
            ].map(({ label, action }) => (
              <button key={label} className="btn-ghost" onClick={action}
                style={{ fontSize: '0.65rem', padding: '5px 12px' }}>
                Test: {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function safeNum(v: unknown): number {
  const x = Number(v);
  return isFinite(x) ? x : 0;
}

function ReportCard({ icon, color, title, description, badge, loading, onDownload, buttonLabel }: {
  icon: React.ReactNode; color: string; title: string; description: string;
  badge: string; loading: boolean; onDownload: () => void; buttonLabel: string;
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em',
          padding: '3px 7px', borderRadius: 6,
          background: badge === 'PDF' ? 'rgba(200,16,46,0.1)' : 'rgba(6,122,82,0.1)',
          color: badge === 'PDF' ? '#C8102E' : '#067A52',
          border: `1px solid ${badge === 'PDF' ? 'rgba(200,16,46,0.2)' : 'rgba(6,122,82,0.2)'}`,
        }}>
          {badge}
        </span>
      </div>
      <div>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</p>
      </div>
      <button className="btn-ghost" onClick={onDownload} disabled={loading}
        style={{ marginTop: 'auto', fontSize: 'var(--text-xs)', justifyContent: 'center' }}>
        {loading
          ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
          : <><Download size={13} /> {buttonLabel}</>
        }
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
