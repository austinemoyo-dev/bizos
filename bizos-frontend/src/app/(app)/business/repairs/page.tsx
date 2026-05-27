'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { repairsApi } from '@/lib/api/repairs';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { JobDetailPanel } from '@/components/business/JobDetailPanel';
import { RepairJobForm } from '@/components/business/RepairJobForm';
import { formatNaira, formatDate } from '@/lib/format';
import { RepairJob, RepairJobCreate, RepairStatus } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Search, ExternalLink, Download, Upload, Loader2, Trash, Wrench, Calendar } from 'lucide-react';
import { useBottomBar } from '@/lib/hooks/useBottomBar';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from 'date-fns';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import { exportCsv } from '@/lib/exportCsv';
import { IfRole } from '@/components/shared/IfRole';

const STATUS_TABS = [
  { label: 'All', value: 'received,diagnosed,in_progress,completed,delivered' },
  { label: 'Received', value: 'received' },
  { label: 'Diagnosed', value: 'diagnosed' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

type DatePreset = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all',         label: 'All Time' },
  { key: 'this_week',   label: 'This Week' },
  { key: 'last_week',   label: 'Last Week' },
  { key: 'this_month',  label: 'This Month' },
  { key: 'last_month',  label: 'Last Month' },
  { key: 'custom',      label: 'Custom' },
];

function getRepairDateRange(preset: DatePreset, customFrom: string, customTo: string) {
  const now = new Date();
  switch (preset) {
    case 'all': return {};
    case 'this_week':
      return { date_from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), date_to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'last_week': {
      const s = subWeeks(now, 1);
      return { date_from: format(startOfWeek(s, { weekStartsOn: 1 }), 'yyyy-MM-dd'), date_to: format(endOfWeek(s, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    }
    case 'this_month':
      return { date_from: format(startOfMonth(now), 'yyyy-MM-dd'), date_to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'last_month': {
      const s = subMonths(now, 1);
      return { date_from: format(startOfMonth(s), 'yyyy-MM-dd'), date_to: format(endOfMonth(s), 'yyyy-MM-dd') };
    }
    case 'custom':
      return { date_from: customFrom || undefined, date_to: customTo || undefined };
  }
}

export default function RepairsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('received,diagnosed,in_progress,completed,delivered');
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showNewJob, setShowNewJob] = useState(false);

  useBottomBar({
    placeholder: 'Search customer, device…',
    onSearch: setSearch,
    onAdd: () => setShowNewJob(true),
  });
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowNewJob(true);
    const jobId = searchParams.get('job');
    if (jobId) setSelectedJobId(jobId);
  }, [searchParams]);
  const [importing, setImporting] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);
  const dateRange = getRepairDateRange(datePreset, customFrom, customTo);

  // Cancel confirmation modal state
  const [cancelTarget, setCancelTarget] = useState<RepairJob | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [depositResolution, setDepositResolution] = useState<'refunded' | 'kept' | null>(null);

  const handleQuickCancel = (job: RepairJob) => {
    setCancelReason('');
    setDepositResolution(null);
    setCancelTarget(job);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const hasDeposit = Number(cancelTarget.amount_paid) > 0;
    if (hasDeposit && !depositResolution) {
      addToast({ type: 'error', title: 'Select what happened to the deposit' });
      return;
    }
    setCancelling(true);
    try {
      await repairsApi.cancelJob(cancelTarget.id, { cancel_reason: cancelReason || undefined });
      if (hasDeposit && depositResolution) {
        await repairsApi.resolveDeposit(cancelTarget.id, depositResolution);
      }
      qc.invalidateQueries({ queryKey: ['repairs'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: 'Job cancelled', message: 'Parts returned to inventory' });
      setCancelTarget(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to cancel', message: err instanceof Error ? err.message : '' });
    } finally {
      setCancelling(false);
    }
  };

  const columns: Column<RepairJob>[] = [
    { key: 'job_number', label: '#', render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>#{r.job_number}</span> },
    { key: 'customer_name', label: 'Customer' },
    { key: 'device_type', label: 'Device' },
    { key: 'device_model', label: 'Model', render: (r) => <span className="muted">{r.device_model ?? '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status as RepairStatus} /> },
    { key: 'total_charge', label: 'Charge', numeric: true, render: (r) => formatNaira(r.total_charge) },
    { key: 'balance', label: 'Owing', numeric: true, render: (r) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: r.balance > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
        {r.balance > 0 ? formatNaira(r.balance) : '—'}
      </span>
    )},
    { key: 'received_at', label: 'Received', render: (r) => <span className="muted">{formatDate(r.received_at)}</span> },
    { key: 'id', label: '', render: (r) => (
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
        {r.status !== 'cancelled' && r.status !== 'completed' && r.status !== 'delivered' && (
          <IfRole minRole="technician">
            <button
              className="btn-ghost"
              style={{ padding: '3px', color: 'var(--accent-red)' }}
              onClick={(e) => { e.stopPropagation(); handleQuickCancel(r); }}
              title="Cancel Repair Job"
            >
              <Trash size={13} />
            </button>
          </IfRole>
        )}
      </div>
    )},
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['repairs', activeTab, debouncedSearch, datePreset, customFrom, customTo],
    queryFn: () => repairsApi.list({ status: activeTab, q: debouncedSearch || undefined, ...dateRange }),
  });

  const handleCreate = async (formData: RepairJobCreate) => {
    await repairsApi.create(formData);
    qc.invalidateQueries({ queryKey: ['repairs'] });
    addToast({ type: 'success', title: 'Repair job created' });
    setShowNewJob(false);
  };

  const handleDownloadTemplate = () => {
    const csv =
      'customer_name,customer_phone,device_type,device_model,fault_description,' +
      'labor_charge,total_charge,amount_paid,status,received_at,completed_at,notes\n' +
      'John Doe,08012345678,phone,iPhone 14,Cracked screen,5000,22000,22000,received,2026-05-14,,Screen replacement\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'repairs_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await repairsApi.importCsv(file);
      qc.invalidateQueries({ queryKey: ['repairs'] });
      const msg = result.errors.length
        ? `${result.created} imported, ${result.errors.length} rows had errors`
        : `${result.created} jobs imported successfully`;
      addToast({ type: result.errors.length ? 'warning' : 'success', title: 'CSV Import', message: msg });
      if (result.errors.length) console.error('CSV import errors:', result.errors);
    } catch (err) {
      addToast({ type: 'error', title: 'Import failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div>
      {/* Desktop header with all actions */}
      <div className="mobile-header-only">
        <PageHeader
          title="Repair Jobs"
          actions={
            <>
              <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
              <button className="btn-ghost" onClick={handleDownloadTemplate} style={{ gap: 'var(--space-2)' }} title="Download CSV template">
                <Download size={14} /> Template
              </button>
              <IfRole minRole="technician">
                <button className="btn-ghost" onClick={() => csvInputRef.current?.click()} disabled={importing} style={{ gap: 'var(--space-2)' }}>
                  {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                  Import
                </button>
              </IfRole>
              <button
                className="btn-ghost"
                onClick={() => exportCsv('repairs', (data?.items ?? []).map(r => ({
                  job_number: r.job_number, customer: r.customer_name, phone: r.customer_phone ?? '',
                  device: r.device_type, model: r.device_model ?? '', status: r.status,
                  total_charge: r.total_charge, labor_charge: r.labor_charge,
                  parts_cost: r.parts_cost, profit: r.profit, received_at: r.received_at,
                })))}
                style={{ gap: 'var(--space-2)' }}
              >
                <Download size={14} /> Export
              </button>
              <IfRole minRole="technician">
                <button className="btn-primary" onClick={() => setShowNewJob(true)}>
                  <Plus size={16} /> New Job
                </button>
              </IfRole>
            </>
          }
        />
      </div>

      {/* Status tabs — always visible, scrollable */}
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 'var(--space-3)' }}>
        <div className="tabs" style={{ width: 'max-content' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`tab ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
        <Calendar size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        {DATE_PRESETS.map((p) => (
          <button key={p.key} onClick={() => setDatePreset(p.key)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
            fontSize: 'var(--text-xs)', fontWeight: 600,
            background: datePreset === p.key ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: datePreset === p.key ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {datePreset === 'custom' && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">From</label>
            <input type="date" className="input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">To</label>
            <input type="date" className="input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Desktop-only search (hidden on mobile — use bottom search bar) */}
      <div className="desktop-search" style={{ position: 'relative', marginBottom: 'var(--space-5)', maxWidth: 400 }}>
        <Search size={14} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, device..."
          style={{ paddingLeft: 'calc(var(--space-3) + 14px + var(--space-2))' }}
        />
      </div>

      {/* Table */}
      <div className="liquid-card-flush" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          onRowClick={(job) => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setSelectedJobId(job.id);
            } else {
              router.push(`/business/repairs/${job.id}`);
            }
          }}
          loading={isLoading}
          emptyMessage="No repair jobs found"
          emptyAction={{ label: 'Create first job', onClick: () => setShowNewJob(true) }}
          keyExtractor={(r) => r.id}
          mobileRender={(r) => (
            <div className="mobile-txn-card">
              <div className="mobile-txn-row">
                <div className="mobile-txn-icon" style={{ background: 'var(--accent-primary-glow)' }}>
                  <Wrench size={18} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div className="mobile-txn-info">
                  <div className="mobile-txn-primary">{r.customer_name}</div>
                  <div className="mobile-txn-secondary">#{r.job_number} · {r.device_type}{r.device_model ? ` · ${r.device_model}` : ''}</div>
                </div>
                <div className="mobile-txn-amount" style={{ color: 'var(--text-primary)' }}>
                  {formatNaira(r.total_charge)}
                </div>
              </div>
              <div className="mobile-txn-meta">
                <Badge variant={r.status as RepairStatus} />
                <div className="mobile-txn-actions">
                  {r.balance > 0 && (
                    <span className="mobile-txn-chip" style={{ background: 'var(--accent-red-glow)', color: 'var(--accent-red)' }}>
                      Owes {formatNaira(r.balance)}
                    </span>
                  )}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(r.received_at)}</span>
                </div>
              </div>
            </div>
          )}
        />
      </div>

      <div className="bsb-spacer" />
      <JobDetailPanel jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />

      {/* Cancel job confirmation */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={`Cancel Job #${cancelTarget?.job_number ?? ''}`}
        accentColor="#EF4444"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep Job</button>
            <button
              className="btn-danger"
              onClick={handleConfirmCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel Job'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Cancelling this job will return all attached parts back to inventory. This action cannot be undone.
          </p>

          {/* Deposit resolution — only shown when the customer already paid something */}
          {cancelTarget && Number(cancelTarget.amount_paid) > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 'var(--space-3)' }}>
                ₦{Number(cancelTarget.amount_paid).toLocaleString()} was already paid — what happened to it?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {(['refunded', 'kept'] as const).map((opt) => (
                  <label
                    key={opt}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${depositResolution === opt ? 'var(--accent-amber)' : 'var(--border-default)'}`,
                      background: depositResolution === opt ? 'rgba(245,158,11,0.1)' : 'var(--bg-overlay)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="deposit_resolution"
                      value={opt}
                      checked={depositResolution === opt}
                      onChange={() => setDepositResolution(opt)}
                      style={{ accentColor: 'var(--accent-amber)' }}
                    />
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {opt === 'refunded' ? 'Refunded to customer' : 'Kept as cancellation fee'}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {opt === 'refunded'
                          ? 'Removes the amount from your balance'
                          : 'Amount stays in your balance and counts as income'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Reason for cancellation (optional)</label>
            <textarea
              className="input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer changed mind, part unavailable…"
              rows={3}
              style={{ resize: 'none', lineHeight: 1.6 }}
            />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showNewJob} onClose={() => setShowNewJob(false)} title="New Repair Job">
        <RepairJobForm onSubmit={handleCreate} onCancel={() => setShowNewJob(false)} />
      </Modal>
    </div>
  );
}
