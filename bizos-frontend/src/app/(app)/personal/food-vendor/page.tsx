'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  ShoppingBag, Plus, X, Loader2, Sparkles, CheckCircle2,
  ArrowLeft, Trash2, Coffee, Utensils, Moon, Apple,
  TrendingUp, History, CalendarDays, SlidersHorizontal,
  Target, ChevronRight, Star, Tag,
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Color tokens ──────────────────────────────────────────
const BG    = '#F4F5FA';
const WHITE = '#FFFFFF';
const RED   = '#E8392D';
const ORG   = '#F97316';
const TXT   = '#1A1A2E';
const SUB   = '#374151';
const MUT   = '#9CA3AF';
const BDR   = '#ECEDF2';
const G     = '#16A34A';
const GB    = 'rgba(22,163,74,0.1)';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_META: Record<MealType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee,   color: '#F97316', bg: '#FFF7EC' },
  lunch:     { label: 'Lunch',     icon: Utensils, color: '#E8392D', bg: '#FFF1F0' },
  dinner:    { label: 'Dinner',    icon: Moon,     color: '#4F46E5', bg: '#EEF2FF' },
  snack:     { label: 'Snack',     icon: Apple,    color: '#16A34A', bg: '#F0FDF4' },
};

// ── Food visual engine ────────────────────────────────────
function getFoodVisual(mealDesc?: string | null, mealType?: string | null) {
  const d  = (mealDesc ?? '').toLowerCase();
  const mt = (mealType ?? 'lunch') as MealType;
  const cases: Array<[RegExp, string, string, string]> = [
    [/jollof|fried.?rice|coconut.?rice|basmati/,            '🍛','linear-gradient(135deg,#FF6B35,#FFA07A)','#FFF3EE'],
    [/chicken|turkey|shaki|assorted|gizzard|liver/,          '🍗','linear-gradient(135deg,#F97316,#FBBF24)','#FFF7EC'],
    [/fish|catfish|tilapia|titus|croaker|salmon|ponmo/,      '🐟','linear-gradient(135deg,#0EA5E9,#38BDF8)','#EFF9FF'],
    [/pasta|spaghetti|indomie|noodle/,                       '🍝','linear-gradient(135deg,#F59E0B,#F97316)','#FFFBEC'],
    [/bread|toast|sandwich|burger/,                          '🥪','linear-gradient(135deg,#D97706,#F59E0B)','#FFFBEC'],
    [/pepper.?soup|ogbono|egusi|okra|efo|oha|banga/,         '🍲','linear-gradient(135deg,#EF4444,#F97316)','#FFF1F1'],
    [/beans|akara|moi.?moi|gbegiri|ewa/,                     '🫘','linear-gradient(135deg,#78350F,#B45309)','#FEF3C7'],
    [/yam|pounded|eba|fufu|amala|semo|tuwo|agidi/,           '🥘','linear-gradient(135deg,#CA8A04,#EAB308)','#FEFCE8'],
    [/plantain|dodo|boli/,                                   '🍌','linear-gradient(135deg,#EAB308,#F97316)','#FEFCE8'],
    [/suya|kebab|stick meat/,                                '🍢','linear-gradient(135deg,#DC2626,#F97316)','#FFF1F1'],
    [/shawarma|wrap/,                                        '🌯','linear-gradient(135deg,#7C3AED,#A855F7)','#F5F3FF'],
    [/juice|chapman|smoothie|zobo|kunun/,                    '🥤','linear-gradient(135deg,#EC4899,#F9A8D4)','#FDF2F8'],
    [/water|soda|coke|pepsi|fanta|malt/,                     '🍾','linear-gradient(135deg,#0EA5E9,#7DD3FC)','#EFF9FF'],
    [/snack|biscuit|chin.?chin|puff|small.?chop|cake/,       '🍪','linear-gradient(135deg,#92400E,#B45309)','#FEF3C7'],
    [/egg|omelette/,                                         '🍳','linear-gradient(135deg,#EAB308,#FBBF24)','#FEFCE8'],
    [/salad|veggie|vegetable/,                               '🥗','linear-gradient(135deg,#16A34A,#4ADE80)','#F0FDF4'],
    [/pizza/,                                                '🍕','linear-gradient(135deg,#EF4444,#F97316)','#FFF1F1'],
    [/rice/,                                                 '🍚','linear-gradient(135deg,#FF6B35,#FFA07A)','#FFF3EE'],
  ];
  for (const [re, emoji, gradient, lightBg] of cases) {
    if (re.test(d)) return { emoji, gradient, lightBg };
  }
  const fb: Record<MealType, { emoji: string; gradient: string; lightBg: string }> = {
    breakfast: { emoji: '🌅', gradient: 'linear-gradient(135deg,#F97316,#FBBF24)', lightBg: '#FFF7EC' },
    lunch:     { emoji: '🍽️', gradient: 'linear-gradient(135deg,#E8392D,#F97316)', lightBg: '#FFF1F0' },
    dinner:    { emoji: '🌙', gradient: 'linear-gradient(135deg,#4F46E5,#7C3AED)', lightBg: '#F5F3FF' },
    snack:     { emoji: '🍏', gradient: 'linear-gradient(135deg,#16A34A,#4ADE80)', lightBg: '#F0FDF4' },
  };
  return fb[mt] ?? fb.lunch;
}

