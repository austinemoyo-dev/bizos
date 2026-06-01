'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { lendingApi, LoanGiven, DebtOwed } from '@/lib/api/lending';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatNaira, formatDate } from '@/lib/format';
import { useUIStore } from '@/lib/stores/uiStore';
import { fadeUp } from '@/lib/motion-variants';
import {
  Plus, Loader2, CheckCircle, ArrowUpRight, ArrowDownLeft,
  AlertTriangle, Wallet, Utensils,
} from 'lucide-react';

type MainTab = 'loans_given' | 'debts_owed';
type SubTab  = 'outstanding' | 'settled';

function OverdueChip({ dueDate, isSettled }: { dueDate: string | null; isSettled: boolean }) {
  if (isSettled || !dueDate) return null;
  const overdue = new Date(dueDate) < new Date();
  if (!overdue) return null;
  return (
    <span style={{
      fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
      color: 'var(--accent-red)', background: 'var(--accent-red-glow)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 20, padding: '2px 7px', letterSpacing: '0.04em',
    }}>
      Overdue
    </span>
  );
}

function DueSoonChip({ dueDate, isSettled }: { dueDate: string | null; isSettled: boolean }) {
  if (isSettled || !dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = (due.getTime() - now.getTime()) / 86400000;
  if (diff < 0 || diff > 7) return null;
  return (
    <span style={{
      fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
      color: 'var(--accent-amber)', background: 'var(--accent-amber-glow)',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 20, padding: '2px 7px', letterSpacing: '0.04em',
    }}>
      Due soon
    </span>
  );
}

const PURPLE = '#A78BFA';
const PURPLE_GLOW = 'rgba(167,139,250,0.12)';

export default function PersonalLendingPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState<MainTab>('loans_given');
  const [subTab, setSubTab]   = useState<SubTab>('outstanding');
  const [loading, setLoading] = useState(false);

  // ── Loans given state ────────────────────────────────────────────
  const [showAddLoan, setShowAddLoan]   = useState(false);
  const [repayTarget, setRepayTarget]   = useState<LoanGiven | null>(null);
  const [repayAmount, setRepayAmount]   = useState(0);
  const [loanForm, setLoanForm] = useState({
    borrower_name: '', principal_amount: 0,
    due_date: '', purpose: '', notes: '',
  });

  // ── Debts owed state ─────────────────────────────────────────────
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [payTarget, setPayTarget]     = useState<DebtOwed | null>(null);
  const [payAmount, setPayAmount]     = useState(0);
  const [debtForm, setDebtForm] = useState({
    creditor_name: '', principal_amount: 0,
    due_date: '', purpose: '', notes: '',
  });

  // ── Opening balance state ────────────────────────────────────────
  const [showOpeningBalance, setShowOpeningBalance] = useState(false);
  const [obAmount, setObAmount] = useState(0);

  // ── Queries ──────────────────────────────────────────────────────
  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ['loans-given', 'personal'],
    queryFn: () => lendingApi.listLoans('personal'),
  });
  const { data: debts = [], isLoading: debtsLoading } = useQuery({
    queryKey: ['debts-owed', 'personal'],
    queryFn: () => lendingApi.listDebts('personal'),
  });
  const { data: summary } = useQuery({
    queryKey: ['lending-summary', 'personal'],
    queryFn: () => lendingApi.summary('personal'),
  });
  const { data: cashPos } = useQuery({
    queryKey: ['cash-position', 'personal'],
    queryFn: () => cashFlowApi.getPosition('personal'),
  });

  const shownLoans = loans.filter(l => subTab === 'outstanding' ? !l.is_settled : l.is_settled);
  const shownDebts = debts.filter(d => subTab === 'outstanding' ? !d.is_settled : d.is_settled);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await lendingApi.createLoan({ scope: 'personal', ...loanForm });
      qc.invalidateQueries({ queryKey: ['loans-given'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['cash-position'] });
      addToast({ type: 'success', title: 'Loan recorded', message: `Cash sent to ${loanForm.borrower_name}.` });
      setShowAddLoan(false);
      setLoanForm({ borrower_name: '', principal_amount: 0, due_date: '', purpose: '', notes: '' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally { setLoading(false); }
  };

  const handleRepayLoan = async () => {
    if (!repayTarget || repayAmount <= 0) return;
    setLoading(true);
    try {
      await lendingApi.repayLoan(repayTarget.id, { amount: repayAmount });
      qc.invalidateQueries({ queryKey: ['loans-given'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['cash-position'] });
      const settled = repayAmount >= repayTarget.outstanding;
      addToast({ type: 'success', title: settled ? `${repayTarget.borrower_name} fully repaid!` : 'Repayment recorded', message: 'Cash returned to your balance.' });
      setRepayTarget(null); setRepayAmount(0);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally { setLoading(false); }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await lendingApi.createDebt({ scope: 'personal', ...debtForm });
      qc.invalidateQueries({ queryKey: ['debts-owed'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['cash-position'] });
      addToast({ type: 'success', title: 'Debt recorded', message: `Borrowed from ${debtForm.creditor_name}.` });
      setShowAddDebt(false);
      setDebtForm({ creditor_name: '', principal_amount: 0, due_date: '', purpose: '', notes: '' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally { setLoading(false); }
  };

  const handlePayDebt = async () => {
    if (!payTarget || payAmount <= 0) return;
    setLoading(true);
    try {
      await lendingApi.payDebt(payTarget.id, { amount: payAmount });
      qc.invalidateQueries({ queryKey: ['debts-owed'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['cash-position'] });
      const settled = payAmount >= payTarget.outstanding;
      addToast({ type: 'success', title: settled ? 'Debt fully settled!' : 'Payment recorded', message: settled ? undefined : 'Personal expense recorded.' });
      setPayTarget(null); setPayAmount(0);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally { setLoading(false); }
  };

  const handleSetOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await cashFlowApi.setOpeningBalance({ scope: 'personal', opening_balance: obAmount });
      qc.invalidateQueries({ queryKey: ['cash-position'] });
      addToast({ type: 'success', title: 'Opening balance set', message: 'Personal cash tracking is now active.' });
      setShowOpeningBalance(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally { setLoading(false); }
  };

  const isLoading = loansLoading || debtsLoading;
  const overdueLoans = loans.filter(l => !l.is_settled && l.due_date && new Date(l.due_date) < new Date());
  const overdueDebts = debts.filter(d => !d.is_settled && d.due_date && new Date(d.due_date) < new Date());

  return (
    <div>
      <PageHeader
        title="Personal Lending"
        subtitle="Money you lent · Debts you owe · Food vendor credits"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }}
              onClick={() => setShowOpeningBalance(true)}>
              <Wallet size={14} /> Set Balance
            </button>
            {mainTab === 'loans_given'
              ? <button className="btn-primary" style={{ background: PURPLE, boxShadow: `0 2px 12px ${PURPLE}50` }} onClick={() => setShowAddLoan(true)}><Plus size={15} /> Loan Given</button>
              : <button className="btn-primary" style={{ background: PURPLE, boxShadow: `0 2px 12px ${PURPLE}50` }} onClick={() => setShowAddDebt(true)}><Plus size={15} /> Record Debt</button>
            }
          </div>
        }
      />

      {/* ── Cash Position Banner ─────────────────────────────────── */}
      {cashPos && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
        }}>
          {[
            { label: 'Cash in Hand', value: cashPos.current_balance, color: cashPos.current_balance >= 0 ? PURPLE : 'var(--accent-red)' },
            { label: 'Money Out (Loans)', value: summary ? summary.outstanding_receivable : 0, color: 'var(--accent-amber)' },
            { label: 'Money Owed', value: summary ? summary.outstanding_payable : 0, color: 'var(--accent-red)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--bg-surface)', borderRadius: 16,
              padding: 'var(--space-4)', border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color }}>{formatNaira(value)}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Overdue alerts ───────────────────────────────────────── */}
      {(overdueLoans.length > 0 || overdueDebts.length > 0) && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
          borderLeft: '3px solid var(--accent-red)',
          borderRadius: 12, padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}>
          <AlertTriangle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-red)', fontWeight: 600 }}>
            {overdueLoans.length > 0 && `${overdueLoans.length} overdue loan${overdueLoans.length > 1 ? 's' : ''}`}
            {overdueLoans.length > 0 && overdueDebts.length > 0 && ' · '}
            {overdueDebts.length > 0 && `${overdueDebts.length} overdue debt${overdueDebts.length > 1 ? 's' : ''}`}
          </p>
        </motion.div>
      )}

      {/* ── Main tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)' }}>
        {([
          { key: 'loans_given' as MainTab, label: 'Loans I Gave Out', icon: ArrowUpRight, color: '#10B981' },
          { key: 'debts_owed'  as MainTab, label: 'Debts I Owe',      icon: ArrowDownLeft, color: '#EF4444' },
        ]).map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setMainTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 'var(--text-xs)', fontWeight: 700,
            background: mainTab === key ? color : 'var(--bg-elevated)',
            color: mainTab === key ? '#fff' : 'var(--text-secondary)',
            boxShadow: mainTab === key ? `0 2px 10px ${color}40` : 'none',
            transition: 'all 0.2s',
          }}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Sub tabs ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)' }}>
        {(['outstanding', 'settled'] as SubTab[]).map(t => {
          const count = mainTab === 'loans_given'
            ? (t === 'outstanding' ? loans.filter(l => !l.is_settled).length : loans.filter(l => l.is_settled).length)
            : (t === 'outstanding' ? debts.filter(d => !d.is_settled).length : debts.filter(d => d.is_settled).length);
          return (
            <button key={t} onClick={() => setSubTab(t)} style={{
              padding: '5px 14px', borderRadius: 20, border: '1px solid',
              cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
              background: subTab === t ? 'var(--bg-elevated)' : 'transparent',
              color: subTab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: subTab === t ? 'var(--border-default)' : 'transparent',
              transition: 'all 0.15s',
            }}>
              {t === 'outstanding' ? 'Outstanding' : 'Settled'} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Loans Given list ──────────────────────────────────────── */}
      {mainTab === 'loans_given' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {isLoading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)
          ) : shownLoans.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 'var(--space-10)',
              background: 'var(--bg-surface)', borderRadius: 20,
              border: '1px dashed var(--border-subtle)',
            }}>
              <ArrowUpRight size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 6 }}>
                {subTab === 'outstanding' ? 'No outstanding loans' : 'No settled loans yet'}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                {subTab === 'outstanding' ? 'When you lend money out, it will appear here.' : ''}
              </p>
              {subTab === 'outstanding' && (
                <button className="btn-primary" style={{ background: PURPLE }} onClick={() => setShowAddLoan(true)}>Record a Loan</button>
              )}
            </div>
          ) : shownLoans.map(loan => (
            <motion.div key={loan.id} variants={fadeUp} initial="initial" animate="animate"
              onClick={() => { if (!loan.is_settled) { setRepayTarget(loan); setRepayAmount(loan.outstanding); } }}
              style={{
                background: 'var(--bg-surface)', borderRadius: 16,
                padding: 'var(--space-4)', border: '1px solid var(--border-subtle)',
                cursor: loan.is_settled ? 'default' : 'pointer',
                transition: 'border-color 0.15s',
              }}
              whileHover={loan.is_settled ? {} : { borderColor: 'var(--border-default)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: loan.is_settled ? 'var(--accent-green-glow)' : PURPLE_GLOW,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowUpRight size={18} style={{ color: loan.is_settled ? 'var(--accent-green)' : PURPLE }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{loan.borrower_name}</p>
                      <OverdueChip dueDate={loan.due_date} isSettled={loan.is_settled} />
                      <DueSoonChip dueDate={loan.due_date} isSettled={loan.is_settled} />
                      {loan.is_settled && (
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
                          color: 'var(--accent-green)', background: 'var(--accent-green-glow)',
                          borderRadius: 20, padding: '2px 7px',
                        }}>Settled</span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {loan.purpose || 'No purpose noted'}
                      {loan.due_date ? ` · Due ${formatDate(loan.due_date)}` : ''}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)',
                    color: loan.is_settled ? 'var(--accent-green)' : PURPLE,
                  }}>
                    {formatNaira(loan.outstanding)}
                  </p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    of {formatNaira(loan.principal_amount)} lent
                  </p>
                </div>
              </div>
              {!loan.is_settled && loan.amount_repaid > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: `linear-gradient(90deg, ${PURPLE}, #7C3AED)`,
                      width: `${Math.min(100, (loan.amount_repaid / loan.principal_amount) * 100)}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                    {((loan.amount_repaid / loan.principal_amount) * 100).toFixed(0)}% recovered
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Debts Owed list ───────────────────────────────────────── */}
      {mainTab === 'debts_owed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {isLoading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)
          ) : shownDebts.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 'var(--space-10)',
              background: 'var(--bg-surface)', borderRadius: 20,
              border: '1px dashed var(--border-subtle)',
            }}>
              <ArrowDownLeft size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 6 }}>
                {subTab === 'outstanding' ? 'No outstanding debts' : 'No settled debts yet'}
              </p>
              {subTab === 'outstanding' && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)', fontWeight: 600 }}>
                  Debt-free! Keep it up.
                </p>
              )}
            </div>
          ) : shownDebts.map(debt => (
            <motion.div key={debt.id} variants={fadeUp} initial="initial" animate="animate"
              onClick={() => { if (!debt.is_settled) { setPayTarget(debt); setPayAmount(debt.outstanding); } }}
              style={{
                background: 'var(--bg-surface)', borderRadius: 16,
                padding: 'var(--space-4)', border: '1px solid var(--border-subtle)',
                cursor: debt.is_settled ? 'default' : 'pointer',
                transition: 'border-color 0.15s',
              }}
              whileHover={debt.is_settled ? {} : { borderColor: 'var(--border-default)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: debt.is_settled ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowDownLeft size={18} style={{ color: debt.is_settled ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{debt.creditor_name}</p>
                      <OverdueChip dueDate={debt.due_date} isSettled={debt.is_settled} />
                      <DueSoonChip dueDate={debt.due_date} isSettled={debt.is_settled} />
                      {debt.is_settled && (
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
                          color: 'var(--accent-green)', background: 'var(--accent-green-glow)',
                          borderRadius: 20, padding: '2px 7px',
                        }}>Settled</span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {debt.purpose || 'No purpose noted'}
                      {debt.due_date ? ` · Due ${formatDate(debt.due_date)}` : ''}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)',
                    color: debt.is_settled ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>
                    {formatNaira(debt.outstanding)}
                  </p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    of {formatNaira(debt.principal_amount)} borrowed
                  </p>
                </div>
              </div>
              {!debt.is_settled && debt.amount_repaid > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: 'linear-gradient(90deg, var(--accent-red), #DC2626)',
                      width: `${Math.min(100, (debt.amount_repaid / debt.principal_amount) * 100)}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                    {((debt.amount_repaid / debt.principal_amount) * 100).toFixed(0)}% repaid
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Food vendor credit note ───────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
        borderLeft: '3px solid var(--accent-amber)',
        borderRadius: 12, padding: 'var(--space-3) var(--space-4)',
        marginTop: 'var(--space-5)',
      }}>
        <Utensils size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', fontWeight: 500 }}>
          Food vendor credits (unpaid meals) are included in your total personal debt on the Planning page.
        </p>
      </motion.div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
        {mainTab === 'loans_given'
          ? 'Repayments received are NOT income — they do not affect your profit or tithe.'
          : 'Debt payments are automatically recorded as personal expenses.'}
      </p>

      {/* ─────────────── MODALS ──────────────────────────────────── */}

      {/* Add loan modal */}
      <Modal isOpen={showAddLoan} onClose={() => setShowAddLoan(false)} title="Record Loan Given"
        footer={<>
          <button className="btn-ghost" onClick={() => setShowAddLoan(false)}>Cancel</button>
          <button className="btn-primary" form="add-loan-form" type="submit" disabled={loading}
            style={{ background: PURPLE }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Record Loan
          </button>
        </>}
      >
        <form id="add-loan-form" onSubmit={handleAddLoan}>
          <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: PURPLE_GLOW, borderRadius: 10, border: `1px solid ${PURPLE}25` }}>
            <p style={{ fontSize: 'var(--text-xs)', color: PURPLE, fontWeight: 600 }}>
              This money leaves your wallet but is NOT an expense. When repaid, it returns as cash — no tithe triggered.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Borrower Name *</label>
            <input className="input" required value={loanForm.borrower_name}
              onChange={e => setLoanForm(f => ({ ...f, borrower_name: e.target.value }))}
              placeholder="e.g. Mama, Tunde" />
          </div>
          <div className="form-group">
            <CurrencyInput label="Amount Lent *" value={loanForm.principal_amount}
              onChange={v => setLoanForm(f => ({ ...f, principal_amount: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input className="input" value={loanForm.purpose}
              onChange={e => setLoanForm(f => ({ ...f, purpose: e.target.value }))}
              placeholder="e.g. School fees, emergency" />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Repayment Date</label>
            <input type="date" className="input" value={loanForm.due_date}
              onChange={e => setLoanForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="input" value={loanForm.notes}
              onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes" />
          </div>
        </form>
      </Modal>

      {/* Repayment modal */}
      <Modal isOpen={!!repayTarget} onClose={() => setRepayTarget(null)}
        title={`Repayment from ${repayTarget?.borrower_name}`}
        footer={<>
          <button className="btn-ghost" onClick={() => setRepayTarget(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleRepayLoan} disabled={loading || repayAmount <= 0}
            style={{ background: PURPLE }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Record Repayment
          </button>
        </>}
      >
        {repayTarget && (
          <>
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-overlay)', borderRadius: 12 }}>
              {[
                ['Original Loan', formatNaira(repayTarget.principal_amount), 'var(--text-secondary)'],
                ['Total Repaid', formatNaira(repayTarget.amount_repaid), 'var(--accent-green)'],
                ['Still Outstanding', formatNaira(repayTarget.outstanding), 'var(--accent-amber)'],
              ].map(([l, v, c]) => (
                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: c as string }}>{v}</span>
                </div>
              ))}
            </div>
            <CurrencyInput label="Amount Repaid Now" value={repayAmount} onChange={setRepayAmount} />
            {repayAmount >= repayTarget.outstanding && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10, padding: 'var(--space-3)', marginTop: 'var(--space-3)',
                fontSize: 'var(--text-xs)', color: 'var(--accent-green)',
              }}>
                <CheckCircle size={13} />
                This will fully settle the loan.
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Add debt modal */}
      <Modal isOpen={showAddDebt} onClose={() => setShowAddDebt(false)} title="Record Debt I Owe"
        footer={<>
          <button className="btn-ghost" onClick={() => setShowAddDebt(false)}>Cancel</button>
          <button className="btn-primary" form="add-debt-form" type="submit" disabled={loading}
            style={{ background: PURPLE }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Record Debt
          </button>
        </>}
      >
        <form id="add-debt-form" onSubmit={handleAddDebt}>
          <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(239,68,68,0.07)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-red)', fontWeight: 600 }}>
              This money enters your wallet as a loan — NOT income. When you repay it, the payment is recorded as a personal expense.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Creditor Name *</label>
            <input className="input" required value={debtForm.creditor_name}
              onChange={e => setDebtForm(f => ({ ...f, creditor_name: e.target.value }))}
              placeholder="e.g. Bank, Mum, Friend" />
          </div>
          <div className="form-group">
            <CurrencyInput label="Amount Borrowed *" value={debtForm.principal_amount}
              onChange={v => setDebtForm(f => ({ ...f, principal_amount: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input className="input" value={debtForm.purpose}
              onChange={e => setDebtForm(f => ({ ...f, purpose: e.target.value }))}
              placeholder="e.g. Rent, school fees" />
          </div>
          <div className="form-group">
            <label className="form-label">Repayment Due Date</label>
            <input type="date" className="input" value={debtForm.due_date}
              onChange={e => setDebtForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="input" value={debtForm.notes}
              onChange={e => setDebtForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes" />
          </div>
        </form>
      </Modal>

      {/* Pay debt modal */}
      <Modal isOpen={!!payTarget} onClose={() => setPayTarget(null)}
        title={`Pay Debt to ${payTarget?.creditor_name}`}
        footer={<>
          <button className="btn-ghost" onClick={() => setPayTarget(null)}>Cancel</button>
          <button className="btn-primary" onClick={handlePayDebt} disabled={loading || payAmount <= 0}
            style={{ background: PURPLE }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Record Payment
          </button>
        </>}
      >
        {payTarget && (
          <>
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-overlay)', borderRadius: 12 }}>
              {[
                ['Original Debt', formatNaira(payTarget.principal_amount), 'var(--text-secondary)'],
                ['Amount Repaid', formatNaira(payTarget.amount_repaid), 'var(--accent-green)'],
                ['Still Owe', formatNaira(payTarget.outstanding), 'var(--accent-red)'],
              ].map(([l, v, c]) => (
                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: c as string }}>{v}</span>
                </div>
              ))}
            </div>
            <CurrencyInput label="Amount Paying Now" value={payAmount} onChange={setPayAmount} />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
              This payment will be recorded as a personal expense.
            </p>
            {payAmount >= payTarget.outstanding && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10, padding: 'var(--space-3)', marginTop: 'var(--space-2)',
                fontSize: 'var(--text-xs)', color: 'var(--accent-green)',
              }}>
                <CheckCircle size={13} />
                This will fully settle the debt!
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Opening balance modal */}
      <Modal isOpen={showOpeningBalance} onClose={() => setShowOpeningBalance(false)} title="Set Personal Opening Balance"
        footer={<>
          <button className="btn-ghost" onClick={() => setShowOpeningBalance(false)}>Cancel</button>
          <button className="btn-primary" form="ob-form" type="submit" disabled={loading}
            style={{ background: PURPLE }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Confirm
          </button>
        </>}
      >
        <form id="ob-form" onSubmit={handleSetOpeningBalance}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Enter how much personal cash you currently have. Every personal income, expense, loan, and debt payment will be tracked against this balance.
          </p>
          <CurrencyInput label="Current Personal Cash Balance" value={obAmount} onChange={setObAmount} />
        </form>
      </Modal>
    </div>
  );
}
