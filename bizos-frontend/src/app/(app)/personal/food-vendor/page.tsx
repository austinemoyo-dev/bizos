'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { foodVendorApi, FoodVendorAnalytics } from '@/lib/api/food-vendor';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { FoodVendorForm } from '@/components/personal/FoodVendorForm';
import { FoodVendorOverview } from '@/components/personal/FoodVendorOverview';
import { FoodVendorAnalyticsTab } from '@/components/personal/FoodVendorAnalyticsTab';
import { FoodVendorInsights } from '@/components/personal/FoodVendorInsights';
import { FoodVendorCreditList } from '@/components/personal/FoodVendorCreditList';
import { FoodVendorVendorPanel } from '@/components/personal/FoodVendorVendorPanel';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { FoodCredit, FoodCreditCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { useFoodBudget } from '@/lib/hooks/useFoodBudget';
import { useFoodPaymentCache } from '@/lib/hooks/useFoodPaymentCache';
import { Plus, Utensils, Loader2, LayoutGrid, BarChart3, Lightbulb, List } from 'lucide-react';
import { startOfMonth, format } from 'date-fns';

// ── Tab definitions ────────────────────────────────────────────────
type Tab = 'overview' | 'analytics' | 'insights' | 'credits';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',  label: 'Overview',  icon: LayoutGrid  },
  { key: 'analytics', label: 'Analytics', icon: BarChart3   },
  { key: 'insights',  label: 'Insights',  icon: Lightbulb   },
  { key: 'credits',   label: 'Credits',   icon: List        },
];

const TAB_ORDER: Tab[] = ['overview', 'analytics', 'insights', 'credits'];

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['food-credits'] });
  qc.invalidateQueries({ queryKey: ['food-analytics'] });
  qc.invalidateQueries({ queryKey: ['food-vendors'] });
  qc.invalidateQueries({ queryKey: ['food-payments'] });
  qc.invalidateQueries({ queryKey: ['food-trend'] });
};