function getTopFoods(credits: FoodCredit[], limit = 8) {
  const map = new Map<string, { count: number; avgAmt: number; credit: FoodCredit }>();
  credits.forEach(c => {
    const key = (c.meal_description || c.vendor_name).trim();
    if (!key) return;
    const ex = map.get(key) ?? { count: 0, avgAmt: 0, credit: c };
    ex.count++;
    ex.avgAmt = (ex.avgAmt * (ex.count - 1) + Number(c.amount)) / ex.count;
    map.set(key, ex);
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}

// ── AI Doctor Sheet ───────────────────────────────────────
function AIDoctorSheet({ open, onClose, payload }: { open: boolean; onClose: () => void; payload: object }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fetched               = useRef(false);

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
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? 'local' : 'local'}`,
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
            style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} />
          <motion.div key="doc-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101, background: WHITE, borderRadius: '28px 28px 0 0', maxHeight: '88dvh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 16px', borderBottom: `1px solid ${BDR}`, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: GB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} style={{ color: G }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: TXT }}>Food Doctor AI</p>
                  <p style={{ fontSize: '0.65rem', color: MUT, marginTop: 2 }}>Personalized health insights</p>
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
                  <p style={{ fontSize: '0.8rem', color: MUT, fontWeight: 500 }}>Analysing your food patterns…</p>
                </div>
              )}
              {error && <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.8rem' }}>{error}</div>}
              {sections.map(({ heading, body }, i) => {
                const isPred  = heading.toLowerCase().includes('prediction');
                const isTreat = heading.toLowerCase().includes('treatment');
                const isScore = heading.toLowerCase().includes('health score');
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.06 }}
                    style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 18, background: isPred ? GB : isTreat ? 'rgba(139,92,246,0.07)' : '#F9FAFB', border: `1px solid ${isPred ? 'rgba(22,163,74,0.3)' : BDR}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 10, background: isPred ? G : isTreat ? '#8B5CF6' : TXT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isPred ? <TrendingUp size={14} color={WHITE} /> : isTreat ? <Target size={14} color={WHITE} /> : <Sparkles size={14} color={WHITE} />}
                      </div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 800, color: TXT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{heading}</p>
                      {isScore && body.match(/\d+\/10/) && (
                        <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 20, background: G, fontSize: '0.7rem', fontWeight: 800, color: WHITE }}>{body.match(/\d+\/10/)?.[0]}</span>
                      )}
                    </div>
                    {body.split('\n').filter(Boolean).map((line, j) => (
                      <p key={j} style={{ fontSize: '0.78rem', lineHeight: 1.65, color: SUB, marginBottom: 4 }}>{line}</p>
                    ))}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Calendar strip ────────────────────────────────────────
function CalStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { date: format(d, 'yyyy-MM-dd'), dl: format(d, 'EEEEE'), dn: format(d, 'd') };
  });
  return (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {days.map(({ date, dl, dn }) => {
        const sel = date === selected, tod = date === today;
        return (
          <button key={date} onClick={() => onSelect(date)} style={{
            flex: 1, minWidth: 38, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '8px 4px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: sel ? RED : 'transparent', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: sel ? 'rgba(255,255,255,0.8)' : MUT, textTransform: 'uppercase' }}>{dl}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1, color: sel ? WHITE : tod ? RED : TXT }}>{dn}</span>
            {tod && !sel && <div style={{ width: 4, height: 4, borderRadius: '50%', background: RED }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── Food Emoji Visual ─────────────────────────────────────
function FoodVisual({ emoji, gradient, size = 72 }: { emoji: string; gradient: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
      fontSize: size * 0.46,
      lineHeight: 1,
    }}>
      {emoji}
    </div>
  );
}

// ── Meal Card (grid item) ─────────────────────────────────
function MealCard({ credit, onEdit, onDelete, onPay }: {
  credit: FoodCredit;
  onEdit: () => void;
  onDelete: () => void;
  onPay?: () => void;
}) {
  const mt    = (credit.meal_type ?? 'lunch') as MealType;
  const meta  = MEAL_META[mt];
  const vis   = getFoodVisual(credit.meal_description, credit.meal_type);
  const label = credit.meal_description || credit.vendor_name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: WHITE, borderRadius: 20, padding: 14, border: `1px solid ${BDR}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      {/* Visual */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <div style={{
          width: '100%', height: 90, borderRadius: 14,
          background: vis.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.6rem', lineHeight: 1,
        }}>{vis.emoji}</div>
        {!credit.paid && (
          <span style={{ position: 'absolute', top: 6, right: 6, padding: '2px 7px', borderRadius: 8, background: 'rgba(232,57,45,0.9)', fontSize: '0.48rem', fontWeight: 800, color: WHITE }}>
            UNPAID
          </span>
        )}
        {credit.paid && (
          <span style={{ position: 'absolute', top: 6, right: 6, padding: '2px 7px', borderRadius: 8, background: 'rgba(22,163,74,0.9)', fontSize: '0.48rem', fontWeight: 800, color: WHITE }}>
            PAID ✓
          </span>
        )}
      </div>
      {/* Info */}
      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: '0.58rem', color: MUT, marginBottom: 8 }}>{credit.vendor_name} · {meta.label}</p>
      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800, color: credit.paid ? G : RED }}>
          ₦{Number(credit.amount).toLocaleString()}
        </span>
        {!credit.paid ? (
          <button onClick={onEdit} style={{ padding: '4px 10px', borderRadius: 10, border: `1px solid ${BDR}`, background: BG, fontSize: '0.6rem', fontWeight: 700, color: SUB, cursor: 'pointer' }}>
            Edit
          </button>
        ) : (
          <CheckCircle2 size={15} color={G} />
        )}
      </div>
    </motion.div>
  );
}

// ── Hero favourite card ───────────────────────────────────
function HeroFoodCard({ topFood, onAdd }: {
  topFood: { count: number; avgAmt: number; credit: FoodCredit } | null;
  onAdd: (prefill?: Partial<FoodCreditCreate>) => void;
}) {
  const credit = topFood?.credit;
  const vis    = getFoodVisual(credit?.meal_description, credit?.meal_type);
  const label  = credit ? (credit.meal_description || credit.vendor_name) : 'Record a Meal';

  return (
    <div style={{ margin: '0 16px', background: WHITE, borderRadius: 24, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${BDR}` }}>
      {/* Visual header */}
      <div style={{
        width: '100%', height: 170,
        background: credit ? vis.gradient : 'linear-gradient(135deg,#E8392D,#F97316)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', fontSize: '5.5rem', lineHeight: 1,
      }}>
        {credit ? vis.emoji : '🍽️'}
        {topFood && (
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}>
            <Star size={10} fill={WHITE} stroke="none" />
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: WHITE }}>YOUR FAVOURITE</span>
          </div>
        )}
        {topFood && (
          <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: WHITE }}>×{topFood.count} ordered</span>
          </div>
        )}
      </div>
      {/* Details */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 800, color: TXT, marginBottom: 2 }}>{label}</p>
            {credit && (
              <p style={{ fontSize: '0.65rem', color: MUT }}>{credit.vendor_name} · {MEAL_META[(credit.meal_type ?? 'lunch') as MealType]?.label}</p>
            )}
            {!credit && (
              <p style={{ fontSize: '0.65rem', color: MUT }}>Start recording your meals</p>
            )}
          </div>
          {topFood && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: RED, flexShrink: 0 }}>
              ₦{Math.round(topFood.avgAmt).toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={() => onAdd(credit ? { meal_description: credit.meal_description, vendor_name: credit.vendor_name, amount: credit.amount, meal_type: credit.meal_type } : undefined)}
          style={{
            marginTop: 12, width: '100%', padding: '13px', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${RED} 0%,${ORG} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(232,57,45,0.35)',
          }}>
          <Plus size={16} color={WHITE} strokeWidth={2.5} />
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: WHITE }}>
            {credit ? 'Record Again' : 'Record Meal'}
          </span>
        </button>
      </div>
    </div>
  );
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  ['food-credits','food-analytics','food-vendors','food-payments','food-trend','food-monthly']
    .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

