'use client';

import { useState } from 'react';
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
import { Plus, Search, ExternalLink, Download, Trash, Wrench } from 'lucide-react';
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
  const debouncedSearch = useDebounce(search, 300);

  const handleQuickCancel = async (job: RepairJob) => {
    const reason = window.prompt(`Cancel Repair Job #${job.job_number}?\nPlease provide a reason for cancellation. This will return any parts back to inventory.`);
    if (reason === null) return;
    try {
      await repairsApi.cancelJob(job.id, { cancel_reason: reason || undefined });
      qc.invalidateQueries({ queryKey: ['repairs'] });
      addToast({ type: 'success', title: 'Job cancelled', message: 'Parts returned to inventory' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to cancel', message: err instanceof Error ? err.message : '' });
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

  return (
    <div>
      <PageHeader
        title="Repair Jobs"
        actions={
          <>
            <button
              className="btn-ghost"
              onClick={() => exportCsv('repairs', (data?.items ?? []).map(r => ({
                job_number: r.job_number,
                customer: r.customer_name,
                phone: r.customer_phone ?? '',
                device: r.device_type,
                model: r.device_model ?? '',
                status: r.status,
                total_charge: r.total_charge,
                labor_charge: r.labor_charge,
                parts_cost: r.parts_cost,
                profit: r.profit,
                received_at: r.received_at,
              })))}
              style={{ gap: 'var(--space-2)' }}
            >
              <Download size={14} /> CSV
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

      <Modal isOpen={showNewJob} onClose={() => setShowNewJob(false)} title="New Repair Job">
        <RepairJobForm onSubmit={handleCreate} onCancel={() => setShowNewJob(false)} />
      </Modal>
    </div>
  );
}
