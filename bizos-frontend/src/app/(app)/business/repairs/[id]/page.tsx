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
  Printer, Pencil, ChevronRight, Trash2, FileText, XCircle,
  Banknote,
} from 'lucide-react';
import { format } from 'date-fns';
import { generateRepairReceipt } from '@/lib/pdfReports';
import { IfRole } from '@/components/shared/IfRole';
import { useUndoDelete } from '@/lib/hooks/useUndoDelete';
import { useBottomCta } from '@/lib/hooks/useBottomCta';

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
  const [editingCompletedAt, setEditingCompletedAt] = useState(false);
  const [completedAtValue, setCompletedAtValue] = useState('');
  const [savingCompletedAt, setSavingCompletedAt] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelDepositResolution, setCancelDepositResolution] = useState<'refunded' | 'kept' | null>(null);
  const [resolvingDeposit, setResolvingDeposit] = useState(false);
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

  const handleSaveCompletedAt = async () => {
    if (!job || !completedAtValue) return;
    setSavingCompletedAt(true);
    try {
      await repairsApi.update(job.id, { completed_at: completedAtValue });
      qc.invalidateQueries({ queryKey: ['repair', id] });
      qc.invalidateQueries({ queryKey: ['repairs'] });
      addToast({ type: 'success', title: 'Completion date updated' });
      setEditingCompletedAt(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update date', message: err instanceof Error ? err.message : '' });
    } finally {
      setSavingCompletedAt(false);
    }
  };

  const handleResolveDeposit = async (resolution: 'refunded' | 'kept') => {
    if (!job) return;
    setResolvingDeposit(true);
    try {
      await repairsApi.resolveDeposit(job.id, resolution);
      qc.invalidateQueries({ queryKey: ['repair', id] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      const msg = resolution === 'refunded'
        ? 'Refund recorded — deposit removed from your balance'
        : 'Deposit kept — recorded as cancellation fee income';
      addToast({ type: 'success', title: 'Deposit resolved', message: msg });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setResolvingDeposit(false);
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    const hasDeposit = Number(job.amount_paid) > 0;
    if (hasDeposit && !cancelDepositResolution) {
      addToast({ type: 'error', title: 'Select what happened to the deposit' });
      return;
    }
    setCancelling(true);
    try {
      await repairsApi.cancelJob(job.id, { cancel_reason: cancelReason || undefined });
      if (hasDeposit && cancelDepositResolution) {
        await repairsApi.resolveDeposit(job.id, cancelDepositResolution);
      }
      qc.invalidateQueries({ queryKey: ['repair', id] });
      qc.invalidateQueries({ queryKey: ['repairs'] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
      addToast({ type: 'success', title: 'Job cancelled', message: 'All parts returned to inventory' });
      setShowCancel(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to cancel', message: err instanceof Error ? err.message : '' });
    } finally {
      setCancelling(false);
    }
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
      {/* Mounts only when job is ready — keeps useBottomCta unconditional within its own scope */}
      <RepairBottomCta job={job} transitioning={transitioning} onStatusChange={handleStatusChange} />

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .card { border: 1px solid #ddd !important; box-shadow: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      {/* Back + Header */}
      <div className="no-print" style={{ marginBottom: 'var(--space-4)' }}>
        {/* Back row */}
        <button
          className="btn-ghost"
          onClick={() => router.back()}
          style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Job title + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            Job <span style={{ fontFamily: 'var(--font-mono)' }}>#{job.job_number}</span>
          </h1>
          <Badge variant={job.status} />
        </div>

        {/* Action buttons — horizontal scroll on mobile */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          <button className="btn-ghost" onClick={handlePrint} style={{ gap: 6, flexShrink: 0 }}>
            <Printer size={14} /> Print
          </button>
          <button className="btn-ghost" onClick={handleReceipt} style={{ gap: 6, flexShrink: 0 }}>
            <FileText size={14} /> Receipt
          </button>
          <IfRole minRole="technician">
            {canModify && (
              <button className="btn-ghost" onClick={() => setEditingJob(true)} style={{ gap: 6, flexShrink: 0 }}>
                <Pencil size={14} /> Edit
              </button>
            )}
            {job.status !== 'cancelled' && job.status !== 'delivered' && (
              <button
                className="btn-ghost"
                onClick={() => { setCancelReason(''); setCancelDepositResolution(null); setShowCancel(true); }}
                style={{ gap: 6, color: 'var(--accent-red)', flexShrink: 0 }}
              >
                <XCircle size={14} /> Cancel
              </button>
            )}
          </IfRole>
        </div>
      </div>

      {/* Print header */}
      <div style={{ display: 'none' }} className="print-only">
        <h2 style={{ fontFamily: 'monospace' }}>Dash & Co. — Repair Job #{job.job_number}</h2>
        <p style={{ color: '#666', fontSize: 12 }}>Printed {new Date().toLocaleString()}</p>
        <hr />
      </div>

      {/* Status Progress Bar — horizontally scrollable on mobile */}
      <div className="card no-print" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', gap: 0 }}>
          {STATUS_ORDER.map((s, i) => {
            const done = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const isLast = i === STATUS_ORDER.length - 1;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: done ? 'var(--accent-primary)' : 'var(--bg-overlay)',
                    border: `2px solid ${done ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: done ? 'white' : 'var(--text-muted)',
                    fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{
                    whiteSpace: 'nowrap', fontSize: '0.65rem',
                    color: done ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: isCurrent ? 700 : 400,
                  }}>
                    {STATUS_DISPLAY[s]}
                  </span>
                </div>
                {!isLast && (
                  <div style={{
                    width: 32, height: 2, marginBottom: 18, marginLeft: 4, marginRight: 4, flexShrink: 0,
                    background: i < currentStepIndex ? 'var(--accent-primary)' : 'var(--border-default)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deposit resolution banner — shown on cancelled jobs with unresolved deposits */}
      {job.status === 'cancelled' && Number(job.amount_paid) > 0 && !job.deposit_resolution && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 'var(--space-4)', flexWrap: 'wrap',
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderLeft: '3px solid var(--accent-amber)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
        }} className="no-print">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <Banknote size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 4 }}>
                Deposit not resolved — {formatNaira(Number(job.amount_paid))} paid
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                This job was cancelled but a deposit was already collected. What happened to the money?
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button
              className="btn-ghost"
              style={{ fontSize: 'var(--text-xs)', gap: 'var(--space-1)', borderColor: 'rgba(245,158,11,0.4)' }}
              onClick={() => handleResolveDeposit('refunded')}
              disabled={resolvingDeposit}
            >
              {resolvingDeposit ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Refunded to customer
            </button>
            <button
              className="btn-primary"
              style={{ fontSize: 'var(--text-xs)', background: 'var(--accent-amber)', boxShadow: 'none' }}
              onClick={() => handleResolveDeposit('kept')}
              disabled={resolvingDeposit}
            >
              Kept as fee
            </button>
          </div>
        </div>
      )}

      {/* Deposit resolved confirmation */}
      {job.status === 'cancelled' && job.deposit_resolution && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
        }} className="no-print">
          <Banknote size={13} />
          Deposit {formatNaira(Number(job.amount_paid))} —{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {job.deposit_resolution === 'refunded' ? 'Refunded to customer' : 'Kept as cancellation fee'}
          </span>
        </div>
      )}

      {/* Main Grid — single column on mobile */}
      <div className="detail-grid" style={{ marginBottom: nextStatus ? 80 : 0 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Customer */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="section-label">Customer</p>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
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
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {job.device_type}{job.device_model ? ` — ${job.device_model}` : ''}
            </p>
            {job.fault_description && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {job.fault_description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap', rowGap: 'var(--space-3)' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Received</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(job.received_at)}</p>
              </div>

              {/* Completed date — shows for completed/delivered jobs, editable for backdating */}
              {(job.status === 'completed' || job.status === 'delivered') && (
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Completed</p>
                  {editingCompletedAt ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="date"
                        className="input"
                        style={{ padding: '2px 6px', fontSize: 'var(--text-sm)', width: 140 }}
                        value={completedAtValue}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setCompletedAtValue(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        style={{ padding: '2px 10px', fontSize: 'var(--text-xs)' }}
                        onClick={handleSaveCompletedAt}
                        disabled={savingCompletedAt || !completedAtValue}
                      >
                        {savingCompletedAt ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save'}
                      </button>
                      <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
                        onClick={() => setEditingCompletedAt(false)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <p style={{ fontSize: 'var(--text-sm)', color: job.completed_at ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {job.completed_at ? formatDate(job.completed_at) : 'Not set'}
                      </p>
                      <button
                        className="btn-ghost"
                        style={{ padding: 2 }}
                        title="Backdate completion"
                        onClick={() => {
                          setCompletedAtValue(job.completed_at ? format(new Date(job.completed_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
                          setEditingCompletedAt(true);
                        }}
                      >
                        <Pencil size={11} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  )}
                </div>
              )}

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
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as 'touch' }}>
                <table className="data-table" style={{ minWidth: 420 }}>
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
                        <td style={{ fontWeight: 500, minWidth: 100 }}>{part.item_name ?? '—'}</td>
                        <td className="numeric" style={{ whiteSpace: 'nowrap' }}>×{part.quantity}</td>
                        <td className="numeric" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {formatNaira(part.unit_cost)}
                        </td>
                        <td className="numeric" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
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
                      <td className="numeric" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
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
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', gap: 'var(--space-3)', minWidth: 0 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color, fontWeight: bold ? 600 : 400, whiteSpace: 'nowrap' }}>
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

          {/* Advance status — desktop only (mobile uses sticky bar below) */}
          {nextStatus && (
            <button
              className="btn-primary no-print desktop-only-action"
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

      <Modal
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        title={`Cancel Job #${job.job_number}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowCancel(false)} disabled={cancelling}>Keep Job</button>
            <button className="btn-danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
              {cancelling ? 'Cancelling…' : 'Cancel Job'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            This will return all attached parts back to inventory. This action cannot be undone.
          </p>

          {Number(job.amount_paid) > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 'var(--space-3)' }}>
                {formatNaira(Number(job.amount_paid))} was already paid — what happened to it?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {(['refunded', 'kept'] as const).map((opt) => (
                  <label
                    key={opt}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${cancelDepositResolution === opt ? 'var(--accent-amber)' : 'var(--border-default)'}`,
                      background: cancelDepositResolution === opt ? 'rgba(245,158,11,0.1)' : 'var(--bg-overlay)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="cancel_deposit_resolution"
                      value={opt}
                      checked={cancelDepositResolution === opt}
                      onChange={() => setCancelDepositResolution(opt)}
                      style={{ accentColor: 'var(--accent-amber)' }}
                    />
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {opt === 'refunded' ? 'Refunded to customer' : 'Kept as cancellation fee'}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {opt === 'refunded'
                          ? 'Removes the amount from your balance'
                          : 'Stays in your balance and counts as income'}
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

function RepairBottomCta({
  job,
  transitioning,
  onStatusChange,
}: {
  job: RepairJob;
  transitioning: boolean;
  onStatusChange: () => void;
}) {
  const nextStatus = STATUS_TRANSITIONS[job.status];
  useBottomCta({
    label: nextStatus ? STATUS_LABELS[job.status] : '',
    enabled: !!nextStatus,
    loading: transitioning,
    onClick: onStatusChange,
  });
  return null;
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