// ── Page ──────────────────────────────────────────────────
export default function FoodVendorPage() {
  const { addToast }           = useUIStore();
  const qc                     = useQueryClient();
  const { budget, saveBudget } = useFoodBudget();
  const { storePayment }       = useFoodPaymentCache();
  const searchParams           = useSearchParams();

  const [selectedDate,    setSelectedDate]    = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDoctor,      setShowDoctor]       = useState(false);
  const [showAdd,         setShowAdd]          = useState(false);
  const [addPrefill,      setAddPrefill]       = useState<Partial<FoodCreditCreate> | undefined>();
  const [editCredit,      setEditCredit]       = useState<FoodCredit | null>(null);
  const [showConfirm,     setShowConfirm]      = useState(false);
  const [showBudget,      setShowBudget]       = useState(false);
  const [budgetInput,     setBudgetInput]      = useState(budget);
  const [paying,          setPaying]           = useState(false);
  const [payingVendor,    setPayingVendor]     = useState<string | null>(null);
  const [currentView,     setCurrentView]      = useState<'menu' | 'cart' | 'history'>('menu');
  const [activeCategory,  setActiveCategory]   = useState<MealType | 'all'>('all');
  const [showDayPay,      setShowDayPay]       = useState(false);
  const [selHistoryMonth, setSelHistoryMonth]  = useState('all');

  useEffect(() => { if (searchParams.get('new') === '1') setShowAdd(true); }, [searchParams]);

  const { data: unpaid        = [] } = useQuery({ queryKey: ['food-credits','unpaid'],  queryFn: () => foodVendorApi.credits.list({ paid: false }) });
  const { data: allCredits    = [] } = useQuery({ queryKey: ['food-credits','all'],     queryFn: () => foodVendorApi.credits.listAll() });
  const { data: payments      = [] } = useQuery({ queryKey: ['food-payments'],          queryFn: () => foodVendorApi.payments() });
  const { data: analytics }          = useQuery({ queryKey: ['food-analytics'],         queryFn: () => foodVendorApi.analytics() });
  const { data: vendors       = [] } = useQuery({ queryKey: ['food-vendors'],           queryFn: () => foodVendorApi.vendorBreakdown() });
  const { data: monthlySummary= [] } = useQuery({ queryKey: ['food-monthly'],           queryFn: () => foodVendorApi.monthlySummary(6) });

  const dailyBudget  = budget > 0 ? Math.round(budget / 30) : 0;
  const today        = format(new Date(), 'yyyy-MM-dd');
  const isToday      = selectedDate === today;

  const dayCredits = useMemo(() => allCredits.filter(c => c.purchase_date === selectedDate), [allCredits, selectedDate]);
  const daySpent   = useMemo(() => dayCredits.reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);
  const dayUnpaid  = useMemo(() => dayCredits.filter(c => !c.paid), [dayCredits]);

  const filteredDay = useMemo(
    () => activeCategory === 'all' ? dayCredits : dayCredits.filter(c => (c.meal_type ?? 'snack') === activeCategory),
    [dayCredits, activeCategory],
  );

  const topFoods        = useMemo(() => getTopFoods(allCredits), [allCredits]);
  const topFood         = topFoods[0] ?? null;
  const totalUnpaidAmt  = unpaid.reduce((s, c) => s + Number(c.amount), 0);
  const budgetPct       = dailyBudget > 0 ? Math.min(daySpent / dailyBudget, 1) : 0;
  const budgetColor     = budgetPct >= 1 ? '#EF4444' : budgetPct >= 0.75 ? '#F59E0B' : G;

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

  const historyMonthOptions = useMemo(() => {
    const opts = [{ key: 'all', label: 'All Time' }];
    for (let i = 0; i < 6; i++) {
      const d = subMonths(new Date(), i);
      opts.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') });
    }
    return opts;
  }, []);

  const filteredPayments = useMemo(
    () => selHistoryMonth === 'all' ? payments : payments.filter(p => p.paid_at.slice(0, 7) === selHistoryMonth),
    [payments, selHistoryMonth],
  );

  const monthlyChartData = useMemo(() =>
    monthlySummary.map(m => ({ label: format(new Date(m.month + '-01'), 'MMM'), spent: Number(m.total_spent), paid: Number(m.total_paid) })),
  [monthlySummary]);

  const doctorPayload = useMemo(() => ({ credits: allCredits, analytics, vendors, budget }), [allCredits, analytics, vendors, budget]);

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

  const handleCreate = async (data: FoodCreditCreate) => {
    await foodVendorApi.credits.create(data);
    invalidateAll(qc);
    addToast({ type: 'success', title: 'Meal recorded' });
    setShowAdd(false);
    setAddPrefill(undefined);
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
  const handleSaveBudget = () => { saveBudget(budgetInput); addToast({ type: 'success', title: 'Budget saved' }); setShowBudget(false); };

  const openAdd = (prefill?: Partial<FoodCreditCreate>) => {
    setAddPrefill(prefill ? { ...prefill, purchase_date: selectedDate } : { purchase_date: selectedDate });
    setShowAdd(true);
  };

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: unpaid.length > 0 ? 140 : 100 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .fspin{animation:spin 1s linear infinite}`}</style>

      <AnimatePresence mode="wait">

        {/* ═══════════════ MENU VIEW ════════════════ */}
        {currentView === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>

            {/* ── Top bar ── */}
            <div style={{ background: WHITE, padding: '14px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BDR}` }}>
              <div>
                <p style={{ fontSize: '0.6rem', color: MUT, fontWeight: 600, marginBottom: 1 }}>
                  {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM')}
                </p>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: TXT }}>My Food 🍽️</h1>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setBudgetInput(budget); setShowBudget(true); }}
                  style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <SlidersHorizontal size={16} color={MUT} />
                </button>
                <button onClick={() => setCurrentView('history')}
                  style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <History size={16} color={MUT} />
                </button>
                <button onClick={() => setCurrentView('cart')}
                  style={{ position: 'relative', width: 40, height: 40, borderRadius: 13, border: 'none', background: unpaid.length > 0 ? RED : BG, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ShoppingBag size={16} color={unpaid.length > 0 ? WHITE : MUT} />
                  {unpaid.length > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, background: '#1A1A2E', color: WHITE, fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${BG}` }}>
                      {unpaid.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Budget bar ── */}
            {dailyBudget > 0 && (
              <div style={{ background: WHITE, padding: '10px 20px 14px', borderBottom: `1px solid ${BDR}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: MUT }}>Daily Budget</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: budgetColor }}>
                    ₦{daySpent.toLocaleString()} / ₦{dailyBudget.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: BDR, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetPct * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 3, background: budgetColor }} />
                </div>
              </div>
            )}

            {/* ── Category tabs ── */}
            <div style={{ background: WHITE, padding: '12px 20px', borderBottom: `1px solid ${BDR}` }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(cat => {
                  const active = activeCategory === cat;
                  const meta   = cat !== 'all' ? MEAL_META[cat] : null;
                  const Icon   = meta?.icon;
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: active ? RED : BDR,
                      color: active ? WHITE : SUB,
                      fontSize: '0.72rem', fontWeight: 700,
                      transition: 'all 0.15s',
                    }}>
                      {Icon && <Icon size={13} />}
                      {cat === 'all' ? 'All' : MEAL_META[cat].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Hero: Your Favourite ── */}
            <div style={{ padding: '20px 0 4px' }}>
              <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 800, color: TXT }}>
                  {topFood ? '⭐ Your Favourite' : 'Start Ordering'}
                </p>
                {topFoods.length > 1 && (
                  <span style={{ fontSize: '0.6rem', color: MUT }}>Based on {allCredits.length} meals</span>
                )}
              </div>
              <HeroFoodCard topFood={topFood} onAdd={openAdd} />
            </div>

            {/* ── Day selector ── */}
            <div style={{ margin: '16px 16px 0', background: WHITE, borderRadius: 18, padding: '12px 10px', border: `1px solid ${BDR}` }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 6 }}>Select Day</p>
              <CalStrip selected={selectedDate} onSelect={setSelectedDate} />
            </div>

            {/* ── Today's meals grid ── */}
            <div style={{ padding: '20px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 800, color: TXT }}>
                    {isToday ? "Today's Orders" : format(new Date(selectedDate + 'T00:00:00'), 'd MMM')}
                  </p>
                  <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 1 }}>{filteredDay.length} item{filteredDay.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {dayUnpaid.length > 0 && (
                    <button onClick={() => setShowDayPay(true)} style={{ padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: RED, color: WHITE, fontSize: '0.65rem', fontWeight: 700 }}>
                      Pay · ₦{dayUnpaid.reduce((s, c) => s + Number(c.amount), 0).toLocaleString()}
                    </button>
                  )}
                  <button onClick={() => openAdd()} style={{ width: 34, height: 34, borderRadius: 12, border: 'none', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus size={16} color={WHITE} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {filteredDay.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: WHITE, borderRadius: 20, border: `1px solid ${BDR}` }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍽️</div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: TXT, marginBottom: 4 }}>
                    {activeCategory !== 'all' ? `No ${MEAL_META[activeCategory].label.toLowerCase()} yet` : 'Nothing recorded yet'}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: MUT, marginBottom: 16 }}>
                    {isToday ? 'What did you eat today?' : 'No meals for this day'}
                  </p>
                  <button onClick={() => openAdd()} style={{ padding: '9px 22px', borderRadius: 20, border: 'none', background: RED, color: WHITE, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    + Add Meal
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <AnimatePresence>
                    {filteredDay.map(credit => (
                      <MealCard
                        key={credit.id}
                        credit={credit}
                        onEdit={() => setEditCredit(credit)}
                        onDelete={() => handleDelete(credit.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ── Favourites row ── */}
            {topFoods.length > 1 && (
              <div style={{ padding: '24px 0 0' }}>
                <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 800, color: TXT }}>Order Again</p>
                  <span style={{ fontSize: '0.6rem', color: MUT }}>Your top picks</span>
                </div>
                <div style={{ display: 'flex', gap: 12, paddingLeft: 16, paddingRight: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {topFoods.slice(1).map(({ credit, count, avgAmt }) => {
                    const vis   = getFoodVisual(credit.meal_description, credit.meal_type);
                    const label = credit.meal_description || credit.vendor_name;
                    return (
                      <button key={credit.id + label} onClick={() => openAdd({ meal_description: credit.meal_description, vendor_name: credit.vendor_name, amount: credit.amount, meal_type: credit.meal_type })}
                        style={{ flexShrink: 0, width: 128, background: WHITE, borderRadius: 18, border: `1px solid ${BDR}`, padding: '12px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 16, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 8 }}>
                          {vis.emoji}
                        </div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: '0.55rem', color: MUT, marginBottom: 6 }}>×{count} ordered</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 800, color: RED }}>₦{Math.round(avgAmt).toLocaleString()}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Vendors ── */}
            {vendors.length > 0 && (
              <div style={{ padding: '24px 0 0' }}>
                <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 800, color: TXT }}>Vendors</p>
                  <span style={{ fontSize: '0.62rem', color: MUT }}>{vendors.length} spots</span>
                </div>
                <div style={{ display: 'flex', gap: 12, paddingLeft: 16, paddingRight: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {vendors.slice().sort((a, b) => b.total_spent - a.total_spent).map(v => {
                    const owed      = vendorUnpaidMap[v.vendor_name]?.amount ?? 0;
                    const isPaying  = payingVendor === v.vendor_name;
                    const vis       = getFoodVisual(v.vendor_name, null);
                    return (
                      <div key={v.vendor_name} style={{ flexShrink: 0, width: 150, background: WHITE, borderRadius: 20, border: `1px solid ${BDR}`, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: 80, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', position: 'relative' }}>
                          {vis.emoji}
                          {owed > 0 && (
                            <span style={{ position: 'absolute', top: 7, right: 7, padding: '2px 7px', borderRadius: 8, background: RED, fontSize: '0.48rem', fontWeight: 800, color: WHITE }}>OWES</span>
                          )}
                        </div>
                        <div style={{ padding: '10px 12px 12px' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.vendor_name}</p>
                          <p style={{ fontSize: '0.55rem', color: MUT, marginTop: 2, marginBottom: 8 }}>{v.total_meals} meals</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, color: owed > 0 ? RED : G }}>
                              {owed > 0 ? `₦${owed.toLocaleString()}` : '✓ Clear'}
                            </span>
                            {owed > 0 && (
                              <button onClick={() => handlePayVendor(v.vendor_name)} disabled={isPaying || paying}
                                style={{ padding: '4px 9px', borderRadius: 9, border: 'none', cursor: isPaying ? 'not-allowed' : 'pointer', background: RED, color: WHITE, fontSize: '0.55rem', fontWeight: 700, opacity: isPaying ? 0.6 : 1 }}>
                                {isPaying ? <Loader2 size={10} className="fspin" style={{ display: 'inline' }} /> : 'Pay'}
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

            {/* ── AI Food Doctor ── */}
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowDoctor(true)} style={{
              width: 'calc(100% - 32px)', margin: '24px 16px 0', padding: '15px 20px', borderRadius: 18,
              background: `linear-gradient(135deg,${G} 0%,#059669 100%)`,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 4px 18px rgba(22,163,74,0.3)',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={20} color={WHITE} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 800, color: WHITE }}>Ask Food Doctor AI</p>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>Get health insights from your eating habits</p>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </motion.button>

            {/* ── Spending summary card ── */}
            {analytics && (
              <div style={{ margin: '20px 16px 0', background: WHITE, borderRadius: 20, padding: '16px', border: `1px solid ${BDR}` }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, color: TXT, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Month</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'This Month', value: `₦${Number(analytics.monthly_total ?? 0).toLocaleString()}`, color: TXT },
                    { label: 'Outstanding', value: `₦${Number(analytics.total_outstanding ?? totalUnpaidAmt).toLocaleString()}`, color: RED },
                    { label: 'Credits', value: String(analytics.total_credits ?? allCredits.length), color: ORG, plain: true },
                  ].map(({ label, value, color, plain }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '10px 4px', background: BG, borderRadius: 14 }}>
                      <p style={{ fontFamily: plain ? 'var(--font-display)' : 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</p>
                      <p style={{ fontSize: '0.52rem', color: MUT, fontWeight: 600 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Monthly chart ── */}
            {monthlyChartData.length > 0 && (
              <div style={{ margin: '16px 16px 0', background: WHITE, borderRadius: 20, padding: '16px 12px 12px', border: `1px solid ${BDR}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <TrendingUp size={16} color={RED} />
                  <p style={{ fontSize: '0.82rem', fontWeight: 800, color: TXT }}>Monthly Spending</p>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <XAxis dataKey="label" tick={{ fill: MUT, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fill: MUT, fontSize: 9 }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip contentStyle={{ background: WHITE, border: `1px solid ${BDR}`, borderRadius: 12, padding: '8px 12px' }}
                      formatter={(value: number) => [`₦${Number(value).toLocaleString()}`, 'Spent']} />
                    <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
                      {monthlyChartData.map((_, i) => (
                        <Cell key={i} fill={i === monthlyChartData.length - 1 ? RED : 'rgba(232,57,45,0.25)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════ CART / MY TAB VIEW ════════════════ */}
        {currentView === 'cart' && (
          <motion.div key="cart" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.26, ease: [0.16,1,0.3,1] }}>

            {/* Header */}
            <div style={{ background: WHITE, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BDR}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setCurrentView('menu')} style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ArrowLeft size={16} color={TXT} />
                </button>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: TXT }}>My Order</h2>
                  <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 1 }}>{unpaid.length} item{unpaid.length !== 1 ? 's' : ''} outstanding</p>
                </div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: unpaid.length > 0 ? 'rgba(232,57,45,0.1)' : GB, fontSize: '0.65rem', fontWeight: 800, color: unpaid.length > 0 ? RED : G }}>
                {unpaid.length > 0 ? `${unpaid.length} unpaid` : 'All clear ✓'}
              </span>
            </div>

            {/* Items */}
            <div style={{ padding: '14px 16px' }}>
              {unpaid.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: TXT, marginBottom: 6 }}>All settled!</p>
                  <p style={{ fontSize: '0.75rem', color: MUT, marginBottom: 24 }}>No outstanding credits</p>
                  <button onClick={() => setCurrentView('menu')} style={{ padding: '11px 28px', borderRadius: 20, border: 'none', background: RED, color: WHITE, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Back to Menu
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {unpaid.map((credit, i) => {
                    const vis   = getFoodVisual(credit.meal_description, credit.meal_type);
                    const label = credit.meal_description || credit.vendor_name;
                    return (
                      <motion.div key={credit.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                        transition={{ duration: 0.18, delay: i * 0.04 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', borderRadius: 20, marginBottom: 12, background: WHITE, border: `1px solid ${BDR}`, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 60, height: 60, borderRadius: 18, flexShrink: 0, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                          {vis.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
                          <p style={{ fontSize: '0.62rem', color: MUT, marginTop: 2 }}>{credit.vendor_name}</p>
                          <p style={{ fontSize: '0.58rem', color: MUT, marginTop: 1 }}>{format(new Date(credit.purchase_date + 'T00:00:00'), 'd MMM yyyy')}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 800, color: RED }}>
                            ₦{Number(credit.amount).toLocaleString()}
                          </span>
                          <button onClick={() => handleDelete(credit.id)} style={{ width: 28, height: 28, borderRadius: 9, border: `1px solid rgba(232,57,45,0.25)`, background: 'rgba(232,57,45,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Trash2 size={12} color={RED} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Order summary */}
            {unpaid.length > 0 && (
              <div style={{ margin: '0 16px', background: WHITE, borderRadius: 20, padding: '16px 18px', border: `1px solid ${BDR}` }}>
                {/* Promo code field (decorative UX touch) */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '11px 14px', borderRadius: 14, border: `1.5px dashed ${BDR}`, background: BG, alignItems: 'center' }}>
                  <Tag size={14} color={MUT} />
                  <span style={{ fontSize: '0.72rem', color: MUT, flex: 1 }}>Promo code</span>
                  <ChevronRight size={14} color={MUT} />
                </div>
                {[
                  { label: 'Outstanding Amount', value: `₦${totalUnpaidAmt.toLocaleString()}`, color: TXT },
                  { label: 'Processing Fee', value: 'FREE', color: G },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: MUT }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1.5px solid ${BDR}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: TXT }}>TOTAL</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: RED }}>
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
                  background: `linear-gradient(135deg,${RED} 0%,#C0392B 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 6px 20px rgba(232,57,45,0.4)',
                }}>
                  <ShoppingBag size={18} color={WHITE} />
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: WHITE }}>
                    Confirm Payment · ₦{totalUnpaidAmt.toLocaleString()}
                  </span>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════ HISTORY VIEW ════════════════ */}
        {currentView === 'history' && (
          <motion.div key="history" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.26, ease: [0.16,1,0.3,1] }}>
            <div style={{ background: WHITE, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BDR}` }}>
              <button onClick={() => setCurrentView('menu')} style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ArrowLeft size={16} color={TXT} />
              </button>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: TXT }}>Payment History</h2>
                <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 1 }}>All vendor settlements</p>
              </div>
            </div>

            <div style={{ padding: '14px 16px' }}>
              {/* Month filter */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16 }}>
                {historyMonthOptions.map(opt => {
                  const active = selHistoryMonth === opt.key;
                  return (
                    <button key={opt.key} onClick={() => setSelHistoryMonth(opt.key)} style={{
                      padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? 'transparent' : BDR}`,
                      cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0,
                      background: active ? RED : WHITE, color: active ? WHITE : MUT, transition: 'all 0.15s',
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {filteredPayments.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: WHITE, borderRadius: 20, border: `1px solid ${BDR}` }}>
                  <CalendarDays size={36} color={MUT} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: '0.78rem', color: MUT, fontWeight: 500 }}>No payments yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredPayments.map(payment => {
                    const d   = new Date(payment.paid_at);
                    const vis = getFoodVisual(payment.vendor_name, null);
                    return (
                      <div key={payment.id} style={{ background: WHITE, borderRadius: 18, padding: '13px 14px', border: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 50, height: 50, borderRadius: 16, flexShrink: 0, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                          {vis.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{payment.vendor_name}</p>
                          <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 2 }}>{format(d, 'EEEE, d MMMM yyyy')}</p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color: G }}>₦{Number(payment.amount_paid).toLocaleString()}</p>
                          <p style={{ fontSize: '0.52rem', color: G, fontWeight: 700, marginTop: 2 }}>PAID ✓</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky bottom tab bar (when outstanding credits exist) ── */}
      {currentView === 'menu' && unpaid.length > 0 && (
        <motion.div
          initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }}
          style={{
            position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom))', left: 16, right: 16, zIndex: 300,
            background: TXT, borderRadius: 22, padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(26,26,46,0.4)',
          }}>
          <div>
            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 2 }}>My Tab</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: WHITE }}>
              ₦{totalUnpaidAmt.toLocaleString()}
            </p>
          </div>
          <button onClick={() => setCurrentView('cart')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 16, border: 'none', cursor: 'pointer',
            background: RED, color: WHITE, fontWeight: 700, fontSize: '0.8rem',
          }}>
            <ShoppingBag size={15} />
            View Order · {unpaid.length}
          </button>
        </motion.div>
      )}

      {/* ── Floating Add button (menu view, no outstanding) ── */}
      {currentView === 'menu' && unpaid.length === 0 && (
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => openAdd()} style={{
          position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', right: 20, zIndex: 200,
          width: 54, height: 54, borderRadius: 20, background: RED, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(232,57,45,0.5)',
        }}>
          <Plus size={24} color={WHITE} strokeWidth={2.5} />
        </motion.button>
      )}

      {/* ── AI Doctor ── */}
      <AIDoctorSheet open={showDoctor} onClose={() => setShowDoctor(false)} payload={doctorPayload} />

      {/* ── Add Meal ── */}
      <Modal isOpen={showAdd} title="Record Meal" onClose={() => { setShowAdd(false); setAddPrefill(undefined); }}>
        <FoodVendorForm
          allVendors={Array.from(new Set(allCredits.map(c => c.vendor_name))).sort()}
          allCredits={allCredits}
          initialValues={addPrefill}
          onSubmit={handleCreate}
          onCancel={() => { setShowAdd(false); setAddPrefill(undefined); }}
        />
      </Modal>

      {/* ── Edit Meal ── */}
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
            <button onClick={() => handleDelete(editCredit.id)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 14, border: `1.5px solid rgba(232,57,45,0.3)`, background: 'rgba(232,57,45,0.06)', color: RED, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              Delete Meal
            </button>
          </>
        )}
      </Modal>

      {/* ── Pay Day ── */}
      <AnimatePresence>
        {showDayPay && (
          <Modal isOpen={showDayPay} title="Pay This Day" onClose={() => setShowDayPay(false)}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(232,57,45,0.06)', border: '1px solid rgba(232,57,45,0.2)', marginBottom: 16 }}>
                <p style={{ fontSize: '0.72rem', color: MUT, marginBottom: 4 }}>{format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM')}</p>
                {Object.entries(dayUnpaid.reduce((acc, c) => { acc[c.vendor_name] = (acc[c.vendor_name] ?? 0) + Number(c.amount); return acc; }, {} as Record<string, number>)).map(([vendor, amt]) => (
                  <div key={vendor} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: SUB, fontWeight: 600 }}>{vendor}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700 }}>₦{amt.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid rgba(232,57,45,0.2)`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800 }}>₦{dayUnpaid.reduce((s, c) => s + Number(c.amount), 0).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDayPay(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${BDR}`, background: WHITE, fontWeight: 700, cursor: 'pointer', color: TXT }}>Cancel</button>
                <button onClick={handlePayDay} disabled={paying} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: RED, color: WHITE, fontWeight: 800, cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying ? 0.7 : 1 }}>
                  {paying ? <><Loader2 size={16} className="fspin" /> Processing…</> : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Pay All Confirm ── */}
      <AnimatePresence>
        {showConfirm && (
          <Modal isOpen={showConfirm} title="Confirm Payment" onClose={() => setShowConfirm(false)}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(232,57,45,0.06)', border: '1px solid rgba(232,57,45,0.2)', marginBottom: 20 }}>
                <p style={{ fontSize: '0.8rem', color: SUB, marginBottom: 8 }}>
                  Paying {unpaid.length} outstanding credit{unpaid.length !== 1 ? 's' : ''}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: TXT }}>
                  ₦{totalUnpaidAmt.toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${BDR}`, background: WHITE, fontWeight: 700, cursor: 'pointer', color: TXT }}>Cancel</button>
                <button onClick={handlePayAll} disabled={paying} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: RED, color: WHITE, fontWeight: 800, cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying ? 0.7 : 1 }}>
                  {paying ? <><Loader2 size={16} className="fspin" /> Processing…</> : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Budget ── */}
      <AnimatePresence>
        {showBudget && (
          <Modal isOpen={showBudget} title="Monthly Food Budget" onClose={() => setShowBudget(false)}>
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: '0.78rem', color: MUT, marginBottom: 16 }}>
                Set your monthly food budget. Daily limit = monthly ÷ 30.
              </p>
              <CurrencyInput label="Monthly Budget (₦)" value={budgetInput} onChange={setBudgetInput} />
              {budgetInput > 0 && (
                <p style={{ fontSize: '0.72rem', color: RED, fontWeight: 600, marginTop: 8 }}>
                  Daily limit: ₦{Math.round(budgetInput / 30).toLocaleString()}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowBudget(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${BDR}`, background: WHITE, fontWeight: 700, cursor: 'pointer', color: TXT }}>Cancel</button>
                <button onClick={handleSaveBudget} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: RED, color: WHITE, fontWeight: 800, cursor: 'pointer' }}>
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
