'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { repairsApi } from '@/lib/api/repairs';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { AddPartForm } from '@/components/business/AddPartForm';
import { RepairJobForm } from '@/components/business/RepairJobForm';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatNaira, formatDate, formatDateTime, formatProfit, calcTithe } from '@/lib/format';
import { RepairJob, RepairJobCreate, RepairStatus } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import {
  ArrowLeft, Phone, Plus, AlertTriangle, Loader2,
  Printer, Pencil, ChevronRight, Trash2, FileText,
} from 'lucide-react';
import { generateRepairReceipt } from '@/lib/pdfReports';
import { IfRole } from '@/components/shared/IfRole';
import { useUndoDelete } from '@/lib/hooks/useUndoDelete';

const STATUS_TRANSITIONS: Record<RepairStatus, RepairStatus | null> = {
  received:    'diagnosed',
  diagnosed:   'in_progress',
  in_progress: 'completed',
  completed:   'delivered',
  delivered:   null,
  cancelled:   null,
};

const STATUS_LABELS: Record<string, string> = {
  received: 'Mark as Diagnosed',
  diagnosed: 'Mark as In Progress',
  in_progress: 'Mark as Completed',
  completed: 'Mark as Delivered',
};

const STATUS_ORDER: RepairStatus[] = ['received', 'diagnosed', 'in_progress', 'completed', 'delivered'];
const STATUS_DISPLAY: Record<RepairStatus, string> = {
  received:    'Received',
  diagnosed:   'Diagnosed',
  in_progress: 'In Progress',
  completed:   'Completed',
  delivered:   'Delivered',
  cancelled:   'Cancelled',
};