export default function FoodVendorPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const { budget, saveBudget, limits, setLimit, getLimit } = useFoodBudget();
  const { storePayment, getPaymentDetail } = useFoodPaymentCache();

  // ── Tab state ──────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('overview');
  const [dir, setDir] = useState(0);

  const searchParams = useSearchParams();
  useEffect(() => { if (searchParams.get('new') === '1') setShowAdd(true); }, [searchParams]);

  // ── Modal state ────────────────────────────────────────────────
  const [showAdd,      setShowAdd]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [editCredit,   setEditCredit]   = useState<FoodCredit | null>(null);
  const [showBudget,   setShowBudget]   = useState(false);
  const [budgetInput,  setBudgetInput]  = useState(budget);
  const [vendorPanel,  setVendorPanel]  = useState<string | null>(null);

  // Pay-all loading
  const [paying, setPaying] = useState(false);

  // ── Data queries ───────────────────────────────────────────────
  const { data: unpaid = [] } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn:  () => foodVendorApi.credits.list({ paid: false }),
  });

  const { data: allCredits = [] } = useQuery({
    queryKey: ['food-credits', 'all'],
    queryFn:  () => foodVendorApi.credits.listAll(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['food-payments'],
    queryFn:  () => foodVendorApi.payments(),
  });

  const { data: analytics } = useQuery<FoodVendorAnalytics>({
    queryKey: ['food-analytics'],
    queryFn:  () => foodVendorApi.analytics(),
  });

  const { data: trend = [], isLoading: loadingTrend } = useQuery({
    queryKey: ['food-trend'],
    queryFn:  () => foodVendorApi.trend(30),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['food-vendors'],
    queryFn:  () => foodVendorApi.vendorBreakdown(),
  });

  // ── Derived values ─────────────────────────────────────────────
  const allVendorNames = useMemo(
    () => Array.from(new Set(allCredits.map((c) => c.vendor_name))).sort(),
    [allCredits],
  );

  // Monthly spent = sum of all credits in current month
  const monthlySpent = useMemo(() => {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    return allCredits
      .filter((c) => c.purchase_date >= monthStart)
      .reduce((s, c) => s + Number(c.amount), 0);
  }, [allCredits]);

  // ── Tab change ─────────────────────────────────────────────────
  const handleTabChange = (next: Tab) => {
    const oldIdx = TAB_ORDER.indexOf(tab);
    const newIdx = TAB_ORDER.indexOf(next);
    setDir(newIdx > oldIdx ? 1 : -1);
    setTab(next);
  };

  // ── Pay helpers ────────────────────────────────────────────────
  const runPay = async (creditIds: string[], vendorLabel: string, creditsBeingPaid: FoodCredit[]) => {
    setPaying(true);
    try {
      const payment = await foodVendorApi.pay(creditIds, vendorLabel);
      // Store receipt detail for breakdown view
      storePayment(payment.id, vendorLabel, creditsBeingPaid);
      invalidateAll(qc);
      addToast({ type: 'success', title: 'Credits paid', message: 'Personal expense recorded.' });
      setShowConfirm(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Payment failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setPaying(false);
    }
  };

  const handlePayAll = () => runPay(
    unpaid.map((c) => c.id),
    Array.from(new Set(unpaid.map((c) => c.vendor_name))).join(', '),
    unpaid,
  );

  const handlePayVendor = (vendorName: string, creditIds: string[]) => {
    const creditsForVendor = unpaid.filter((c) => creditIds.includes(c.id));
    runPay(creditIds, vendorName, creditsForVendor);
  };

  const handlePaySelected = (ids: string[]) => {
    const creditsSelected = unpaid.filter((c) => ids.includes(c.id));
    const vendorLabel = Array.from(new Set(creditsSelected.map((c) => c.vendor_name))).join(', ');
    runPay(ids, vendorLabel, creditsSelected);
  };

  // ── CRUD handlers ──────────────────────────────────────────────
  const handleCreate = async (data: FoodCreditCreate) => {
    await foodVendorApi.credits.create(data);
    invalidateAll(qc);
    addToast({ type: 'success', title: 'Meal recorded' });
    setShowAdd(false);
  };

  const handleUpdate = async (data: FoodCreditCreate) => {
    if (!editCredit) return;
    await foodVendorApi.credits.update(editCredit.id, data);
    invalidateAll(qc);
    addToast({ type: 'success', title: 'Meal updated' });
    setEditCredit(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await foodVendorApi.credits.delete(id);
      invalidateAll(qc);
      addToast({ type: 'success', title: 'Credit deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err instanceof Error ? err.message : '' });
    }
  };

  // ── Budget modal ───────────────────────────────────────────────
  const handleOpenBudget = () => {
    setBudgetInput(budget);
    setShowBudget(true);
  };

  const handleSaveBudget = () => {
    saveBudget(budgetInput);
    addToast({ type: 'success', title: 'Budget saved' });
    setShowBudget(false);
  };

  return (
    <div>
      <PageHeader
        title="Food Vendor"
        subtitle="Track meals on credit"
        icon={Utensils}
        accentColor="#F59E0B"
        accentGlow="rgba(245,158,11,0.12)"
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Record Meal
          </button>
        }
      />

      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 'var(--space-5)',
        background: 'var(--glass-bg-light)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 50,
        padding: 4,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {TABS.map((t) => {
          const Icon   = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '8px 12px',
                borderRadius: 50, border: 'none', cursor: 'pointer',
                fontSize: 'var(--text-xs)', fontWeight: active ? 700 : 500,
                background: active ? '#F59E0B' : 'transparent',
                color: active ? '#000' : 'var(--text-secondary)',
                boxShadow: active ? '0 2px 10px rgba(245,158,11,0.4)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Icon size={13} strokeWidth={active ? 2.5 : 2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      <div style={{ overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={tab}
            custom={dir}
            initial={{ opacity: 0, x: dir * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -32 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === 'overview' && (
              <FoodVendorOverview
                unpaid={unpaid}
                payments={payments}
                analytics={analytics}
                vendors={vendors}
                onMarkPaid={() => setShowConfirm(true)}
                budget={budget}
                monthlySpent={monthlySpent}
                onSetBudget={handleOpenBudget}
                onPayVendor={handlePayVendor}
                onDeleteCredit={handleDelete}
                onEditCredit={(c) => setEditCredit(c)}
                onPaySelected={handlePaySelected}
                onVendorClick={(name) => setVendorPanel(name)}
                limits={limits}
                getPaymentDetail={getPaymentDetail}
              />
            )}
            {tab === 'analytics' && (
              <FoodVendorAnalyticsTab
                trend={trend}
                vendors={vendors}
                loading={loadingTrend}
              />
            )}
            {tab === 'insights' && (
              <FoodVendorInsights
                analytics={analytics}
                trend={trend}
                vendors={vendors}
                payments={payments}
              />
            )}
            {tab === 'credits' && (
              <FoodVendorCreditList
                allCredits={allCredits}
                allVendorNames={allVendorNames}
                onEdit={(c) => setEditCredit(c)}
                onDelete={handleDelete}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Record Meal modal ─────────────────────────────────── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Meal" accentColor="#F59E0B">
        <FoodVendorForm
          allVendors={allVendorNames}
          allCredits={allCredits}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {/* ── Edit Meal modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!editCredit}
        onClose={() => setEditCredit(null)}
        title="Edit Meal"
        accentColor="#F59E0B"
      >
        {editCredit && (
          <FoodVendorForm
            allVendors={allVendorNames}
            allCredits={allCredits}
            initialValues={{
              vendor_name:      editCredit.vendor_name,
              purchase_date:    editCredit.purchase_date,
              meal_description: editCredit.meal_description,
              amount:           Number(editCredit.amount),
              meal_type:        editCredit.meal_type,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditCredit(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* ── Pay all confirmation modal ────────────────────────── */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Mark All Paid"
        accentColor="#F59E0B"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
            <button className="btn-primary" onClick={handlePayAll} disabled={paying}>
              {paying && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Confirm Payment
            </button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          This will mark all{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{unpaid.length}</strong>{' '}
          unpaid credits as paid and create a personal food expense.
        </p>
      </Modal>

      {/* ── Set Budget modal ──────────────────────────────────── */}
      <Modal
        isOpen={showBudget}
        onClose={() => setShowBudget(false)}
        title="Monthly Food Budget"
        accentColor="#F59E0B"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowBudget(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveBudget}>Save Budget</button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
          Set a monthly spending target for food. You'll see a progress bar in the overview as you spend.
        </p>
        <CurrencyInput
          label="Monthly Budget"
          value={budgetInput}
          onChange={setBudgetInput}
          placeholder="e.g. 30000"
        />
        {budgetInput > 0 && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
            That's ≈ {Math.round(budgetInput / 30).toLocaleString()} per day this month.
          </p>
        )}
      </Modal>

      {/* ── Vendor detail panel ───────────────────────────────── */}
      <FoodVendorVendorPanel
        isOpen={!!vendorPanel}
        vendorName={vendorPanel ?? ''}
        credits={allCredits}
        payments={payments}
        limit={vendorPanel ? getLimit(vendorPanel) : 0}
        onSetLimit={(lim) => vendorPanel && setLimit(vendorPanel, lim)}
        onClose={() => setVendorPanel(null)}
        onPayVendor={handlePayVendor}
      />
    </div>
  );
}
