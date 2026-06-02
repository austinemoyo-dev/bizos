'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { repairsApi } from '@/lib/api/repairs';
import { RepairJob, RepairStatus } from '@/types/api';
import { SlidePanel } from '@/components/shared/SlidePanel';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { AddPartForm } from './AddPartForm';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatNaira, formatProfit, calcTithe } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { Phone, Plus, AlertTriangle, Loader2, Sparkles, XCircle, Check, TrendingDown } from 'lucide-react';

/* ── Status stepper config ─────────────────────────────────────── */
const STEPS: RepairStatus[] = ['received', 'diagnosed', 'in_progress', 'completed', 'delivered'];
const STEP_LABELS: Record<string, string> = {
  received:    'Received',
  diagnosed:   'Diagnosed',
  in_progress: 'In Progress',
  completed:   'Completed',
  delivered:   'Delivered',
};

interface JobDetailPanelProps {
  jobId: string | null;
  onClose: () => void;
}

const STATUS_TRANSITIONS: Partial<Record<RepairStatus, RepairStatus>> = {
  received:    'diagnosed',
  diagnosed:   'in_progress',
  in_progress: 'completed',
  completed:   'delivered',
};

const STATUS_LABELS: Partial<Record<RepairStatus, string>> = {
  received:    'Mark Diagnosed',
  diagnosed:   'Mark In Progress',
  in_progress: 'Mark Completed',
  completed:   'Mark Delivered',
};

function suggestedCharge(job: RepairJob): number {
  return job.parts
    .filter((p) => !p.damaged)
    .reduce((s, p) => s + Number(p.selling_price ?? p.unit_cost) * p.quantity, 0);
}