export default function RepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const [addingPart, setAddingPart] = useState(false);
  const [editingJob, setEditingJob] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [removingPartId, setRemovingPartId] = useState<string | null>(null);
  const { deleteWithUndo } = useUndoDelete({ label: 'Part removed', delay: 5000 });

  const { data: job, isLoading } = useQuery<RepairJob>({
    queryKey: ['repair', id],
    queryFn: () => repairsApi.get(id),
    enabled: !!id,
  });

  const handleStatusChange = async () => {
    if (!job) return;
    const next = STATUS_TRANSITIONS[job.status];
    if (!next) return;
    setTransitioning(true);
    try {
      await repairsApi.updateStatus(job.id, next);
      qc.invalidateQueries({ queryKey: ['repair', id] });
      qc.invalidateQueries({ queryKey: ['repairs'] });
      addToast({ type: 'success', title: `Job marked as ${STATUS_DISPLAY[next]}` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update status', message: err instanceof Error ? err.message : '' });
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddPart = async (data: Parameters<typeof repairsApi.addPart>[1]) => {
    if (!job) return;
    await repairsApi.addPart(job.id, data);
    qc.invalidateQueries({ queryKey: ['repair', id] });
    qc.invalidateQueries({ queryKey: ['repairs'] });
    addToast({ type: 'success', title: 'Part added' });
    setAddingPart(false);
  };

  const handleRemovePart = (partId: string) => {
    if (!job) return;
    deleteWithUndo(async () => {
      setRemovingPartId(partId);
      try {
        await repairsApi.removePart(job.id, partId);
        qc.invalidateQueries({ queryKey: ['repair', id] });
        qc.invalidateQueries({ queryKey: ['repairs'] });
        addToast({ type: 'success', title: 'Part removed' });
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to remove part', message: err instanceof Error ? err.message : '' });
      } finally {
        setRemovingPartId(null);
      }
    });
  };

  const handleEditJob = async (data: RepairJobCreate) => {
    if (!job) return;
    await repairsApi.update(job.id, data);
    qc.invalidateQueries({ queryKey: ['repair', id] });
    qc.invalidateQueries({ queryKey: ['repairs'] });
    addToast({ type: 'success', title: 'Job updated' });
    setEditingJob(false);
  };

  const handlePrint = () => window.print();
  const handleReceipt = () => {
    if (!job) return;
    generateRepairReceipt({
      ...job,
      parts: job.parts.map((p) => ({
        item_name: p.item_name ?? '',
        quantity: p.quantity,
        unit_cost: p.unit_cost,
        damaged: p.damaged,
      })),
    });
  };

  if (isLoading) return <RepairDetailSkeleton />;
  if (!job) return (
    <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
      Job not found.
      <button className="btn-ghost" style={{ display: 'block', margin: 'var(--space-4) auto' }} onClick={() => router.back()}>
        Go back
      </button>
    </div>
  );

  const canModify = job.status !== 'completed' && job.status !== 'delivered';
  const nextStatus = STATUS_TRANSITIONS[job.status];
  const profitInfo = formatProfit(job.profit);
  const tithe = calcTithe(job.profit);
  const currentStepIndex = STATUS_ORDER.indexOf(job.status);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .card { border: 1px solid #ddd !important; box-shadow: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      {/* Back + Header */}
      <div className="no-print" style={{ marginBottom: 'var(--space-5)' }}>
        <button
          className="btn-ghost"
          onClick={() => router.back()}
          style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}
        >
          <ArrowLeft size={14} /> Back to Repairs
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              Job <span style={{ fontFamily: 'var(--font-mono)' }}>#{job.job_number}</span>
            </h1>
            <Badge variant={job.status} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn-ghost" onClick={handlePrint} style={{ gap: 'var(--space-2)' }}>
              <Printer size={14} /> Print
            </button>
            <button className="btn-ghost" onClick={handleReceipt} style={{ gap: 'var(--space-2)' }}>
              <FileText size={14} /> Receipt
            </button>
            <IfRole minRole="technician">
              {canModify && (
                <button className="btn-ghost" onClick={() => setEditingJob(true)} style={{ gap: 'var(--space-2)' }}>
                  <Pencil size={14} /> Edit
                </button>
              )}
              {nextStatus && (
                <button
                  className="btn-primary"
                  onClick={handleStatusChange}
                  disabled={transitioning}
                  style={{ gap: 'var(--space-2)' }}
                >
                  {transitioning
                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    : <ChevronRight size={14} />
                  }
                  {STATUS_LABELS[job.status]}
                </button>
              )}
            </IfRole>
          </div>
        </div>
      </div>

      {/* Print header */}
      <div style={{ display: 'none' }} className="print-only">
        <h2 style={{ fontFamily: 'monospace' }}>Dash & Co. — Repair Job #{job.job_number}</h2>
        <p style={{ color: '#666', fontSize: 12 }}>Printed {new Date().toLocaleString()}</p>
        <hr />
      </div>

      {/* Status Progress Bar */}
      <div className="card no-print" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STATUS_ORDER.map((s, i) => {
            const done = i <= currentStepIndex;
            const isLast = i === STATUS_ORDER.length - 1;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: done ? 'var(--accent-primary)' : 'var(--bg-overlay)',
                    border: `2px solid ${done ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: done ? 'white' : 'var(--text-muted)',
                    fontWeight: 600, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{
                    fontSize: 'var(--text-xs)', whiteSpace: 'nowrap',
                    color: done ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: i === currentStepIndex ? 600 : 400,
                  }}>
                    {STATUS_DISPLAY[s]}
                  </span>
                </div>
                {!isLast && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: 16,
                    background: i < currentStepIndex ? 'var(--accent-primary)' : 'var(--border-default)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-5)', alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Customer */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Customer</p>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
              {job.customer_name}
            </p>
            {job.customer_phone ? (
              <a
                href={`tel:${job.customer_phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--accent-primary)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}
              >
                <Phone size={13} /> {job.customer_phone}
              </a>
            ) : (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No phone number</p>
            )}
          </div>

          {/* Device */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Device</p>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
              {job.device_type}{job.device_model ? ` — ${job.device_model}` : ''}
            </p>
            {job.fault_description && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {job.fault_description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Received</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(job.received_at)}</p>
              </div>
              {job.delivered_at && (
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Delivered</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(job.delivered_at)}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Last Updated</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDateTime(job.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Parts */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <p className="section-label" style={{ marginBottom: 0 }}>Parts Used</p>
              {canModify && (
                <button className="btn-ghost" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                  onClick={() => setAddingPart(true)}>
                  <Plus size={12} /> Add Part
                </button>
              )}
            </div>

            {job.parts.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6) 0' }}>
                No parts added yet.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th className="numeric">Qty</th>
                      <th className="numeric">Unit Cost</th>
                      <th className="numeric">Total</th>
                      <th>Flag</th>
                      {canModify && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {job.parts.map((part) => (
                      <tr key={part.id}>
                        <td style={{ fontWeight: 500 }}>{part.item_name}</td>
                        <td className="numeric">×{part.quantity}</td>
                        <td className="numeric" style={{ fontFamily: 'var(--font-mono)' }}>
                          {formatNaira(part.unit_cost)}
                        </td>
                        <td className="numeric" style={{ fontFamily: 'var(--font-mono)' }}>
                          {formatNaira(part.unit_cost * part.quantity)}
                        </td>
                        <td>
                          {part.damaged && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--accent-amber)', fontSize: 'var(--text-xs)' }}>
                              <AlertTriangle size={12} /> Damaged
                            </span>
                          )}
                        </td>
                        {canModify && (
                          <td>
                            <button
                              className="btn-ghost no-print"
                              style={{ padding: 'var(--space-1)', color: 'var(--accent-red)' }}
                              onClick={() => handleRemovePart(part.id)}
                              disabled={removingPartId === part.id}
                            >
                              {removingPartId === part.id
                                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={canModify ? 3 : 3} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Total Parts Cost
                      </td>
                      <td className="numeric" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatNaira(job.parts_cost)}
                      </td>
                      <td colSpan={canModify ? 2 : 1} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Financial Summary */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Financial Summary</p>

            {[
              { label: 'Total Charge', value: formatNaira(job.total_charge), color: 'var(--text-primary)', bold: true },
              { label: 'Labor Charge', value: formatNaira(job.labor_charge), color: 'var(--text-secondary)' },
              { label: 'Parts Cost', value: `−${formatNaira(job.parts_cost)}`, color: 'var(--accent-red)' },
            ].map(({ label, value, color, bold }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color, fontWeight: bold ? 600 : 400 }}>
                  {value}
                </span>
              </div>
            ))}

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-3) 0' }} />

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: profitInfo.bgColor, borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3) var(--space-3)', marginBottom: 'var(--space-3)',
            }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: profitInfo.color }}>
                {profitInfo.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: profitInfo.color }}>
                {profitInfo.sign}{profitInfo.formatted}
              </span>
            </div>

            {tithe > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)' }}>Tithe (10%)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', fontWeight: 600 }}>
                  {formatNaira(tithe)}
                </span>
              </div>
            )}
          </div>

          {/* Job Meta */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Job Info</p>
            {[
              { label: 'Job Number', value: `#${job.job_number}`, mono: true },
              { label: 'Created', value: formatDateTime(job.created_at) },
              { label: 'Status', value: STATUS_DISPLAY[job.status] },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Advance status */}
          {nextStatus && (
            <button
              className="btn-primary no-print"
              style={{ width: '100%', justifyContent: 'center', gap: 'var(--space-2)' }}
              onClick={handleStatusChange}
              disabled={transitioning}
            >
              {transitioning
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <ChevronRight size={14} />
              }
              {STATUS_LABELS[job.status]}
            </button>
          )}

          {job.status === 'delivered' && (
            <div style={{
              textAlign: 'center', padding: 'var(--space-4)',
              background: 'var(--accent-green-glow)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-green)', fontWeight: 600 }}>
                Job Complete
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                Delivered {job.delivered_at ? formatDate(job.delivered_at) : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={addingPart} onClose={() => setAddingPart(false)} title="Add Part to Job">
        <AddPartForm onSubmit={handleAddPart} onCancel={() => setAddingPart(false)} />
      </Modal>

      <Modal isOpen={editingJob} onClose={() => setEditingJob(false)} title="Edit Repair Job">
        <RepairJobForm
          onSubmit={handleEditJob}
          onCancel={() => setEditingJob(false)}
          initialValues={{
            customer_name: job.customer_name,
            customer_phone: job.customer_phone ?? '',
            device_type: job.device_type,
            device_model: job.device_model ?? '',
            fault_description: job.fault_description ?? '',
            labor_charge: job.labor_charge,
            total_charge: job.total_charge,
          }}
        />
      </Modal>
    </>
  );
}

function RepairDetailSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Skeleton width={120} height={32} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
          <Skeleton width={200} height={36} />
          <Skeleton width={160} height={36} />
        </div>
      </div>
      <Skeleton width="100%" height={80} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Skeleton width="100%" height={100} />
          <Skeleton width="100%" height={140} />
          <Skeleton width="100%" height={200} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Skeleton width="100%" height={200} />
          <Skeleton width="100%" height={120} />
        </div>
      </div>
    </div>
  );
}
