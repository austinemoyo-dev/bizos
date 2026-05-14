'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { foodVendorApi, FoodVendorAnalytics } from '@/lib/api/food-vendor';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { FoodVendorForm } from '@/components/personal/FoodVendorForm';
import { FoodVendorOverview } from '@/components/personal/FoodVendorOverview';
import { FoodVendorAnalyticsTab } from '@/components/personal/FoodVendorAnalyticsTab';
import { FoodVendorInsights } from '@/components/personal/FoodVendorInsights';
import { FoodCreditCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { Plus, Utensils, Loader2, LayoutGrid, BarChart3, Lightbulb } from 'lucide-react';

// ── Tab definitions ────────────────────────────────────────────────
type Tab = 'overview' | 'analytics' | 'insights';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',  label: 'Overview',  icon: LayoutGrid  },
  { key: 'analytics', label: 'Analytics', icon: BarChart3   },
  { key: 'insights',  label: 'Insights',  icon: Lightbulb   },
];

const TAB_ORDER: Tab[] = ['overview', 'analytics', 'insights'];

export default function FoodVendorPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const [tab, setTab]       = useState<Tab>('overview');
  const [dir, setDir]       = useState(0);          // slide direction: +1 right, -1 left
  const [showAdd, setShowAdd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paying, setPaying]           = useState(false);

  // ── Data fetching ──────────────────────────────────────────────
  const { data: unpaid = [] } = useQuery({
    queryKey: ['food-credits', 'unpaid'],
    queryFn:  () => foodVendorApi.credits.list({ paid: false }),
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

  // ── Handlers ──────────────────────────────────────────────────
  const handleTabChange = (next: Tab) => {
    const oldIdx = TAB_ORDER.indexOf(tab);
    const newIdx = TAB_ORDER.indexOf(next);
    setDir(newIdx > oldIdx ? 1 : -1);
    setTab(next);
  };

  const handleCreate = async (data: FoodCreditCreate) => {
    await foodVendorApi.credits.create(data);
    qc.invalidateQueries({ queryKey: ['food-credits'] });
    qc.invalidateQueries({ queryKey: ['food-analytics'] });
    qc.invalidateQueries({ queryKey: ['food-vendors'] });
    addToast({ type: 'success', title: 'Meal recorded' });
    setShowAdd(false);
  };

  const handlePayAll = async () => {
    if (!unpaid.length) return;
    setPaying(true);
    try {
      const vendorNames = Array.from(new Set(unpaid.map(c => c.vendor_name)));
      const label = vendorNames.length === 1 ? vendorNames[0] : vendorNames.join(', ');
      await foodVendorApi.pay(unpaid.map(c => c.id), label);
      qc.invalidateQueries({ queryKey: ['food-credits'] });
      qc.invalidateQueries({ queryKey: ['food-payments'] });
      qc.invalidateQueries({ queryKey: ['food-analytics'] });
      qc.invalidateQueries({ queryKey: ['food-vendors'] });
      addToast({ type: 'success', title: 'All credits paid', message: 'Personal expense recorded.' });
      setShowConfirm(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Payment failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setPaying(false);
    }
  };

  const recentVendors = Array.from(new Set(unpaid.map(c => c.vendor_name)));

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
      }}>
        {TABS.map((t) => {
          const Icon = t.icon;
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
              }}
            >
              <Icon size={13} strokeWidth={active ? 2.5 : 2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content with directional slide animation ──────── */}
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Record Meal modal ─────────────────────────────────── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Meal" accentColor="#F59E0B">
        <FoodVendorForm
          recentVendors={recentVendors}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
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
    </div>
  );
}