export function JobDetailPanel({ jobId, onClose }: JobDetailPanelProps) {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [addingPart, setAddingPart] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [updatePaymentOpen, setUpdatePaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [applyingCharge, setApplyingCharge] = useState(false);

  const { data: job, isLoading } = useQuery<RepairJob>({
    queryKey: ['repair', jobId],
    queryFn: () => repairsApi.get(jobId!),
    enabled: !!jobId,
  });

  const handleStatusChange = async () => {
    if (!job) return;
    const next = STATUS_TRANSITIONS[job.status];
    if (!next) return;
    setTransitioning(true);
    try {
      const result = await repairsApi.updateStatus(job.id, next);
      if ((result as any)?._queued || !navigator.onLine) {
        qc.setQueryData(['repair', jobId], (old: RepairJob | undefined) =>
          old ? { ...old, status: next } : old
        );
      } else {
        qc.invalidateQueries({ queryKey: ['repair', jobId] });
        qc.invalidateQueries({ queryKey: ['repairs'] });
        qc.invalidateQueries({ queryKey: ['business-summary'] });
      }
      addToast({ type: 'success', title: `Job marked as ${next.replace('_', ' ')}` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update status', message: err instanceof Error ? err.message : '' });
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddPart = async (data: Parameters<typeof repairsApi.addPart>[1]) => {
    if (!job) return;
    const result = await repairsApi.addPart(job.id, data);
    if ((result as any)?._queued || !navigator.onLine) {
      const newPart = { id: `offline-${Date.now()}`, damaged: false, selling_price: null, ...data } as any;
      qc.setQueryData(['repair', jobId], (old: RepairJob | undefined) =>
        old ? { ...old, parts: [...old.parts, newPart] } : old
      );
    } else {
      qc.invalidateQueries({ queryKey: ['repair', jobId] });
      qc.invalidateQueries({ queryKey: ['business-summary'] });
    }
    addToast({ type: 'success', title: 'Part added' });
    setAddingPart(false);
  };

  const handleApplySuggestedCharge = async () => {
    if (!job) return;
    const suggested = suggestedCharge(job);
    setApplyingCharge(true);
    try {
      const result = await repairsApi.update(job.id, { total_charge: suggested });
      if ((result as any)?._queued || !navigator.onLine) {
        qc.setQueryData(['repair', jobId], (old: RepairJob | undefined) =>
          old ? { ...old, total_charge: suggested, balance: suggested - Number(old.amount_paid) } : old
        );
      } else {
        qc.invalidateQueries({ queryKey: ['repair', jobId] });
        qc.invalidateQueries({ queryKey: ['repairs'] });
        qc.invalidateQueries({ queryKey: ['business-summary'] });
      }
      addToast({ type: 'success', title: `Total charge updated to ${formatNaira(suggested)}` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update charge', message: err instanceof Error ? err.message : '' });
    } finally {
      setApplyingCharge(false);
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    setCancelling(true);
    try {
      await repairsApi.cancelJob(job.id, { cancel_reason: cancelReason || undefined });
      if (!navigator.onLine) {
        qc.setQueryData(['repair', jobId], (old: RepairJob | undefined) =>
          old ? { ...old, status: 'cancelled' as RepairStatus, cancel_reason: cancelReason || undefined } : old
        );
      } else {
        qc.invalidateQueries({ queryKey: ['repair', jobId] });
        qc.invalidateQueries({ queryKey: ['repairs'] });
        qc.invalidateQueries({ queryKey: ['business-summary'] });
      }
      addToast({ type: 'success', title: 'Order cancelled', message: 'Parts have been returned to inventory.' });
      setCancelOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to cancel', message: err instanceof Error ? err.message : '' });
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!job) return;
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      addToast({ type: 'error', title: 'Please enter a valid amount greater than 0' });
      return;
    }

    const newTotalPaid = Number(job.amount_paid) + paymentAmount;
    if (newTotalPaid > Number(job.total_charge)) {
      addToast({ type: 'error', title: 'Payment exceeds total balance' });
      return;
    }

    setUpdatingPayment(true);
    try {
      await repairsApi.updatePayment(job.id, newTotalPaid);
      if (!navigator.onLine) {
        qc.setQueryData(['repair', jobId], (old: RepairJob | undefined) =>
          old ? { ...old, amount_paid: newTotalPaid, balance: Math.max(0, Number(old.total_charge) - newTotalPaid) } : old
        );
      } else {
        qc.invalidateQueries({ queryKey: ['repair', jobId] });
        qc.invalidateQueries({ queryKey: ['repairs'] });
        qc.invalidateQueries({ queryKey: ['debtors'] });
        qc.invalidateQueries({ queryKey: ['business-summary'] });
      }
      addToast({ type: 'success', title: 'Payment updated' });
      setUpdatePaymentOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update payment', message: err instanceof Error ? err.message : '' });
    } finally {
      setUpdatingPayment(false);
    }
  };

  const openPaymentModal = () => {
    if (!job) return;
    setPaymentAmount(0);
    setUpdatePaymentOpen(true);
  };

  const canAddParts = job && job.status !== 'completed' && job.status !== 'delivered' && job.status !== 'cancelled';
  const canCancel  = job && job.status !== 'completed' && job.status !== 'delivered' && job.status !== 'cancelled';
  const nextStatus = job ? STATUS_TRANSITIONS[job.status] : null;
  const profitInfo = job ? formatProfit(job.profit) : null;
  const tithe      = job ? calcTithe(job.profit) : 0;

  const suggested      = job ? suggestedCharge(job) : 0;
  const chargeDiff     = job ? Math.abs(suggested - Number(job.total_charge)) : 0;
  const showSuggestion = job && job.parts.length > 0 && chargeDiff > 0.5 && canAddParts;

  return (
    <>
      <SlidePanel isOpen={!!jobId} onClose={onClose} title={job ? `Job #${job.job_number}` : 'Job Details'}>
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          </div>
        )}

        {job && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* ── Status Stepper ──────────────────────────────────── */}
            {job.status !== 'cancelled' ? (
              <div style={{ marginBottom: 'var(--space-2)' }}>
                {/* Node row */}
                <div className="status-stepper">
                  {STEPS.map((step, i) => {
                    const currentIdx = STEPS.indexOf(job.status);
                    const done   = i < currentIdx;
                    const active = i === currentIdx;
                    const nodeClass = done ? 'done' : active ? 'active' : 'pending';
                    return (
                      <div key={step} className="status-step">
                        <div className={`status-step-node ${nodeClass}`}>
                          {done
                            ? <Check size={11} strokeWidth={3} />
                            : <span style={{ fontSize: '0.5rem', fontWeight: 900 }}>{i + 1}</span>
                          }
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`status-step-line ${done ? 'done' : 'pending'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Label row */}
                <div className="status-step-labels">
                  {STEPS.map((step, i) => {
                    const currentIdx = STEPS.indexOf(job.status);
                    const labelClass = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
                    return (
                      <span key={step} className={`status-step-label ${labelClass}`}>
                        {STEP_LABELS[step]}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Badge variant={job.status as RepairStatus} />
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Current Status</span>
              </div>
            )}

            {/* Cancelled reason */}
            {job.status === 'cancelled' && job.cancel_reason && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)',
              }}>
                <XCircle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent-red)' }}>Cancellation Reason</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>{job.cancel_reason}</p>
                </div>
              </div>
            )}

            {/* Suggested charge banner */}
            {showSuggestion && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Sparkles size={13} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>
                    Suggested charge: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatNaira(suggested)}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>(parts at selling price)</span>
                  </p>
                </div>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', flexShrink: 0, color: 'var(--accent-green)', borderColor: 'rgba(16,185,129,0.3)' }}
                  onClick={handleApplySuggestedCharge}
                  disabled={applyingCharge}
                >
                  {applyingCharge ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply'}
                </button>
              </div>
            )}

            {/* Customer */}
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <p className="section-label">Customer</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                {job.customer_name}
              </p>
              {job.customer_phone && (
                <a href={`tel:${job.customer_phone}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--accent-primary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', textDecoration: 'none' }}>
                  <Phone size={12} /> {job.customer_phone}
                </a>
              )}
            </div>

            {/* Device & Fault */}
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <p className="section-label">Device</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                {job.device_type.replace('_', ' ')}{job.device_model ? ` — ${job.device_model}` : ''}
              </p>
              {job.fault_description && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                  {job.fault_description}
                </p>
              )}
              {job.notes && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
                  Note: {job.notes}
                </p>
              )}
            </div>

            {/* Parts */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <p className="section-label" style={{ marginBottom: 0 }}>Parts Used</p>
                {canAddParts && (
                  <button className="btn-ghost" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
                    onClick={() => setAddingPart(true)}>
                    <Plus size={12} /> Add Part
                  </button>
                )}
              </div>

              {job.parts.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No parts added yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table" style={{ fontSize: 'var(--text-xs)' }}>
                    <thead>
                      <tr>
                        <th>Part</th>
                        <th className="numeric">Qty</th>
                        <th className="numeric">Cost</th>
                        <th className="numeric">Charge</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.parts.map((part) => (
                        <tr key={part.id}>
                          <td>{part.item_name}</td>
                          <td className="numeric">×{part.quantity}</td>
                          <td className="numeric" style={{ color: 'var(--accent-red)' }}>
                            {formatNaira(part.unit_cost * part.quantity)}
                          </td>
                          <td className="numeric" style={{ color: 'var(--accent-green)' }}>
                            {part.selling_price
                              ? formatNaira(part.selling_price * part.quantity)
                              : '—'}
                          </td>
                          <td>
                            {part.damaged && (
                              <AlertTriangle size={12} style={{ color: 'var(--accent-amber)' }} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Financials */}
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <p className="section-label">Financial Summary</p>
              {[
                { label: 'Total Charge (Revenue)',  value: formatNaira(job.total_charge), color: 'var(--text-primary)' },
                { label: 'Amount Paid',             value: formatNaira(job.amount_paid), color: 'var(--accent-green)' },
                { label: 'Balance (Owing)',         value: formatNaira(job.balance), color: job.balance > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' },
                { label: 'Parts Cost',              value: `−${formatNaira(job.parts_cost)}`, color: 'var(--accent-red)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {label === 'Amount Paid' && job.balance > 0 && (
                      <button
                        className="btn-ghost"
                        style={{ padding: '2px 6px', fontSize: '10px', height: 'auto', color: 'var(--accent-amber)' }}
                        onClick={openPaymentModal}
                      >
                        Update
                      </button>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color }}>{value}</span>
                  </div>
                </div>
              ))}
              {/* ── Financial Breakdown Bar ─────────────────────── */}
              {job.total_charge > 0 && (
                <div className="finance-bar-wrap">
                  <div className="finance-bar-track">
                    <div
                      className="finance-bar-segment"
                      style={{
                        flex: job.parts_cost,
                        background: 'linear-gradient(90deg, #EF4444, #DC2626)',
                        minWidth: job.parts_cost > 0 ? 4 : 0,
                      }}
                      title={`Parts cost: ${formatNaira(job.parts_cost)}`}
                    />
                    <div
                      className="finance-bar-segment"
                      style={{
                        flex: Math.max(0, job.profit),
                        background: 'linear-gradient(90deg, #10B981, #059669)',
                        minWidth: job.profit > 0 ? 4 : 0,
                      }}
                      title={`Profit: ${formatNaira(job.profit)}`}
                    />
                  </div>
                  <div className="finance-bar-legend">
                    {[
                      { label: 'Parts',  color: '#EF4444', val: job.parts_cost },
                      { label: 'Profit', color: '#10B981', val: Math.max(0, job.profit) },
                    ].map(({ label, color, val }) => (
                      <div key={label} className="finance-bar-legend-item">
                        <div className="finance-bar-legend-dot" style={{ background: color }} />
                        {label}: <span style={{ fontFamily: 'var(--font-mono)', color }}>{formatNaira(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {profitInfo?.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: profitInfo?.color }}>
                  {profitInfo?.formatted}
                </span>
              </div>
              {tithe > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)' }}>Tithe (10%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-amber)' }}>
                    {formatNaira(tithe)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {nextStatus && (
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleStatusChange}
                  disabled={transitioning}
                >
                  {transitioning && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {STATUS_LABELS[job.status]}
                </button>
              )}
              {canCancel && (
                <button
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle size={14} /> Cancel Order
                </button>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      <Modal isOpen={addingPart} onClose={() => setAddingPart(false)} title="Add Part to Job">
        <AddPartForm onSubmit={handleAddPart} onCancel={() => setAddingPart(false)} />
      </Modal>

      <Modal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Order"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCancelOpen(false)}>Keep Job</button>
            <button
              className="btn-primary"
              style={{ background: 'var(--accent-red)', boxShadow: 'none' }}
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Confirm Cancellation
            </button>
          </>
        }
      >
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}>
          <AlertTriangle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Cancelling this job will return all parts back to inventory. This cannot be undone.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Reason for Cancellation</label>
          <input
            className="input"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer changed their mind"
          />
        </div>
      </Modal>

      {/* Update Payment Modal */}
      {job && (
        <Modal
          isOpen={updatePaymentOpen}
          onClose={() => setUpdatePaymentOpen(false)}
          title="Update Payment"
          footer={
            <>
              <button className="btn-ghost" onClick={() => setUpdatePaymentOpen(false)} disabled={updatingPayment}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdatePayment} disabled={updatingPayment}>
                {updatingPayment ? 'Updating...' : 'Save Payment'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--bg-base)', padding: 'var(--space-3)', borderRadius: 8, fontSize: 'var(--text-sm)' }}>
              <p><strong>Job #{job.job_number}</strong></p>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="muted">Total Cost:</span> <span>{formatNaira(job.total_charge)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="muted">Currently Paid:</span> <span style={{ color: 'var(--accent-green)' }}>{formatNaira(job.amount_paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Balance:</span> <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{formatNaira(job.balance)}</span>
              </div>
            </div>

            <div className="input-group">
              <label>Enter new payment amount</label>
              <CurrencyInput
                value={paymentAmount}
                onChange={setPaymentAmount}
                placeholder="Amount just paid"
              />
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                This amount will be added to the {formatNaira(job.amount_paid)} currently paid.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
