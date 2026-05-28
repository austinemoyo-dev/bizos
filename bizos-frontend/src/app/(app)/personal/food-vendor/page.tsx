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
  History, CalendarDays, ShoppingCart, ArrowLeft, Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { format, startOfMonth, subDays, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Tokens ────────────────────────────────────────────────
const G    = '#A4CF56';
const GB   = 'rgba(164,207,86,0.15)';
const ORG  = '#F97316';
const DARK = '#0A0B0F';
const CARD = '#13141A';
const C2   = '#1C1D26';
const TXT  = '#F0F2F8';
const MUT  = 'rgba(240,242,248,0.45)';
const BDR  = 'rgba(255,255,255,0.08)';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MM: Record<MealType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee,   color: '#F97316', bg: 'rgba(249,115,22,0.2)'  },
  lunch:     { label: 'Lunch',     icon: Utensils, color: '#EAB308', bg: 'rgba(234,179,8,0.2)'   },
  dinner:    { label: 'Dinner',    icon: Moon,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.2)'  },
  snack:     { label: 'Snack',     icon: Apple,    color: '#10B981', bg: 'rgba(16,185,129,0.2)'  },
};

function vGrad(name: string) {
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return [
    ['#F97316','#EF4444'], ['#8B5CF6','#3B82F6'],
    ['#10B981','#06B6D4'], ['#EAB308','#F97316'],
    ['#EC4899','#8B5CF6'],
  ][h % 5];
}

