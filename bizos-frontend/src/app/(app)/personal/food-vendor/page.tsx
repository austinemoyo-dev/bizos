'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { foodVendorApi } from '@/lib/api/food-vendor';
import { Modal } from '@/components/shared/Modal';
import { FoodVendorForm } from '@/components/personal/FoodVendorForm';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { FoodCredit, FoodCreditCreate } from '@/types/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { useFoodBudget } from '@/lib/hooks/useFoodBudget';
import { useFoodPaymentCache } from '@/lib/hooks/useFoodPaymentCache';
import {
  Plus, Coffee, Utensils, Moon, Apple, CheckCircle2,
  Sparkles, X, ChevronRight, Loader2, Target, TrendingUp,
} from 'lucide-react';
import { format, startOfMonth, subDays, addDays } from 'date-fns';

// ── Design tokens ──────────────────────────────────────────────────────────────
const G  = '#A4CF56';          // primary lime-green
const GB = 'rgba(164,207,86,0.14)';

// ── Meal type config ───────────────────────────────────────────────────────────
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_META: Record<MealType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee,   color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  lunch:     { label: 'Lunch',     icon: Utensils, color: '#EAB308', bg: 'rgba(234,179,8,0.12)'  },
  dinner:    { label: 'Dinner',    icon: Moon,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  snack:     { label: 'Snack',     icon: Apple,    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

// ── Arc Gauge ─────────────────────────────────────────────────────────────────
function ArcGauge({ spent, budget, credits, paid }: {
  spent: number; budget: number; credits: number; paid: number;
}) {
  const W = 260, H = 148;
  const cx = W / 2, cy = H;
  const r  = 104;
  const halfCircum = Math.PI * r;
  const pct        = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const dashOffset = halfCircum * (1 - pct);
  const arcPath    = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  const statusColor = pct >= 1 ? '#EF4444' : pct >= 0.75 ? '#F59E0B' : G;

  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      <svg width={W} height={H} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
        {/* Track */}
        <path d={arcPath} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={13} strokeLinecap="round" />
        {/* Progress */}
        <path
          d={arcPath} fill="none"
          stroke={statusColor} strokeWidth={13} strokeLinecap="round"
          strokeDasharray={halfCircum}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        {/* Percentage text */}
        <text
          x={cx} y={cy - 36}
          textAnchor="middle" dominantBaseline="middle"
          fill={statusColor}
          style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
        >
          {budget > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </text>
        <text x={cx} y={cy - 14} textAnchor="middle" fill="rgba(0,0,0,0.4)"
          style={{ fontSize: '0.62rem', fontWeight: 600 }}>
          {budget > 0 ? 'of daily budget' : 'no budget set'}
        </text>
      </svg>

      {/* Bottom stat row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: -8, padding: '0 8px',
      }}>
        {[
          { label: 'Credits',  value: credits,    color: '#EF4444' },
          { label: 'Spent',    value: spent,      color: statusColor },
          { label: 'Paid',     value: paid,       color: G          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800,
              color, lineHeight: 1, marginBottom: 3,
            }}>
              {value >= 1000
                ? `₦${(value / 1000).toFixed(1)}k`
                : `₦${value}`}
            </p>
            <p style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.45)', fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calendar Strip ────────────────────────────────────────────────────────────
function CalendarStrip({ selected, onSelect }: {
  selected: string; onSelect: (d: string) => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 3 - i);
    return { date: format(d, 'yyyy-MM-dd'), dayLetter: format(d, 'EEEEE'), dayNum: format(d, 'd') };
  });

  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
      {days.map(({ date, dayLetter, dayNum }) => {
        const isSelected = date === selected;
        const isToday    = date === today;
        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 5, padding: '8px 4px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: isSelected ? '#1A1A1A' : 'transparent',
              transition: 'all 0.18s',
            }}
          >
            <span style={{
              fontSize: '0.6rem', fontWeight: 600,
              color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)',
              textTransform: 'uppercase',
            }}>
              {dayLetter}
            </span>
            <span style={{
              fontSize: '0.9rem', fontWeight: 800, lineHeight: 1,
              color: isSelected ? '#fff' : isToday ? G : 'rgba(0,0,0,0.8)',
            }}>
              {dayNum}
            </span>
            {isToday && !isSelected && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: G }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── AI Doctor streaming sheet ──────────────────────────────────────────────────
function AIDoctorSheet({ open, onClose, payload }: {
  open: boolean;
  onClose: () => void;
  payload: object;
}) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fetched = useRef(false);

  useEffect(() => {
    if (!open || fetched.current) return;
    fetched.current = true;

    const run = async () => {
      setLoading(true);
      setError('');
      setText('');
      try {
        const res = await fetch('/api/food-doctor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(typeof window !== 'undefined' ? localStorage.getItem('access_token') : null) ?? 'local'}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { setError('AI unavailable. Check GROQ_API_KEY.'); return; }
        const reader = res.body!.getReader();
        const dec    = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setText((p) => p + dec.decode(value, { stream: true }));
        }
      } catch {
        setError('Failed to reach AI. Try again.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [open, payload]);

  // Reset on close so next open re-fetches
  const handleClose = () => { fetched.current = false; setText(''); onClose(); };

  // Parse sections from markdown response
  const sections = text.split(/^## /m).filter(Boolean).map((s) => {
    const [heading, ...rest] = s.split('\n');
    return { heading: heading.trim(), body: rest.join('\n').trim() };
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="doc-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          />
          <motion.div
            key="doc-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
              background: '#fff', borderRadius: '28px 28px 0 0',
              maxHeight: '88dvh', overflowY: 'auto',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 16px', borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: GB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} style={{ color: G }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A1A1A' }}>Food Doctor AI</p>
                  <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>Personalized health insights</p>
                </div>
              </div>
              <button onClick={handleClose} style={{ width: 34, height: 34, borderRadius: 11, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} style={{ color: '#6B7280' }} />
              </button>
            </div>

            <div style={{ padding: '0 20px' }}>
              {loading && !text && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 20, background: GB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={26} style={{ color: G, animation: 'spin 1s linear infinite' }} />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 500 }}>Analysing your food patterns…</p>
                </div>
              )}

              {error && (
                <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}

              {/* Streamed sections */}
              {sections.map(({ heading, body }, i) => {
                const isScore     = heading.toLowerCase().includes('health score');
                const isPrediction= heading.toLowerCase().includes('prediction');
                const isTreatment = heading.toLowerCase().includes('treatment');

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.06 }}
                    style={{
                      marginBottom: 16, padding: '14px 16px', borderRadius: 18,
                      background: isPrediction ? GB : isTreatment ? 'rgba(139,92,246,0.07)' : '#F9FAFB',
                      border: `1px solid ${isPrediction ? 'rgba(164,207,86,0.3)' : '#F3F4F6'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 10,
                        background: isPrediction ? G : isTreatment ? '#8B5CF6' : '#1A1A1A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isPrediction
                          ? <TrendingUp size={14} color="#fff" />
                          : isTreatment
                            ? <Target size={14} color="#fff" />
                            : <Sparkles size={14} color="#fff" />
                        }
                      </div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {heading}
                      </p>
                      {isScore && body.match(/\d+\/10/) && (
                        <span style={{
                          marginLeft: 'auto', padding: '2px 10px', borderRadius: 20,
                          background: G, fontSize: '0.7rem', fontWeight: 800, color: '#fff',
                        }}>
                          {body.match(/\d+\/10/)?.[0]}
                        </span>
                      )}
                    </div>
                    {body.split('\n').filter(Boolean).map((line, j) => (
                      <p key={j} style={{
                        fontSize: '0.78rem', lineHeight: 1.65,
                        color: '#374151', marginBottom: 4,
                        paddingLeft: (line.startsWith('-') || line.match(/^\d+\./)) ? 0 : 0,
                      }}>
                        {line}
                      </p>
                    ))}
                  </motion.div>
                );
              })}

              {/* Inline streamed text before sections are complete */}
              {loading && text && sections.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['food-credits'] });
  qc.invalidateQueries({ queryKey: ['food-analytics'] });
  qc.invalidateQueries({ queryKey: ['food-vendors'] });
  qc.invalidateQueries({ queryKey: ['food-payments'] });
  qc.invalidateQueries({ queryKey: ['food-trend'] });
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FoodVendorPage() {
  const { addToast }                  = useUIStore();
  const qc                            = useQueryClient();
  const { budget, saveBudget }        = useFoodBudget();
  const { storePayment }              = useFoodPaymentCache();

  const searchParams = useSearchParams();

  // ── UI state ───────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDoctor,   setShowDoctor]   = useState(false);
  const [showAdd,      setShowAdd]      = useState(false);
  const [editCredit,   setEditCredit]   = useState<FoodCredit | null>(null);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showBudget,   setShowBudget]   = useState(false);
  const [budgetInput,  setBudgetInput]  = useState(budget);
  const [paying,       setPaying]       = useState(false);

  useEffect(() => { if (searchParams.get('new') === '1') setShowAdd(true); }, [searchParams]);

  // ── Queries ────────────────────────────────────────────────────
  const { data: unpaid    = [] } = useQuery({ queryKey: ['food-credits','unpaid'],  queryFn: () => foodVendorApi.credits.list({ paid: false }) });
  const { data: allCredits= [] } = useQuery({ queryKey: ['food-credits','all'],     queryFn: () => foodVendorApi.credits.listAll() });
  const { data: payments  = [] } = useQuery({ queryKey: ['food-payments'],          queryFn: () => foodVendorApi.payments() });
  const { data: analytics }      = useQuery({ queryKey: ['food-analytics'],         queryFn: () => foodVendorApi.analytics() });
  const { data: trend     = [] } = useQuery({ queryKey: ['food-trend'],             queryFn: () => foodVendorApi.trend(30) });
  const { data: vendors   = [] } = useQuery({ queryKey: ['food-vendors'],           queryFn: () => foodVendorApi.vendorBreakdown() });

  // ── Derived values ─────────────────────────────────────────────
  const dailyBudget = budget > 0 ? Math.round(budget / 30) : 0;

  const dayCredits = useMemo(
    () => allCredits.filter((c) => c.purchase_date === selectedDate),
    [allCredits, selectedDate],
  );

  const daySpent   = useMemo(() => dayCredits.reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);
  const dayCredAmt = useMemo(() => dayCredits.filter((c) => !c.paid).reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);
  const dayPaid    = useMemo(() => dayCredits.filter((c) => c.paid).reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);

  const byType = useMemo(() => {
    const map: Record<MealType, FoodCredit[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    dayCredits.forEach((c) => {
      const t = (c.meal_type ?? 'snack') as MealType;
      (map[t] ??= []).push(c);
    });
    return map;
  }, [dayCredits]);

  const monthlySpent = useMemo(() => {
    const ms = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    return allCredits.filter((c) => c.purchase_date >= ms).reduce((s, c) => s + Number(c.amount), 0);
  }, [allCredits]);

  // AI doctor payload
  const doctorPayload = useMemo(() => ({
    credits: allCredits,
    analytics,
    vendors,
    trend,
    budget,
    monthlySpent,
  }), [allCredits, analytics, vendors, trend, budget, monthlySpent]);

  // ── Handlers ───────────────────────────────────────────────────
  const runPay = async (creditIds: string[], label: string, creds: FoodCredit[]) => {
    setPaying(true);
    try {
      const payment = await foodVendorApi.pay(creditIds, label);
      storePayment(payment.id, label, creds);
      invalidateAll(qc);
      addToast({ type: 'success', title: 'Credits paid', message: 'Personal expense recorded.' });
      setShowConfirm(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Payment failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setPaying(false);
    }
  };

  const handlePayAll = () => runPay(unpaid.map((c) => c.id), unpaid.map((c) => c.vendor_name).filter((v, i, a) => a.indexOf(v) === i).join(', '), unpaid);

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

  const handleSaveBudget = () => {
    saveBudget(budgetInput);
    addToast({ type: 'success', title: 'Budget saved' });
    setShowBudget(false);
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = selectedDate === today;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', minWidth: 0, paddingBottom: 100 }}>

      {/* ── Light background ──────────────────────────────────── */}
      <style>{`
        .food-page { background: #F7F8FA; }
        @keyframes docSpin { to { transform: rotate(360deg); } }
        .doc-spin { animation: docSpin 1s linear infinite; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <p style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600, marginBottom: 2 }}>
          {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMM')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 'clamp(1.3rem,5vw,1.6rem)', fontWeight: 800, color: '#1A1A1A', lineHeight: 1.1 }}>
            {isToday ? 'Today\'s Meals' : 'Meal History'}
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setBudgetInput(budget); setShowBudget(true); }}
              style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.68rem', fontWeight: 700, color: '#1A1A1A', cursor: 'pointer' }}
            >
              Budget
            </button>
            {unpaid.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                style={{ padding: '7px 14px', borderRadius: 20, border: 'none', background: '#1A1A1A', fontSize: '0.68rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                Pay All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Calendar strip ─────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '14px 12px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <CalendarStrip selected={selectedDate} onSelect={setSelectedDate} />
      </div>

      {/* ── Spending gauge card ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ background: '#fff', borderRadius: 24, padding: '20px 16px 16px', marginBottom: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
      >
        <ArcGauge spent={daySpent} budget={dailyBudget} credits={dayCredAmt} paid={dayPaid} />
      </motion.div>

      {/* ── Meal type breakdown ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {(Object.entries(MEAL_META) as [MealType, typeof MEAL_META[MealType]][]).map(([type, meta]) => {
          const Icon  = meta.icon;
          const items = byType[type] ?? [];
          const total = items.reduce((s, c) => s + Number(c.amount), 0);
          return (
            <div key={type} style={{
              background: '#fff', borderRadius: 18, padding: '12px 14px',
              boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 13, flexShrink: 0,
                background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={17} style={{ color: meta.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  {meta.label}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800, color: '#1A1A1A', lineHeight: 1 }}>
                  {total > 0 ? `₦${total.toLocaleString()}` : '—'}
                </p>
                <p style={{ fontSize: '0.58rem', color: 'rgba(0,0,0,0.35)', marginTop: 1 }}>
                  {items.length} meal{items.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Ask Food Doctor CTA ─────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowDoctor(true)}
        style={{
          width: '100%', padding: '15px 20px', borderRadius: 18,
          background: `linear-gradient(135deg, ${G} 0%, #8CC63F 100%)`,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 20,
          boxShadow: '0 4px 18px rgba(164,207,86,0.4)',
        }}
      >
        <Sparkles size={18} style={{ color: '#fff' }} />
        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>Ask My Food Doctor</span>
        <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 'auto' }} />
      </motion.button>

      {/* ── Today Meals list ────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1A1A1A' }}>
            {isToday ? 'Today\'s Meals' : `Meals on ${format(new Date(selectedDate + 'T00:00:00'), 'd MMM')}`}
          </h2>
          <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>
            {dayCredits.length} item{dayCredits.length !== 1 ? 's' : ''}
          </span>
        </div>

        {dayCredits.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', background: '#fff', borderRadius: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: GB, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Utensils size={22} style={{ color: G }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>No meals recorded for this day</p>
            <button
              onClick={() => setShowAdd(true)}
              style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, border: 'none', background: G, color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Record Meal
            </button>
          </div>
        )}

        <AnimatePresence>
          {dayCredits.map((credit, i) => {
            const mtype = (credit.meal_type ?? 'snack') as MealType;
            const meta  = MEAL_META[mtype];
            const Icon  = meta.icon;
            return (
              <motion.div
                key={credit.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 14px', borderRadius: 18, marginBottom: 10,
                  background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 15, flexShrink: 0,
                  background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={19} style={{ color: meta.color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {credit.meal_description ?? credit.vendor_name}
                  </p>
                  <p style={{ fontSize: '0.62rem', color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>
                    {credit.vendor_name} · {meta.label}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800, color: '#1A1A1A' }}>
                    ₦{Number(credit.amount).toLocaleString()}
                  </span>
                  {credit.paid
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6rem', color: G, fontWeight: 700 }}>
                        <CheckCircle2 size={11} /> Paid
                      </span>
                    : <button
                        onClick={() => setEditCredit(credit)}
                        style={{ fontSize: '0.6rem', color: '#6B7280', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Edit
                      </button>
                  }
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Pending credits summary ─────────────────────────────── */}
      {unpaid.length > 0 && (
        <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444' }}>Outstanding Credits</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: '#1A1A1A', marginTop: 2 }}>
                ₦{(analytics?.total_outstanding ?? 0).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              style={{ padding: '8px 18px', borderRadius: 14, background: '#EF4444', border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Pay All ({unpaid.length})
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ────────────────────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(88px + env(safe-area-inset-bottom))',
          right: 20, zIndex: 200,
          width: 54, height: 54, borderRadius: 20,
          background: G,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(164,207,86,0.5)',
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </motion.button>

      {/* ── AI Doctor Sheet ─────────────────────────────────────── */}
      <AIDoctorSheet open={showDoctor} onClose={() => setShowDoctor(false)} payload={doctorPayload} />

      {/* ── Add Meal Modal ──────────────────────────────────────── */}
      <Modal isOpen={showAdd} title="Record Meal" onClose={() => setShowAdd(false)}>
        <FoodVendorForm
          allVendors={Array.from(new Set(allCredits.map((c) => c.vendor_name))).sort()}
          allCredits={allCredits}
          initialValues={{ purchase_date: selectedDate }}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {/* ── Edit Meal Modal ─────────────────────────────────────── */}
      <Modal isOpen={!!editCredit} title="Edit Meal" onClose={() => setEditCredit(null)}>
        {editCredit && (
          <>
            <FoodVendorForm
              allVendors={Array.from(new Set(allCredits.map((c) => c.vendor_name))).sort()}
              allCredits={allCredits}
              initialValues={{
                vendor_name: editCredit.vendor_name,
                meal_description: editCredit.meal_description,
                amount: editCredit.amount,
                purchase_date: editCredit.purchase_date,
                meal_type: editCredit.meal_type,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditCredit(null)}
              submitLabel="Save Changes"
            />
            <button
              onClick={() => handleDelete(editCredit.id)}
              style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 14, border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Delete Meal
            </button>
          </>
        )}
      </Modal>

      {/* ── Pay All Confirm Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <Modal isOpen={showConfirm} title="Pay All Credits" onClose={() => setShowConfirm(false)}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '16px', borderRadius: 16, background: GB, border: `1px solid rgba(164,207,86,0.3)`, marginBottom: 20 }}>
                <p style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 8 }}>
                  You are about to pay all {unpaid.length} outstanding credits totalling:
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: '#1A1A1A' }}>
                  ₦{unpaid.reduce((s, c) => s + Number(c.amount), 0).toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handlePayAll} disabled={paying} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: G, color: '#fff', fontWeight: 800, cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying ? 0.7 : 1 }}>
                  {paying ? <><Loader2 size={16} className="doc-spin" /> Processing…</> : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Budget Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showBudget && (
          <Modal isOpen={showBudget} title="Set Monthly Budget" onClose={() => setShowBudget(false)}>
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 16 }}>
                Set your monthly food budget. Daily budget = monthly ÷ 30.
              </p>
              <CurrencyInput
                label="Monthly Budget (₦)"
                value={budgetInput}
                onChange={setBudgetInput}
              />
              {budgetInput > 0 && (
                <p style={{ fontSize: '0.72rem', color: G, fontWeight: 600, marginTop: 8 }}>
                  Daily budget: ₦{Math.round(budgetInput / 30).toLocaleString()}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowBudget(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveBudget} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: G, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  Save Budget
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
