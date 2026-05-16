'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { personalApi } from '@/lib/api/personal';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { SavingsGoalCard } from '@/components/personal/SavingsGoalCard';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNaira } from '@/lib/format';
import { SavingsGoal, SavingsGoalCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Loader2, PiggyBank } from 'lucide-react';

export default function SavingsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<SavingsGoalCreate>({ title: '', target_amount: 0, deadline: '' });
  const [editGoal, setEditGoal] = useState<{ id: string } & SavingsGoalCreate | null>(null);

  const { data: goals } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => personalApi.savings.list(),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await personalApi.savings.create(form);
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
      addToast({ type: 'success', title: 'Savings goal created' });
      setShowAdd(false);
      setForm({ title: '', target_amount: 0, deadline: '' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditGoal({ id: goal.id, title: goal.title, target_amount: goal.target_amount, deadline: goal.deadline ?? '' });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGoal) return;
    setLoading(true);
    try {
      await personalApi.savings.update(editGoal.id, {
        title: editGoal.title,
        target_amount: editGoal.target_amount,
        deadline: editGoal.deadline || undefined,
      });
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
      addToast({ type: 'success', title: 'Goal updated' });
      setEditGoal(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositGoalId || depositAmount <= 0) return;
    setLoading(true);
    try {
      await personalApi.savings.deposit(depositGoalId, depositAmount);
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
      addToast({ type: 'success', title: `${formatNaira(depositAmount)} deposited` });
      setDepositGoalId(null);
      setDepositAmount(0);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  };

  const totalSaved = (goals ?? []).reduce((s, g) => s + Number(g.current_amount), 0);

  return (
    <div>
      <PageHeader
        title="Savings"
        subtitle={`Total saved: ${formatNaira(totalSaved)}`}
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New Goal
          </button>
        }
      />

      {(!goals || goals.length === 0) ? (
        <EmptyState
          icon={<PiggyBank size={48} />}
          title="No savings goals yet"
          description="Create a goal and start saving toward it."
          action={{ label: 'Create first goal', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {goals.map((goal) => (
            <SavingsGoalCard key={goal.id} goal={goal} onDeposit={setDepositGoalId} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Savings Goal"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" form="savings-form" type="submit" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Create Goal
            </button>
          </>
        }
      >
        <form id="savings-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Goal Title *</label>
            <input className="input" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g. Emergency Fund" />
          </div>
          <div className="form-group">
            <CurrencyInput label="Target Amount *" value={form.target_amount}
              onChange={(v) => setForm((f) => ({ ...f, target_amount: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Deadline (optional)</label>
            <input type="date" className="input" value={form.deadline ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal isOpen={!!editGoal} onClose={() => setEditGoal(null)} title="Edit Savings Goal"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditGoal(null)}>Cancel</button>
            <button className="btn-primary" form="edit-goal-form" type="submit" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Save Changes
            </button>
          </>
        }
      >
        {editGoal && (
          <form id="edit-goal-form" onSubmit={handleEdit}>
            <div className="form-group">
              <label className="form-label">Goal Title *</label>
              <input className="input" value={editGoal.title} required
                onChange={(e) => setEditGoal((g) => g ? { ...g, title: e.target.value } : g)} />
            </div>
            <div className="form-group">
              <CurrencyInput label="Target Amount *" value={editGoal.target_amount}
                onChange={(v) => setEditGoal((g) => g ? { ...g, target_amount: v } : g)} />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline (optional)</label>
              <input type="date" className="input" value={editGoal.deadline ?? ''}
                onChange={(e) => setEditGoal((g) => g ? { ...g, deadline: e.target.value } : g)} />
            </div>
          </form>
        )}
      </Modal>

      {/* Deposit Modal */}
      <Modal isOpen={!!depositGoalId} onClose={() => setDepositGoalId(null)} title="Make Deposit"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDepositGoalId(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleDeposit} disabled={loading || depositAmount <= 0}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Deposit
            </button>
          </>
        }
      >
        <CurrencyInput label="Amount to Deposit" value={depositAmount} onChange={setDepositAmount} />
      </Modal>
    </div>
  );
}