// ── Arc Gauge ─────────────────────────────────────────────
function ArcGauge({ spent, budget, credits, paid }: { spent: number; budget: number; credits: number; paid: number }) {
  const W = 260, H = 148, cx = 130, cy = 148, r = 104;
  const hc  = Math.PI * r;
  const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const sc  = pct >= 1 ? '#EF4444' : pct >= 0.75 ? '#F59E0B' : ORG;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={W} height={H} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
        <path d={arc} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={13} strokeLinecap="round" />
        <path d={arc} fill="none" stroke={sc} strokeWidth={13} strokeLinecap="round"
          strokeDasharray={hc} strokeDashoffset={hc * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1)' }} />
        <text x={cx} y={cy - 36} textAnchor="middle" dominantBaseline="middle" fill={sc}
          style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          {budget > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </text>
        <text x={cx} y={cy - 14} textAnchor="middle" fill="rgba(255,255,255,0.4)"
          style={{ fontSize: '0.62rem', fontWeight: 600 }}>
          {budget > 0 ? 'of daily budget' : 'no budget set'}
        </text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -8, padding: '0 8px' }}>
        {[{ l: 'Credits', v: credits, c: '#EF4444' }, { l: 'Spent', v: spent, c: sc }, { l: 'Paid', v: paid, c: G }]
          .map(({ l, v, c }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: c, lineHeight: 1, marginBottom: 3 }}>
                {v >= 1000 ? `₦${(v / 1000).toFixed(1)}k` : `₦${v}`}
              </p>
              <p style={{ fontSize: '0.6rem', color: MUT, fontWeight: 600 }}>{l}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Calendar Strip ────────────────────────────────────────
function CalStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 3 - i);
    return { date: format(d, 'yyyy-MM-dd'), dl: format(d, 'EEEEE'), dn: format(d, 'd') };
  });
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
      {days.map(({ date, dl, dn }) => {
        const sel = date === selected, tod = date === today;
        return (
          <button key={date} onClick={() => onSelect(date)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 5, padding: '8px 4px', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: sel ? ORG : 'transparent', transition: 'all 0.18s',
          }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: sel ? 'rgba(255,255,255,0.8)' : MUT, textTransform: 'uppercase' }}>{dl}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1, color: sel ? '#fff' : tod ? ORG : TXT }}>{dn}</span>
            {tod && !sel && <div style={{ width: 5, height: 5, borderRadius: '50%', background: ORG }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── AI Doctor Sheet ───────────────────────────────────────
function AIDoctorSheet({ open, onClose, payload }: { open: boolean; onClose: () => void; payload: object }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fetched = useRef(false);

  useEffect(() => {
    if (!open || fetched.current) return;
    fetched.current = true;
    (async () => {
      setLoading(true); setError(''); setText('');
      try {
        const res = await fetch('/api/food-doctor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? 'local' : 'local'}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { setError('AI unavailable. Check GROQ_API_KEY.'); return; }
        const reader = res.body!.getReader();
        const dec    = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setText(p => p + dec.decode(value, { stream: true }));
        }
      } catch { setError('Failed to reach AI. Try again.'); }
      finally { setLoading(false); }
    })();
  }, [open, payload]);

  const handleClose = () => { fetched.current = false; setText(''); onClose(); };
  const sections = text.split(/^## /m).filter(Boolean).map(s => {
    const [h, ...r] = s.split('\n'); return { heading: h.trim(), body: r.join('\n').trim() };
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="doc-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
          <motion.div key="doc-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101, background: '#fff', borderRadius: '28px 28px 0 0', maxHeight: '88dvh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>
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
              {error && <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.8rem' }}>{error}</div>}
              {sections.map(({ heading, body }, i) => {
                const isPred = heading.toLowerCase().includes('prediction');
                const isTreat = heading.toLowerCase().includes('treatment');
                const isScore = heading.toLowerCase().includes('health score');
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.06 }}
                    style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 18, background: isPred ? GB : isTreat ? 'rgba(139,92,246,0.07)' : '#F9FAFB', border: `1px solid ${isPred ? 'rgba(164,207,86,0.3)' : '#F3F4F6'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 10, background: isPred ? G : isTreat ? '#8B5CF6' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isPred ? <TrendingUp size={14} color="#fff" /> : isTreat ? <Target size={14} color="#fff" /> : <Sparkles size={14} color="#fff" />}
                      </div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{heading}</p>
                      {isScore && body.match(/\d+\/10/) && (
                        <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 20, background: G, fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>{body.match(/\d+\/10/)?.[0]}</span>
                      )}
                    </div>
                    {body.split('\n').filter(Boolean).map((line, j) => (
                      <p key={j} style={{ fontSize: '0.78rem', lineHeight: 1.65, color: '#374151', marginBottom: 4 }}>{line}</p>
                    ))}
                  </motion.div>
                );
              })}
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

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  ['food-credits', 'food-analytics', 'food-vendors', 'food-payments', 'food-trend', 'food-monthly']
    .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

// ── Page ──────────────────────────────────────────────────
export default function FoodVendorPage() {
  const { addToast }           = useUIStore();
  const qc                     = useQueryClient();
  const { budget, saveBudget } = useFoodBudget();
  const { storePayment }       = useFoodPaymentCache();
  const searchParams           = useSearchParams();

  const [selectedDate,         setSelectedDate]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDoctor,           setShowDoctor]           = useState(false);
  const [showAdd,              setShowAdd]              = useState(false);
  const [editCredit,           setEditCredit]           = useState<FoodCredit | null>(null);
  const [showConfirm,          setShowConfirm]          = useState(false);
  const [showBudget,           setShowBudget]           = useState(false);
  const [budgetInput,          setBudgetInput]          = useState(budget);
  const [paying,               setPaying]               = useState(false);
  const [payingVendor,         setPayingVendor]         = useState<string | null>(null);
  const [showDayPay,           setShowDayPay]           = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState('all');
  const [currentView,          setCurrentView]          = useState<'home' | 'cart'>('home');
  const [activeMealType,       setActiveMealType]       = useState<MealType | null>(null);

  useEffect(() => { if (searchParams.get('new') === '1') setShowAdd(true); }, [searchParams]);

  const { data: unpaid     = [] } = useQuery({ queryKey: ['food-credits', 'unpaid'], queryFn: () => foodVendorApi.credits.list({ paid: false }) });
  const { data: allCredits = [] } = useQuery({ queryKey: ['food-credits', 'all'],    queryFn: () => foodVendorApi.credits.listAll() });
  const { data: payments   = [] } = useQuery({ queryKey: ['food-payments'],           queryFn: () => foodVendorApi.payments() });
  const { data: analytics }       = useQuery({ queryKey: ['food-analytics'],          queryFn: () => foodVendorApi.analytics() });
  const { data: trend        = [] } = useQuery({ queryKey: ['food-trend'],   queryFn: () => foodVendorApi.trend(30) });
  const { data: vendors      = [] } = useQuery({ queryKey: ['food-vendors'], queryFn: () => foodVendorApi.vendorBreakdown() });
  const { data: monthlySummary = [] } = useQuery({ queryKey: ['food-monthly'], queryFn: () => foodVendorApi.monthlySummary(6) });

  const dailyBudget = budget > 0 ? Math.round(budget / 30) : 0;

  const dayCredits = useMemo(() => allCredits.filter(c => c.purchase_date === selectedDate), [allCredits, selectedDate]);
  const daySpent   = useMemo(() => dayCredits.reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);
  const dayCredAmt = useMemo(() => dayCredits.filter(c => !c.paid).reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);
  const dayPaid    = useMemo(() => dayCredits.filter(c => c.paid).reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);
  const dayUnpaid  = useMemo(() => dayCredits.filter(c => !c.paid), [dayCredits]);

  const byType = useMemo(() => {
    const m: Record<MealType, FoodCredit[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    dayCredits.forEach(c => { const t = (c.meal_type ?? 'snack') as MealType; (m[t] ??= []).push(c); });
    return m;
  }, [dayCredits]);

  const filteredDay = useMemo(
    () => activeMealType ? dayCredits.filter(c => (c.meal_type ?? 'snack') === activeMealType) : dayCredits,
    [dayCredits, activeMealType],
  );

  const vendorUnpaidMap = useMemo(() => {
    const m: Record<string, { ids: string[]; amount: number; credits: FoodCredit[] }> = {};
    unpaid.forEach(c => {
      if (!m[c.vendor_name]) m[c.vendor_name] = { ids: [], amount: 0, credits: [] };
      m[c.vendor_name].ids.push(c.id);
      m[c.vendor_name].amount += Number(c.amount);
      m[c.vendor_name].credits.push(c);
    });
    return m;
  }, [unpaid]);

  const monthlySpent = useMemo(() => {
    const ms = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    return allCredits.filter(c => c.purchase_date >= ms).reduce((s, c) => s + Number(c.amount), 0);
  }, [allCredits]);

  const historyMonthOptions = useMemo(() => {
    const opts = [{ key: 'all', label: 'All Time' }];
    for (let i = 0; i < 6; i++) { const d = subMonths(new Date(), i); opts.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') }); }
    return opts;
  }, []);

  const filteredPayments = useMemo(
    () => selectedHistoryMonth === 'all' ? payments : payments.filter(p => p.paid_at.slice(0, 7) === selectedHistoryMonth),
    [payments, selectedHistoryMonth],
  );

  const historyStats = useMemo(() => ({
    total: filteredPayments.reduce((s, p) => s + Number(p.amount_paid), 0),
    count: filteredPayments.length,
  }), [filteredPayments]);

  const monthlyChartData = useMemo(() =>
    monthlySummary.map(m => ({ label: format(new Date(m.month + '-01'), 'MMM'), spent: Number(m.total_spent), paid: Number(m.total_paid) })),
  [monthlySummary]);

  const doctorPayload = useMemo(() => ({ credits: allCredits, analytics, vendors, trend, budget, monthlySpent }), [allCredits, analytics, vendors, trend, budget, monthlySpent]);

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
    } finally { setPaying(false); }
  };

  const handlePayAll    = () => runPay(unpaid.map(c => c.id), unpaid.map(c => c.vendor_name).filter((v, i, a) => a.indexOf(v) === i).join(', '), unpaid);
  const handlePayDay    = () => { if (!dayUnpaid.length) return; runPay(dayUnpaid.map(c => c.id), `Day: ${selectedDate}`, dayUnpaid).then(() => setShowDayPay(false)); };
  const handlePayVendor = (vn: string) => { const e = vendorUnpaidMap[vn]; if (!e) return; setPayingVendor(vn); runPay(e.ids, vn, e.credits).finally(() => setPayingVendor(null)); };
  const handleCreate    = async (data: FoodCreditCreate) => { await foodVendorApi.credits.create(data); invalidateAll(qc); addToast({ type: 'success', title: 'Meal recorded' }); setShowAdd(false); };
  const handleUpdate    = async (data: FoodCreditCreate) => { if (!editCredit) return; await foodVendorApi.credits.update(editCredit.id, data); invalidateAll(qc); addToast({ type: 'success', title: 'Meal updated' }); setEditCredit(null); };
  const handleDelete    = async (id: string) => { try { await foodVendorApi.credits.delete(id); invalidateAll(qc); addToast({ type: 'success', title: 'Credit deleted' }); } catch (err) { addToast({ type: 'error', title: 'Delete failed', message: err instanceof Error ? err.message : '' }); } };
  const handleSaveBudget = () => { saveBudget(budgetInput); addToast({ type: 'success', title: 'Budget saved' }); setShowBudget(false); };

  const today   = format(new Date(), 'yyyy-MM-dd');
  const isToday = selectedDate === today;
  const totalUnpaidAmt = unpaid.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div style={{ background: DARK, minHeight: '100dvh', paddingBottom: 100 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .doc-spin{animation:spin 1s linear infinite}`}</style>

      <AnimatePresence mode="wait">

        {/* ═══════════════════════════════ HOME VIEW ═══════════════════════════════ */}
        {currentView === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>

            {/* Header */}
            <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.62rem', color: MUT, fontWeight: 600, marginBottom: 2 }}>
                  {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMM')}
                </p>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: TXT, lineHeight: 1.1 }}>
                  {isToday ? "Today's Meals" : 'Meal History'}
                </h1>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setBudgetInput(budget); setShowBudget(true); }}
                  style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: C2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <SlidersHorizontal size={16} color={MUT} />
                </button>
                <button onClick={() => setCurrentView('cart')} style={{ position: 'relative', width: 40, height: 40, borderRadius: 13, border: 'none', background: unpaid.length > 0 ? ORG : C2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ShoppingCart size={16} color={unpaid.length > 0 ? '#fff' : MUT} />
                  {unpaid.length > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${DARK}` }}>
                      {unpaid.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Hero Banner */}
            <div style={{ margin: '4px 16px 14px', borderRadius: 24, background: 'linear-gradient(135deg, #1A1020 0%, #0F1020 100%)', border: `1px solid ${BDR}`, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px 4px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, background: ORG, fontSize: '0.58rem', fontWeight: 800, color: '#fff' }}>
                    {isToday ? 'TODAY' : format(new Date(selectedDate + 'T00:00:00'), 'd MMM').toUpperCase()}
                  </span>
                  {dailyBudget > 0 && daySpent < dailyBudget && (
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: GB, fontSize: '0.58rem', fontWeight: 700, color: G }}>Under Budget ✓</span>
                  )}
                  {dailyBudget > 0 && daySpent >= dailyBudget && (
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', fontSize: '0.58rem', fontWeight: 700, color: '#EF4444' }}>Over Budget!</span>
                  )}
                </div>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: TXT, lineHeight: 1.3, marginBottom: 4 }}>
                  {daySpent > 0 ? `₦${daySpent.toLocaleString()} spent ${isToday ? 'today' : 'this day'}` : 'No meals recorded yet'}
                </p>
                {dailyBudget > 0 && (
                  <p style={{ fontSize: '0.68rem', color: MUT }}>
                    Daily limit: ₦{dailyBudget.toLocaleString()} · {dayCredits.length} meal{dayCredits.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <ArcGauge spent={daySpent} budget={dailyBudget} credits={dayCredAmt} paid={dayPaid} />
            </div>

            {/* Calendar */}
            <div style={{ margin: '0 16px 14px', background: CARD, borderRadius: 20, padding: '14px 12px', border: `1px solid ${BDR}` }}>
              <CalStrip selected={selectedDate} onSelect={setSelectedDate} />
            </div>

            {/* Categories */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ padding: '0 20px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 800, color: TXT }}>Categories</p>
                {activeMealType && (
                  <button onClick={() => setActiveMealType(null)} style={{ fontSize: '0.65rem', color: ORG, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>see all</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, paddingLeft: 20, paddingRight: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {(Object.entries(MM) as [MealType, typeof MM[MealType]][]).map(([type, meta]) => {
                  const Icon = meta.icon;
                  const cnt  = (byType[type] ?? []).length;
                  const sel  = activeMealType === type;
                  return (
                    <button key={type} onClick={() => setActiveMealType(sel ? null : type)}
                      style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer' }}>
                      <div style={{
                        width: 62, height: 62, borderRadius: 21,
                        background: sel ? meta.bg : C2,
                        border: `2px solid ${sel ? meta.color : BDR}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.18s',
                      }}>
                        <Icon size={24} style={{ color: sel ? meta.color : MUT }} />
                      </div>
                      <p style={{ fontSize: '0.62rem', fontWeight: 700, color: sel ? meta.color : TXT }}>{meta.label}</p>
                      {cnt > 0 && <p style={{ fontSize: '0.52rem', color: MUT, marginTop: -5 }}>{cnt}</p>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vendor Cards */}
            {vendors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ padding: '0 20px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 800, color: TXT }}>Vendors</p>
                  <span style={{ fontSize: '0.62rem', color: MUT, fontWeight: 600 }}>{vendors.length} total</span>
                </div>
                <div style={{ display: 'flex', gap: 12, paddingLeft: 20, paddingRight: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {vendors.slice().sort((a, b) => b.total_spent - a.total_spent).map(v => {
                    const [c1, c2] = vGrad(v.vendor_name);
                    const owed = vendorUnpaidMap[v.vendor_name]?.amount ?? 0;
                    const isPaying = payingVendor === v.vendor_name;
                    return (
                      <div key={v.vendor_name} style={{ flexShrink: 0, width: 155, background: CARD, borderRadius: 20, border: `1px solid ${BDR}`, overflow: 'hidden' }}>
                        <div style={{ height: 96, background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <Utensils size={34} color="rgba(255,255,255,0.9)" />
                          {owed > 0 && (
                            <span style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 10, background: '#EF4444', fontSize: '0.52rem', fontWeight: 800, color: '#fff' }}>OWES</span>
                          )}
                        </div>
                        <div style={{ padding: '10px 12px 12px' }}>
                          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.vendor_name}</p>
                          <p style={{ fontSize: '0.58rem', color: MUT, marginTop: 2 }}>{v.total_meals} meal{v.total_meals !== 1 ? 's' : ''}</p>
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 800, color: owed > 0 ? ORG : G }}>
                              {owed > 0 ? `₦${owed.toLocaleString()}` : '✓ Clear'}
                            </span>
                            {owed > 0 && (
                              <button onClick={() => handlePayVendor(v.vendor_name)} disabled={isPaying || paying}
                                style={{ padding: '4px 10px', borderRadius: 9, border: 'none', cursor: isPaying ? 'not-allowed' : 'pointer', background: ORG, color: '#fff', fontSize: '0.55rem', fontWeight: 700, opacity: isPaying ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {isPaying ? <Loader2 size={10} className="doc-spin" /> : null}Pay
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today's Meals */}
            <div style={{ padding: '0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 800, color: TXT }}>
                    {activeMealType ? MM[activeMealType].label : isToday ? "Today's Meals" : `Meals — ${format(new Date(selectedDate + 'T00:00:00'), 'd MMM')}`}
                  </p>
                  <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 1 }}>{filteredDay.length} item{filteredDay.length !== 1 ? 's' : ''}</p>
                </div>
                {dayUnpaid.length > 0 && (
                  <button onClick={() => setShowDayPay(true)} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: ORG, color: '#fff', fontSize: '0.68rem', fontWeight: 700 }}>
                    Pay Day · ₦{dayUnpaid.reduce((s, c) => s + Number(c.amount), 0).toLocaleString()}
                  </button>
                )}
              </div>

              {filteredDay.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', background: CARD, borderRadius: 20, border: `1px solid ${BDR}` }}>
                  <div style={{ width: 52, height: 52, borderRadius: 18, background: C2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Utensils size={22} color={MUT} />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: MUT, fontWeight: 500 }}>
                    {activeMealType ? `No ${MM[activeMealType].label.toLowerCase()} recorded` : 'No meals recorded for this day'}
                  </p>
                  <button onClick={() => setShowAdd(true)} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, border: 'none', background: ORG, color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    Record Meal
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredDay.map((credit, i) => {
                    const mtype = (credit.meal_type ?? 'snack') as MealType;
                    const meta  = MM[mtype];
                    const Icon  = meta.icon;
                    return (
                      <motion.div key={credit.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 18, marginBottom: 10, background: CARD, border: `1px solid ${BDR}` }}>
                        <div style={{ width: 50, height: 50, borderRadius: 16, flexShrink: 0, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={22} style={{ color: meta.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {credit.meal_description ?? credit.vendor_name}
                          </p>
                          <p style={{ fontSize: '0.62rem', color: MUT, marginTop: 2 }}>{credit.vendor_name} · {meta.label}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800, color: ORG }}>
                            ₦{Number(credit.amount).toLocaleString()}
                          </span>
                          {credit.paid
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6rem', color: G, fontWeight: 700 }}><CheckCircle2 size={11} /> Paid</span>
                            : <button onClick={() => setEditCredit(credit)} style={{ fontSize: '0.6rem', color: MUT, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                          }
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Outstanding banner */}
            {unpaid.length > 0 && (
              <div style={{ margin: '14px 16px 0', padding: '14px 16px', borderRadius: 18, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: ORG }}>Outstanding Credits</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: TXT, marginTop: 2 }}>
                      ₦{(analytics?.total_outstanding ?? totalUnpaidAmt).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => setCurrentView('cart')} style={{ padding: '8px 16px', borderRadius: 14, background: ORG, border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoppingCart size={13} /> View ({unpaid.length})
                  </button>
                </div>
              </div>
            )}

            {/* AI Doctor CTA */}
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowDoctor(true)} style={{
              width: 'calc(100% - 32px)', margin: '20px 16px 0', padding: '15px 20px', borderRadius: 18,
              background: `linear-gradient(135deg, ${G} 0%, #8CC63F 100%)`,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 4px 18px rgba(164,207,86,0.35)',
            }}>
              <Sparkles size={18} color="#fff" />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>Ask My Food Doctor</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.8)" style={{ marginLeft: 'auto' }} />
            </motion.button>

            {/* Monthly Chart */}
            {monthlyChartData.length > 0 && (
              <div style={{ margin: '24px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 11, background: GB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={15} color={G} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 800, color: TXT }}>Monthly Spending</p>
                    <p style={{ fontSize: '0.6rem', color: MUT, fontWeight: 600 }}>Last {monthlySummary.length} months</p>
                  </div>
                </div>
                <div style={{ background: CARD, borderRadius: 20, padding: '16px 12px 12px', border: `1px solid ${BDR}` }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                      <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip contentStyle={{ background: C2, border: `1px solid ${BDR}`, borderRadius: 12, padding: '8px 12px' }}
                        labelStyle={{ color: MUT, fontSize: 10 }}
                        formatter={(value: number, name: string) => [`₦${Number(value).toLocaleString()}`, name === 'spent' ? 'Total Spent' : 'Total Paid']} />
                      <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
                        {monthlyChartData.map((_, i) => (
                          <Cell key={i} fill={i === monthlyChartData.length - 1 ? ORG : 'rgba(249,115,22,0.3)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BDR}` }}>
                    {[
                      { label: 'This Month',   value: monthlySummary[monthlySummary.length - 1]?.total_spent ?? 0,    color: TXT },
                      { label: 'Paid',          value: monthlySummary[monthlySummary.length - 1]?.total_paid ?? 0,     color: G   },
                      { label: 'Transactions',  value: monthlySummary[monthlySummary.length - 1]?.payment_count ?? 0,  color: '#8B5CF6', isCnt: true },
                    ].map(({ label, value, color, isCnt }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: isCnt ? 'var(--font-display)' : 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>
                          {isCnt ? value : (Number(value) >= 1000 ? `₦${(Number(value) / 1000).toFixed(1)}k` : `₦${Number(value)}`)}
                        </p>
                        <p style={{ fontSize: '0.55rem', color: MUT, fontWeight: 600 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div style={{ margin: '24px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 11, background: GB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={15} color={G} />
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 800, color: TXT }}>Payment History</p>
                  <p style={{ fontSize: '0.6rem', color: MUT, fontWeight: 600 }}>All vendor payments made</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14, paddingBottom: 2 }}>
                {historyMonthOptions.map(opt => {
                  const active = selectedHistoryMonth === opt.key;
                  return (
                    <button key={opt.key} onClick={() => setSelectedHistoryMonth(opt.key)} style={{
                      padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? 'transparent' : BDR}`,
                      cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0,
                      background: active ? ORG : C2, color: active ? '#fff' : MUT, transition: 'all 0.18s',
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {historyStats.count > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Total Paid', value: `₦${historyStats.total.toLocaleString()}`, color: G },
                    { label: 'Payments',   value: String(historyStats.count),                 color: TXT },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: CARD, borderRadius: 16, padding: '12px 14px', border: `1px solid ${BDR}`, textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</p>
                      <p style={{ fontSize: '0.58rem', color: MUT, fontWeight: 600 }}>{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {filteredPayments.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', background: CARD, borderRadius: 18, border: `1px solid ${BDR}` }}>
                  <CalendarDays size={36} color={MUT} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: '0.78rem', color: MUT, fontWeight: 500 }}>No payments yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredPayments.map(payment => {
                    const d = new Date(payment.paid_at);
                    return (
                      <div key={payment.id} style={{ background: CARD, borderRadius: 18, padding: '13px 14px', border: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: GB, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: G, lineHeight: 1 }}>{format(d, 'd')}</span>
                          <span style={{ fontSize: '0.5rem', fontWeight: 700, color: MUT, textTransform: 'uppercase' }}>{format(d, 'MMM')}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{payment.vendor_name}</p>
                          <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 2 }}>{format(d, 'EEEE, d MMMM yyyy')}</p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800, color: G }}>₦{Number(payment.amount_paid).toLocaleString()}</p>
                          <p style={{ fontSize: '0.55rem', color: MUT, fontWeight: 600, marginTop: 2 }}>PAID</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════ CART VIEW ═══════════════════════════════ */}
        {currentView === 'cart' && (
          <motion.div key="cart" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>

            {/* Cart Header */}
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setCurrentView('home')} style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: C2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ArrowLeft size={16} color={TXT} />
                </button>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: TXT }}>My Credits</h2>
              </div>
              {unpaid.length > 0 && (
                <button onClick={() => setShowConfirm(true)} style={{ width: 40, height: 40, borderRadius: 13, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Trash2 size={16} color="#EF4444" />
                </button>
              )}
            </div>

            {/* Credit Items */}
            <div style={{ padding: '4px 16px' }}>
              {unpaid.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 22, background: C2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <ShoppingCart size={28} color={MUT} />
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: TXT, marginBottom: 6 }}>All settled!</p>
                  <p style={{ fontSize: '0.78rem', color: MUT }}>No outstanding credits</p>
                  <button onClick={() => setCurrentView('home')} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 20, border: 'none', background: ORG, color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Back to Meals
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {unpaid.map((credit, i) => {
                    const mtype = (credit.meal_type ?? 'snack') as MealType;
                    const meta  = MM[mtype];
                    const Icon  = meta.icon;
                    return (
                      <motion.div key={credit.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 20, marginBottom: 12, background: CARD, border: `1px solid ${BDR}` }}>
                        <div style={{ width: 58, height: 58, borderRadius: 17, flexShrink: 0, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={26} style={{ color: meta.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {credit.meal_description ?? credit.vendor_name}
                          </p>
                          <p style={{ fontSize: '0.62rem', color: MUT, marginTop: 2 }}>{credit.vendor_name} · {meta.label}</p>
                          <p style={{ fontSize: '0.58rem', color: MUT, marginTop: 2 }}>{format(new Date(credit.purchase_date + 'T00:00:00'), 'd MMM yyyy')}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color: ORG }}>
                            ₦{Number(credit.amount).toLocaleString()}
                          </span>
                          <button onClick={() => handleDelete(credit.id)} style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Trash2 size={12} color="#EF4444" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Summary */}
            {unpaid.length > 0 && (
              <div style={{ margin: '4px 16px 0', padding: '18px', borderRadius: 20, background: CARD, border: `1px solid ${BDR}` }}>
                {[
                  { label: 'Amount', value: `₦${totalUnpaidAmt.toLocaleString()}`, color: TXT },
                  { label: 'Processing Fee', value: '₦0', color: MUT },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: MUT }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${BDR}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: TXT }}>Total Outstanding</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 800, color: ORG }}>
                    ₦{(analytics?.total_outstanding ?? totalUnpaidAmt).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Pay CTA */}
            {unpaid.length > 0 && (
              <div style={{ padding: '14px 16px' }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowConfirm(true)} style={{
                  width: '100%', padding: '17px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${ORG} 0%, #EA580C 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 6px 20px rgba(249,115,22,0.4)',
                }}>
                  <ShoppingCart size={18} color="#fff" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
                    Proceed to Payment · ₦{totalUnpaidAmt.toLocaleString()}
                  </span>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB (home only) ───────────────────────────────────── */}
      {currentView === 'home' && (
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAdd(true)} style={{
          position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom))', right: 20, zIndex: 200,
          width: 54, height: 54, borderRadius: 20, background: ORG, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(249,115,22,0.5)',
        }}>
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* ── Pay Day Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showDayPay && (
          <Modal isOpen={showDayPay} title="Pay This Day" onClose={() => setShowDayPay(false)}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', marginBottom: 16 }}>
                <p style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 4 }}>
                  {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM')}
                </p>
                <p style={{ fontSize: '0.78rem', color: '#374151', marginBottom: 10 }}>
                  {dayUnpaid.length} unpaid credit{dayUnpaid.length !== 1 ? 's' : ''}
                </p>
                {Object.entries(dayUnpaid.reduce((acc, c) => { acc[c.vendor_name] = (acc[c.vendor_name] ?? 0) + Number(c.amount); return acc; }, {} as Record<string, number>)).map(([vendor, amt]) => (
                  <div key={vendor} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600 }}>{vendor}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700 }}>₦{amt.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(249,115,22,0.3)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800 }}>₦{dayUnpaid.reduce((s, c) => s + Number(c.amount), 0).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDayPay(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handlePayDay} disabled={paying} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: ORG, color: '#fff', fontWeight: 800, cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying ? 0.7 : 1 }}>
                  {paying ? <><Loader2 size={16} className="doc-spin" /> Processing…</> : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── AI Doctor ─────────────────────────────────────────── */}
      <AIDoctorSheet open={showDoctor} onClose={() => setShowDoctor(false)} payload={doctorPayload} />

      {/* ── Add Meal ──────────────────────────────────────────── */}
      <Modal isOpen={showAdd} title="Record Meal" onClose={() => setShowAdd(false)}>
        <FoodVendorForm
          allVendors={Array.from(new Set(allCredits.map(c => c.vendor_name))).sort()}
          allCredits={allCredits}
          initialValues={{ purchase_date: selectedDate }}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {/* ── Edit Meal ─────────────────────────────────────────── */}
      <Modal isOpen={!!editCredit} title="Edit Meal" onClose={() => setEditCredit(null)}>
        {editCredit && (
          <>
            <FoodVendorForm
              allVendors={Array.from(new Set(allCredits.map(c => c.vendor_name))).sort()}
              allCredits={allCredits}
              initialValues={{ vendor_name: editCredit.vendor_name, meal_description: editCredit.meal_description, amount: editCredit.amount, purchase_date: editCredit.purchase_date, meal_type: editCredit.meal_type }}
              onSubmit={handleUpdate}
              onCancel={() => setEditCredit(null)}
              submitLabel="Save Changes"
            />
            <button onClick={() => handleDelete(editCredit.id)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 14, border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              Delete Meal
            </button>
          </>
        )}
      </Modal>

      {/* ── Pay All Confirm ───────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <Modal isOpen={showConfirm} title="Pay All Credits" onClose={() => setShowConfirm(false)}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: 20 }}>
                <p style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 8 }}>
                  Paying {unpaid.length} outstanding credit{unpaid.length !== 1 ? 's' : ''} totalling:
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: '#1A1A1A' }}>
                  ₦{totalUnpaidAmt.toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handlePayAll} disabled={paying} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: ORG, color: '#fff', fontWeight: 800, cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying ? 0.7 : 1 }}>
                  {paying ? <><Loader2 size={16} className="doc-spin" /> Processing…</> : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Budget ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBudget && (
          <Modal isOpen={showBudget} title="Set Monthly Budget" onClose={() => setShowBudget(false)}>
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 16 }}>
                Set your monthly food budget. Daily budget = monthly ÷ 30.
              </p>
              <CurrencyInput label="Monthly Budget (₦)" value={budgetInput} onChange={setBudgetInput} />
              {budgetInput > 0 && (
                <p style={{ fontSize: '0.72rem', color: ORG, fontWeight: 600, marginTop: 8 }}>
                  Daily budget: ₦{Math.round(budgetInput / 30).toLocaleString()}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowBudget(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveBudget} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: ORG, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
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
