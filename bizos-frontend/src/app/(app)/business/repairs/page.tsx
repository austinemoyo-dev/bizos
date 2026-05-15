'use client';

import { useState, useRef } from 'react';
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
import { Plus, Search, ExternalLink, Download, Upload, Loader2, Trash, Wrench } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import { exportCsv } from '@/lib/exportCsv';
import { IfRole } from '@/components/shared/IfRole';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Received', value: 'received' },
  { label: 'Diagnosed', value: 'diagnosed' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Delivered', value: 'delivered' },
];

export default function RepairsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  // Cancel confirmation modal state
  const [cancelTarget, setCancelTarget] = useState<RepairJob | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleQuickCancel = (job: RepairJob) => {
    setCancelReason('');
    setCancelTarget(job);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await repairsApi.cancelJob(cancelTarget.id, { cancel_reason: cancelReason || undefined });
      qc.invalidateQueries({ queryKey: ['repairs'] });
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
    queryKey: ['repairs', activeTab, debouncedSearch],
    queryFn: () => repairsApi.list({ status: activeTab || undefined, q: debouncedSearch || undefined }),
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
      <PageHeader
        title="Repair Jobs"
        actions={
          <>
            <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
            <button className="btn-ghost" onClick={handleDownloadTemplate} style={{ gap: 'var(--space-2)' }} title="Download CSV template">
              <Download size={14} /> Template
            </button>
            <IfRole minRole="technician">
              <button className="btn-ghost" onClick={() => csvInputRef.current?.click()} disabled={importing} style={{ gap: 'var(--space-2)' }} title="Import jobs from CSV">
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

      {/* Tabs */}
      <div style={{ overflowX: 'auto', marginBottom: 'var(--space-4)' }}>
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-5)', maxWidth: 400 }}>
        <Search size={14} style={{
          position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
        }} />
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
          onRowClick={(job) => router.push(`/business/repairs/${job.id}`)}
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
