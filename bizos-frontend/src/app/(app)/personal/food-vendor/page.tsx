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
  Target, ChevronRight, Star, Flame, Clock, MapPin,
} from 'lucide-react';
import { streamGemini } from '@/lib/ai/gemini';
import { format, subDays, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Dark restaurant theme ─────────────────────────────────
const BG    = '#08090E';
const CARD  = '#111219';
const CARD2 = '#181A24';
const ORG   = '#FF6B35';
const RED   = '#FF416C';
const GOLD  = '#FFD166';
const G     = '#06D6A0';
const BLUE  = '#4CC9F0';
const TXT   = '#F0F2F8';
const MUT   = 'rgba(240,242,248,0.4)';
const BDR   = 'rgba(255,255,255,0.07)';
const GBDR  = 'rgba(255,255,255,0.04)';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_META: Record<MealType, { label: string; icon: React.ElementType; color: string; bg: string; time: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee,   color: '#FFB347', bg: 'rgba(255,179,71,0.15)',  time: 'Morning'   },
  lunch:     { label: 'Lunch',     icon: Utensils, color: '#FF6B35', bg: 'rgba(255,107,53,0.15)',  time: 'Afternoon' },
  dinner:    { label: 'Dinner',    icon: Moon,     color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', time: 'Evening'   },
  snack:     { label: 'Snack',     icon: Apple,    color: '#06D6A0', bg: 'rgba(6,214,160,0.15)',   time: 'Anytime'   },
};

// ── Food visual engine ────────────────────────────────────
function getFoodVisual(mealDesc?: string | null, mealType?: string | null) {
  const d  = (mealDesc ?? '').toLowerCase();
  const mt = (mealType ?? 'lunch') as MealType;
  const cases: Array<[RegExp, string, string]> = [
    [/jollof|fried.?rice|coconut.?rice/,        '🍛','linear-gradient(135deg,#FF6B35,#FF8C00)'],
    [/chicken|turkey|shaki|assorted|gizzard/,    '🍗','linear-gradient(135deg,#FF9A3C,#FF6B35)'],
    [/fish|catfish|tilapia|titus|croaker/,       '🐟','linear-gradient(135deg,#0EA5E9,#4CC9F0)'],
    [/pasta|spaghetti|indomie|noodle/,           '🍝','linear-gradient(135deg,#F59E0B,#FF6B35)'],
    [/bread|toast|sandwich|burger/,              '🥪','linear-gradient(135deg,#D97706,#F59E0B)'],
    [/pepper.?soup|ogbono|egusi|okra|efo|oha/,   '🍲','linear-gradient(135deg,#EF4444,#FF6B35)'],
    [/beans|akara|moi.?moi|gbegiri|ewa/,         '🫘','linear-gradient(135deg,#92400E,#B45309)'],
    [/yam|pounded|eba|fufu|amala|semo|tuwo/,     '🥘','linear-gradient(135deg,#B45309,#D97706)'],
    [/plantain|dodo|boli/,                       '🍌','linear-gradient(135deg,#EAB308,#FF9A3C)'],
    [/suya|kebab|stick/,                         '🍢','linear-gradient(135deg,#DC2626,#FF6B35)'],
    [/shawarma|wrap/,                            '🌯','linear-gradient(135deg,#7C3AED,#A855F7)'],
    [/juice|chapman|smoothie|zobo|kunun/,        '🥤','linear-gradient(135deg,#EC4899,#F9A8D4)'],
    [/water|soda|coke|pepsi|fanta|malt/,         '🍾','linear-gradient(135deg,#0EA5E9,#7DD3FC)'],
    [/snack|biscuit|chin.?chin|puff|cake/,       '🍪','linear-gradient(135deg,#92400E,#B45309)'],
    [/egg|omelette/,                             '🍳','linear-gradient(135deg,#EAB308,#FBBF24)'],
    [/salad|veggie|vegetable/,                   '🥗','linear-gradient(135deg,#16A34A,#06D6A0)'],
    [/pizza/,                                    '🍕','linear-gradient(135deg,#EF4444,#FF6B35)'],
    [/rice/,                                     '🍚','linear-gradient(135deg,#FF6B35,#FFA07A)'],
    [/nkwobi|isi.?ewu|ofe|bitterleaf/,          '🍵','linear-gradient(135deg,#78350F,#B45309)'],
  ];
  for (const [re, emoji, gradient] of cases) {
    if (re.test(d)) return { emoji, gradient };
  }
  const fb: Record<MealType, { emoji: string; gradient: string }> = {
    breakfast: { emoji: '🌅', gradient: 'linear-gradient(135deg,#F97316,#FBBF24)' },
    lunch:     { emoji: '🍽️', gradient: 'linear-gradient(135deg,#FF416C,#FF6B35)' },
    dinner:    { emoji: '🌙', gradient: 'linear-gradient(135deg,#4F46E5,#7C3AED)' },
    snack:     { emoji: '🍏', gradient: 'linear-gradient(135deg,#06D6A0,#4CC9F0)' },
  };
  return fb[mt] ?? fb.lunch;
}

function getTopFoods(credits: FoodCredit[], limit = 6) {
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good afternoon', emoji: '☀️' };
  return { text: 'Good evening', emoji: '🌙' };
}

function fmtAmt(n: number) {
  return n >= 1000 ? `₦${(n / 1000).toFixed(1)}k` : `₦${n}`;
}

// ── Spending ring ─────────────────────────────────────────
function SpendRing({ spent, budget }: { spent: number; budget: number }) {
  const W = 130, r = 50, cx = 65, cy = 65;
  const circ = 2 * Math.PI * r;
  const pct  = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const color = pct >= 1 ? RED : pct >= 0.75 ? GOLD : G;
  return (
    <svg width={W} height={W} style={{ overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={GBDR} strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={color} style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
        {budget > 0 ? `${Math.round(pct * 100)}%` : '—'}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={MUT} style={{ fontSize: '0.5rem', fontWeight: 600 }}>
        {budget > 0 ? 'of budget' : 'no limit'}
      </text>
    </svg>
  );
}

// ── AI prompt builder ─────────────────────────────────────
function buildAIPrompt(payload: Record<string, unknown>) {
  const { credits = [], analytics, vendors = [], budget = 0 } = payload as {
    credits: { meal_type?: string; amount: number; purchase_date?: string }[];
    analytics?: { weekly_total?: number; monthly_total?: number; daily_average?: number; total_outstanding?: number; unpaid_count?: number };
    vendors: { vendor_name: string; total_spent: number; total_meals: number }[];
    budget: number;
  };

  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const fmt  = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
  const todayName = DAYS[new Date().getDay()];
  type MT = 'breakfast'|'lunch'|'dinner'|'snack'|'unknown';
  const typeMap: Record<MT,{count:number;total:number}> = {
    breakfast:{count:0,total:0},lunch:{count:0,total:0},
    dinner:{count:0,total:0},snack:{count:0,total:0},unknown:{count:0,total:0},
  };
  (credits as {meal_type?:string;amount:number}[]).forEach(c => {
    const t = (c.meal_type ?? 'unknown') as MT;
    (typeMap[t] ?? typeMap.unknown).count++;
    (typeMap[t] ?? typeMap.unknown).total += Number(c.amount);
  });
  const mealLines = Object.entries(typeMap).filter(([,v])=>v.count>0)
    .map(([k,v])=>`  • ${k}: ${v.count} meals, ${fmt(v.total)}, avg ${fmt(v.total/v.count)}`).join('\n');
  const dowMap: Record<string,number> = {};
  DAYS.forEach(d => { dowMap[d] = 0; });
  (credits as {purchase_date?:string;amount:number}[]).forEach(c => {
    if (!c.purchase_date) return;
    const d = DAYS[new Date(c.purchase_date+'T00:00:00').getDay()];
    dowMap[d] = (dowMap[d]??0) + Number(c.amount);
  });
  const topDay   = Object.entries(dowMap).sort((a,b)=>b[1]-a[1])[0];
  const breakfastRate = (credits as {meal_type?:string}[]).length
    ? Math.round((typeMap.breakfast.count/(credits as {meal_type?:string}[]).length)*100) : 0;
  const topVendor = [...vendors].sort((a,b)=>b.total_spent-a.total_spent)[0];

  const dataContext = `
TODAY: ${todayName}
MEAL BREAKDOWN:\n${mealLines || '  None recorded'}
  Breakfast presence: ${breakfastRate}% of days
DAY-OF-WEEK SPEND: ${Object.entries(dowMap).map(([d,a])=>`${d}: ${fmt(a)}`).join(' | ')}
  Heaviest: ${topDay?`${topDay[0]} (${fmt(topDay[1])})`: 'N/A'}
VENDORS: ${vendors.map(v=>`${v.vendor_name}(${v.total_meals}x,${fmt(v.total_spent)})`).join(', ')||'None'}
STATS: Weekly ${fmt(analytics?.weekly_total??0)} | Monthly ${fmt(analytics?.monthly_total??0)} | Daily avg ${fmt(analytics?.daily_average??0)} | Outstanding ${fmt(analytics?.total_outstanding??0)}
BUDGET: ${budget>0?fmt(budget)+'/month':'Not set'}
FAVOURITE VENDOR: ${topVendor?.vendor_name??'unknown'}
`.trim();

  const systemPrompt = `You are a sharp, caring personal food doctor for a Nigerian professional. Speak directly, cite real numbers, use their actual vendor names. Respond in this exact structure:

## Health Score
X/10. [One blunt sentence on their food health.]

## What I See In Your Data
- [emoji] [Pattern with real number or vendor name]
- [emoji] [Another specific pattern]
- [emoji] [Third pattern — good or bad]

## Doctor's Verdict
[2–3 sentences. Real health implications of their specific habits. Name the worst habit.]

## Today's Forecast (${todayName})
[2 sentences. Predict which vendor, what meal, and roughly how much they'll spend today based on their ${todayName} pattern.]

## Your Treatment Plan
1. [Specific action with a vendor or meal type named]
2. [Second action]
3. [Financial/budget action if relevant]

Nigerian context: healthy daily food budget ₦2,000–₦4,000. Skipping breakfast = red flag. Outstanding debt > ₦10k = stress eating risk.`;

  return { systemPrompt, dataContext };
}

// ── AI Doctor sheet ───────────────────────────────────────
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
        const { systemPrompt, dataContext } = buildAIPrompt(payload as Record<string, unknown>);
        await streamGemini(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: `Analyze my food data:\n\n${dataContext}` },
          ],
          (acc) => setText(acc),
          { maxTokens: 900, temperature: 0.65 },
        );
      } catch (err) { setError(err instanceof Error ? err.message : 'Network error. Check your connection.'); }
      finally { setLoading(false); }
    })();
  }, [open, payload]);

  const close = () => { fetched.current = false; setText(''); onClose(); };
  const sections = text.split(/^## /m).filter(Boolean).map(s => {
    const [h, ...r] = s.split('\n'); return { h: h.trim(), body: r.join('\n').trim() };
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
          <motion.div key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
              background: 'linear-gradient(180deg,#14151D 0%,#0D0E15 100%)',
              borderRadius: '28px 28px 0 0', maxHeight: '90dvh', overflowY: 'auto',
              paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
              border: `1px solid ${BDR}`, borderBottom: 'none',
            }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 18px', borderBottom: `1px solid ${BDR}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 16,
                  background: 'linear-gradient(135deg,#06D6A0,#4CC9F0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(6,214,160,0.4)' }}>
                  <Sparkles size={22} color="#000" />
                </div>
                <div>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: TXT }}>Food Doctor AI</p>
                  <p style={{ fontSize: '0.62rem', color: MUT, marginTop: 1 }}>Powered by Gemini Flash Lite</p>
                </div>
              </div>
              <button onClick={close} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${BDR}`, background: CARD2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={MUT} />
              </button>
            </div>
            {/* Content */}
            <div style={{ padding: '16px 20px' }}>
              {loading && !text && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 22,
                    background: 'linear-gradient(135deg,rgba(6,214,160,0.2),rgba(76,201,240,0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid rgba(6,214,160,0.3)` }}>
                    <Loader2 size={28} style={{ color: G, animation: 'spin 1s linear infinite' }} />
                  </div>
                  <p style={{ fontSize: '0.82rem', color: MUT, fontWeight: 500 }}>Analysing your food patterns…</p>
                </div>
              )}
              {error && (
                <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(255,65,108,0.1)', border: `1px solid rgba(255,65,108,0.3)`, color: RED, fontSize: '0.8rem' }}>{error}</div>
              )}
              {sections.map(({ h, body }, i) => {
                const isScore   = h.toLowerCase().includes('health score');
                const isPred    = h.toLowerCase().includes('forecast') || h.toLowerCase().includes('prediction');
                const isTreat   = h.toLowerCase().includes('treatment') || h.toLowerCase().includes('plan');
                const isPattern = h.toLowerCase().includes('see') || h.toLowerCase().includes('pattern');
                const accent    = isScore ? G : isPred ? GOLD : isTreat ? BLUE : isPattern ? ORG : TXT;
                const bgColor   = `${accent}12`;
                const borderCol = `${accent}30`;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.07 }}
                    style={{ marginBottom: 12, padding: '14px 16px', borderRadius: 20,
                      background: bgColor, border: `1px solid ${borderCol}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
                      <p style={{ fontSize: '0.68rem', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
                      {isScore && body.match(/\d+\/10/) && (
                        <span style={{ marginLeft: 'auto', padding: '2px 12px', borderRadius: 20, background: G, fontSize: '0.72rem', fontWeight: 800, color: '#000' }}>
                          {body.match(/\d+\/10/)?.[0]}
                        </span>
                      )}
                    </div>
                    {body.split('\n').filter(Boolean).map((line, j) => (
                      <p key={j} style={{ fontSize: '0.8rem', lineHeight: 1.7, color: 'rgba(240,242,248,0.8)', marginBottom: 4 }}>{line}</p>
                    ))}
                  </motion.div>
                );
              })}
              {loading && text.length > 0 && sections.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: MUT, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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

  const [selectedDate,   setSelectedDate]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDoctor,     setShowDoctor]      = useState(false);
  const [showAdd,        setShowAdd]         = useState(false);
  const [addPrefill,     setAddPrefill]      = useState<Partial<FoodCreditCreate>>();
  const [editCredit,     setEditCredit]      = useState<FoodCredit | null>(null);
  const [showConfirm,    setShowConfirm]     = useState(false);
  const [showBudget,     setShowBudget]      = useState(false);
  const [budgetInput,    setBudgetInput]     = useState(budget);
  const [paying,         setPaying]          = useState(false);
  const [payingVendor,   setPayingVendor]    = useState<string | null>(null);
  const [currentView,    setCurrentView]     = useState<'main'|'cart'|'history'>('main');
  const [activeCategory, setActiveCategory]  = useState<MealType|'all'>('all');
  const [selHistoryMonth,setSelHistoryMonth] = useState('all');
  const [showDayPay,     setShowDayPay]      = useState(false);

  useEffect(() => { if (searchParams.get('new') === '1') setShowAdd(true); }, [searchParams]);

  const { data: unpaid        = [] } = useQuery({ queryKey: ['food-credits','unpaid'],  queryFn: () => foodVendorApi.credits.list({ paid: false }) });
  const { data: allCredits    = [] } = useQuery({ queryKey: ['food-credits','all'],     queryFn: () => foodVendorApi.credits.listAll() });
  const { data: payments      = [] } = useQuery({ queryKey: ['food-payments'],          queryFn: () => foodVendorApi.payments() });
  const { data: analytics }          = useQuery({ queryKey: ['food-analytics'],         queryFn: () => foodVendorApi.analytics() });
  const { data: vendors       = [] } = useQuery({ queryKey: ['food-vendors'],           queryFn: () => foodVendorApi.vendorBreakdown() });
  const { data: monthlySummary= [] } = useQuery({ queryKey: ['food-monthly'],           queryFn: () => foodVendorApi.monthlySummary(6) });

  // ── Computed ─────────────────────────────────────────────
  const today       = format(new Date(), 'yyyy-MM-dd');
  const isToday     = selectedDate === today;
  const dailyBudget = budget > 0 ? Math.round(budget / 30) : 0;
  const greeting    = getGreeting();

  // Per-day data map — powers the 14-day navigator
  const dayMap = useMemo(() => {
    const m = new Map<string, { credits: FoodCredit[]; spent: number; topEmoji: string }>();
    allCredits.forEach(c => {
      if (!m.has(c.purchase_date)) m.set(c.purchase_date, { credits: [], spent: 0, topEmoji: '' });
      const d = m.get(c.purchase_date)!;
      d.credits.push(c);
      d.spent += Number(c.amount);
      if (!d.topEmoji) d.topEmoji = getFoodVisual(c.meal_description, c.meal_type).emoji;
    });
    return m;
  }, [allCredits]);

  // Streak — consecutive days with at least one meal recorded
  const streak = useMemo(() => {
    let s = 0, d = new Date();
    while (s < 30 && dayMap.has(format(d, 'yyyy-MM-dd'))) { s++; d = subDays(d, 1); }
    return s;
  }, [dayMap]);

  // 14-day strip
  const days14 = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d   = subDays(new Date(), 13 - i);
    const str = format(d, 'yyyy-MM-dd');
    const info= dayMap.get(str);
    return { date: str, dl: format(d, 'EEE'), dn: format(d, 'd'), info };
  }), [dayMap]);

  const dayCredits = useMemo(() => allCredits.filter(c => c.purchase_date === selectedDate), [allCredits, selectedDate]);
  const daySpent   = useMemo(() => dayCredits.reduce((s, c) => s + Number(c.amount), 0), [dayCredits]);
  const dayUnpaid  = useMemo(() => dayCredits.filter(c => !c.paid), [dayCredits]);

  // Group by time of day
  const timeline = useMemo(() => {
    const grps: Record<'morning'|'afternoon'|'evening', FoodCredit[]> = { morning: [], afternoon: [], evening: [] };
    dayCredits.forEach(c => {
      const mt = (c.meal_type ?? 'lunch') as MealType;
      if (mt === 'breakfast')            grps.morning.push(c);
      else if (mt === 'lunch')           grps.afternoon.push(c);
      else                               grps.evening.push(c);
    });
    return grps;
  }, [dayCredits]);

  const filteredDay = useMemo(
    () => activeCategory === 'all' ? dayCredits : dayCredits.filter(c => (c.meal_type ?? 'snack') === activeCategory),
    [dayCredits, activeCategory],
  );

  const topFoods        = useMemo(() => getTopFoods(allCredits), [allCredits]);
  const totalUnpaidAmt  = unpaid.reduce((s, c) => s + Number(c.amount), 0);
  const budgetPct       = dailyBudget > 0 ? Math.min(daySpent / dailyBudget, 1) : 0;
  const budgetColor     = budgetPct >= 1 ? RED : budgetPct >= 0.75 ? GOLD : G;

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

  const historyMonthOpts = useMemo(() => {
    const opts = [{ key: 'all', label: 'All Time' }];
    for (let i = 0; i < 6; i++) { const d = subMonths(new Date(), i); opts.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') }); }
    return opts;
  }, []);

  const filteredPayments = useMemo(
    () => selHistoryMonth === 'all' ? payments : payments.filter(p => p.paid_at.slice(0, 7) === selHistoryMonth),
    [payments, selHistoryMonth],
  );

  const monthlyChartData = useMemo(() =>
    monthlySummary.map(m => ({ label: format(new Date(m.month + '-01'), 'MMM'), spent: Number(m.total_spent) })),
  [monthlySummary]);

  const doctorPayload = useMemo(() => ({ credits: allCredits, analytics, vendors, budget }), [allCredits, analytics, vendors, budget]);

  // ── Actions ───────────────────────────────────────────────
  const runPay = async (creditIds: string[], label: string, creds: FoodCredit[]) => {
    setPaying(true);
    try {
      const payment = await foodVendorApi.pay(creditIds, label);
      storePayment(payment.id, label, creds);
      invalidateAll(qc);
      addToast({ type: 'success', title: 'Tab cleared!', message: 'Expense recorded.' });
      setShowConfirm(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Payment failed', message: err instanceof Error ? err.message : '' });
    } finally { setPaying(false); }
  };

  const handlePayAll    = () => runPay(unpaid.map(c => c.id), unpaid.map(c => c.vendor_name).filter((v,i,a)=>a.indexOf(v)===i).join(', '), unpaid);
  const handlePayDay    = () => { if (!dayUnpaid.length) return; runPay(dayUnpaid.map(c => c.id), `Day: ${selectedDate}`, dayUnpaid).then(()=>setShowDayPay(false)); };
  const handlePayVendor = (vn: string) => { const e = vendorUnpaidMap[vn]; if (!e) return; setPayingVendor(vn); runPay(e.ids, vn, e.credits).finally(()=>setPayingVendor(null)); };
  const handleCreate    = async (data: FoodCreditCreate) => { await foodVendorApi.credits.create(data); invalidateAll(qc); addToast({ type: 'success', title: 'Added to your tab' }); setShowAdd(false); setAddPrefill(undefined); };
  const handleUpdate    = async (data: FoodCreditCreate) => { if (!editCredit) return; await foodVendorApi.credits.update(editCredit.id, data); invalidateAll(qc); addToast({ type: 'success', title: 'Updated' }); setEditCredit(null); };
  const handleDelete    = async (id: string) => { try { await foodVendorApi.credits.delete(id); invalidateAll(qc); addToast({ type: 'success', title: 'Removed' }); } catch (err) { addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' }); } };
  const handleSaveBudget= () => { saveBudget(budgetInput); addToast({ type: 'success', title: 'Budget saved' }); setShowBudget(false); };

  const openAdd = (prefill?: Partial<FoodCreditCreate>) => {
    setAddPrefill({ ...prefill, purchase_date: selectedDate });
    setShowAdd(true);
  };

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: unpaid.length > 0 ? 140 : 96 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .fspin{animation:spin 1s linear infinite} ::-webkit-scrollbar{display:none}`}</style>

      <AnimatePresence mode="wait">

        {/* ═══════════════════ MAIN VIEW ═══════════════════════ */}
        {currentView === 'main' && (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* ── Hero header ── */}
            <div style={{
              background: 'linear-gradient(160deg,#1A0A20 0%,#0D0A18 50%,#08090E 100%)',
              padding: '20px 20px 24px', position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative orb */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,107,53,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <p style={{ fontSize: '0.65rem', color: MUT, fontWeight: 600, marginBottom: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {greeting.emoji} {greeting.text}
                  </p>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: TXT, lineHeight: 1.1 }}>My Food Tab</h1>
                  {streak > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                      <Flame size={13} color={ORG} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: ORG }}>{streak} day streak</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 9 }}>
                  <button onClick={() => { setBudgetInput(budget); setShowBudget(true); }}
                    style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BDR}`, background: CARD2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <SlidersHorizontal size={15} color={MUT} />
                  </button>
                  <button onClick={() => setCurrentView('history')}
                    style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BDR}`, background: CARD2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <History size={15} color={MUT} />
                  </button>
                  <button onClick={() => setCurrentView('cart')} style={{ position: 'relative', width: 40, height: 40, borderRadius: 14, border: 'none', background: unpaid.length > 0 ? ORG : CARD2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ShoppingBag size={15} color={unpaid.length > 0 ? '#000' : MUT} />
                    {unpaid.length > 0 && (
                      <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, background: RED, color: TXT, fontSize: '0.52rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${BG}` }}>
                        {unpaid.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Monthly stat pills */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {[
                  { label: 'This month', value: fmtAmt(analytics?.monthly_total ?? 0), color: TXT },
                  { label: 'Outstanding', value: fmtAmt(analytics?.total_outstanding ?? totalUnpaidAmt), color: RED },
                  { label: 'Avg/day', value: fmtAmt(analytics?.daily_average ?? 0), color: GOLD },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ flex: 1, padding: '8px 10px', borderRadius: 14, background: GBDR, border: `1px solid ${BDR}`, textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>{value}</p>
                    <p style={{ fontSize: '0.5rem', color: MUT, fontWeight: 600 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 14-Day Navigator ── */}
            <div style={{ padding: '16px 0 0', background: CARD, borderBottom: `1px solid ${BDR}` }}>
              <p style={{ fontSize: '0.6rem', color: MUT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 20px 10px' }}>Pick A Day</p>
              <div style={{ display: 'flex', gap: 6, padding: '0 16px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {days14.map(({ date, dl, dn, info }) => {
                  const sel   = date === selectedDate;
                  const isT   = date === today;
                  const over  = dailyBudget > 0 && info && info.spent > dailyBudget;
                  const accent = over ? RED : info ? G : 'transparent';
                  return (
                    <motion.button key={date} whileTap={{ scale: 0.92 }} onClick={() => setSelectedDate(date)} style={{
                      flexShrink: 0, width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '10px 4px 8px', borderRadius: 18, border: sel ? 'none' : `1px solid ${BDR}`,
                      cursor: 'pointer',
                      background: sel ? `linear-gradient(135deg,${ORG},${RED})` : CARD2,
                      boxShadow: sel ? `0 4px 16px rgba(255,107,53,0.4)` : 'none',
                      transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: sel ? 'rgba(255,255,255,0.8)' : MUT, textTransform: 'uppercase' }}>{dl}</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 900, lineHeight: 1, color: sel ? '#fff' : isT ? ORG : TXT }}>{dn}</span>
                      {info ? (
                        <>
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{info.topEmoji}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', fontWeight: 700, color: sel ? 'rgba(255,255,255,0.8)' : accent !== 'transparent' ? accent : MUT }}>
                            {fmtAmt(info.spent)}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)' }}>—</span>
                      )}
                      {isT && !sel && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ORG, marginTop: -2 }} />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── Day summary ── */}
            <div style={{ margin: '14px 16px 0', background: CARD, borderRadius: 24, border: `1px solid ${BDR}`, overflow: 'hidden' }}>
              {/* Date label */}
              <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: MUT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isToday ? '📍 Today' : format(new Date(selectedDate + 'T00:00:00'), 'EEEE')}
                  </p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: TXT }}>
                    {format(new Date(selectedDate + 'T00:00:00'), 'd MMMM yyyy')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {dayUnpaid.length > 0 && (
                    <button onClick={() => setShowDayPay(true)} style={{ padding: '7px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', background: ORG, color: '#000', fontSize: '0.65rem', fontWeight: 800 }}>
                      Pay · {fmtAmt(dayUnpaid.reduce((s, c) => s + Number(c.amount), 0))}
                    </button>
                  )}
                  <button onClick={() => openAdd()} style={{ width: 36, height: 36, borderRadius: 13, border: 'none', background: ORG, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus size={17} color="#000" strokeWidth={2.8} />
                  </button>
                </div>
              </div>
              {/* Stats row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 16px', gap: 16 }}>
                <SpendRing spent={daySpent} budget={dailyBudget} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Spent', value: fmtAmt(daySpent), color: budgetColor },
                    { label: 'Paid', value: fmtAmt(dayCredits.filter(c=>c.paid).reduce((s,c)=>s+Number(c.amount),0)), color: G },
                    { label: 'On tab', value: fmtAmt(dayUnpaid.reduce((s,c)=>s+Number(c.amount),0)), color: RED },
                    { label: 'Meals', value: String(dayCredits.length), color: TXT, plain: true },
                  ].map(({ label, value, color, plain }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.62rem', color: MUT, fontWeight: 600 }}>{label}</span>
                      <span style={{ fontFamily: plain?'var(--font-display)':'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800, color }}>{value}</span>
                    </div>
                  ))}
                  {dailyBudget > 0 && (
                    <div style={{ marginTop: 2 }}>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${budgetPct*100}%`, borderRadius: 2, background: `linear-gradient(90deg,${budgetColor},${budgetColor}aa)`, transition: 'width 0.7s ease' }} />
                      </div>
                      <p style={{ fontSize: '0.5rem', color: MUT, marginTop: 3 }}>Daily limit: {fmtAmt(dailyBudget)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Category filter ── */}
            <div style={{ display: 'flex', gap: 8, padding: '14px 16px 4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {(['all','breakfast','lunch','dinner','snack'] as const).map(cat => {
                const active = activeCategory === cat;
                const meta   = cat !== 'all' ? MEAL_META[cat] : null;
                const Icon   = meta?.icon;
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                    borderRadius: 20, border: `1px solid ${active ? 'transparent' : BDR}`,
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                    background: active ? (meta?.color ?? ORG) : CARD2,
                    color: active ? '#000' : MUT, fontSize: '0.72rem', fontWeight: 700,
                    boxShadow: active ? `0 4px 12px ${meta?.color ?? ORG}50` : 'none',
                  }}>
                    {Icon && <Icon size={12} />}
                    {cat === 'all' ? 'All' : MEAL_META[cat].label}
                  </button>
                );
              })}
            </div>

            {/* ── Meal timeline ── */}
            <div style={{ padding: '12px 16px 0' }}>
              {filteredDay.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', background: CARD, borderRadius: 22, border: `1px solid ${BDR}`, marginTop: 8 }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🍽️</div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: TXT, marginBottom: 6 }}>
                    {activeCategory !== 'all' ? `No ${MEAL_META[activeCategory].label.toLowerCase()} yet` : 'Nothing here yet'}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: MUT, marginBottom: 18 }}>
                    {isToday ? "What'd you eat today?" : 'No meals recorded for this day'}
                  </p>
                  <button onClick={() => openAdd({ meal_type: activeCategory !== 'all' ? activeCategory : undefined })}
                    style={{ padding: '10px 24px', borderRadius: 20, border: 'none', background: `linear-gradient(135deg,${ORG},${RED})`, color: '#000', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 14px rgba(255,107,53,0.4)` }}>
                    + Add to Tab
                  </button>
                </div>
              ) : (
                /* Group by meal_type sections when showing all */
                activeCategory === 'all' ? (
                  <>
                    {(['morning','afternoon','evening'] as const).map(period => {
                      const mealTypeMap: Record<typeof period, MealType[]> = {
                        morning: ['breakfast'],
                        afternoon: ['lunch'],
                        evening: ['dinner','snack'],
                      };
                      const items = dayCredits.filter(c => mealTypeMap[period].includes((c.meal_type ?? 'lunch') as MealType));
                      if (items.length === 0 && !isToday) return null;
                      const periodMeta = {
                        morning:   { emoji: '🌅', label: 'Morning',   color: '#FFB347' },
                        afternoon: { emoji: '☀️',  label: 'Afternoon', color: ORG },
                        evening:   { emoji: '🌙', label: 'Evening',   color: '#A78BFA' },
                      }[period];
                      return (
                        <div key={period} style={{ marginBottom: 16 }}>
                          {/* Period header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ fontSize: '1rem' }}>{periodMeta.emoji}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: periodMeta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{periodMeta.label}</span>
                              {items.length > 0 && <span style={{ fontSize: '0.58rem', color: MUT }}>· {items.length} item{items.length !== 1 ? 's' : ''}</span>}
                            </div>
                            <button onClick={() => openAdd({ meal_type: mealTypeMap[period][0] })}
                              style={{ fontSize: '0.6rem', color: periodMeta.color, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              + Add
                            </button>
                          </div>
                          {items.length === 0 && isToday && (
                            <div style={{ padding: '14px 16px', borderRadius: 16, border: `1px dashed ${BDR}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: '1.2rem' }}>＋</span>
                              <span style={{ fontSize: '0.72rem', color: MUT }}>Nothing recorded yet for {periodMeta.label.toLowerCase()}</span>
                            </div>
                          )}
                          <AnimatePresence>
                            {items.map((credit, i) => {
                              const vis   = getFoodVisual(credit.meal_description, credit.meal_type);
                              const label = credit.meal_description || credit.vendor_name;
                              const meta  = MEAL_META[(credit.meal_type ?? 'lunch') as MealType];
                              return (
                                <motion.div key={credit.id}
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.2, delay: i * 0.05 }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 20, marginBottom: 8, background: CARD, border: `1px solid ${BDR}`, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                                  {/* Food visual */}
                                  <div style={{ width: 54, height: 54, borderRadius: 17, flexShrink: 0, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', boxShadow: `0 4px 12px rgba(0,0,0,0.4)` }}>
                                    {vis.emoji}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                      <MapPin size={10} color={MUT} />
                                      <span style={{ fontSize: '0.6rem', color: MUT }}>{credit.vendor_name}</span>
                                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: MUT, flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.58rem', color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color: credit.paid ? G : ORG }}>
                                      {fmtAmt(Number(credit.amount))}
                                    </span>
                                    {credit.paid ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.55rem', color: G, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: 'rgba(6,214,160,0.12)' }}>
                                        <CheckCircle2 size={9} /> PAID
                                      </span>
                                    ) : (
                                      <button onClick={() => setEditCredit(credit)}
                                        style={{ fontSize: '0.55rem', color: MUT, fontWeight: 700, background: 'none', border: `1px solid ${BDR}`, borderRadius: 8, cursor: 'pointer', padding: '2px 7px' }}>
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  /* Filtered view */
                  <AnimatePresence>
                    {filteredDay.map((credit, i) => {
                      const vis   = getFoodVisual(credit.meal_description, credit.meal_type);
                      const label = credit.meal_description || credit.vendor_name;
                      const meta  = MEAL_META[(credit.meal_type ?? 'lunch') as MealType];
                      return (
                        <motion.div key={credit.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 20, marginBottom: 8, background: CARD, border: `1px solid ${BDR}` }}>
                          <div style={{ width: 54, height: 54, borderRadius: 17, flexShrink: 0, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem' }}>
                            {vis.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
                            <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 3 }}>{credit.vendor_name} · <span style={{ color: meta.color }}>{meta.label}</span></p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color: credit.paid ? G : ORG }}>{fmtAmt(Number(credit.amount))}</span>
                            {credit.paid ? <CheckCircle2 size={14} color={G} /> : <button onClick={() => setEditCredit(credit)} style={{ fontSize: '0.55rem', color: MUT, background: 'none', border: `1px solid ${BDR}`, borderRadius: 8, cursor: 'pointer', padding: '2px 7px', fontWeight: 700 }}>Edit</button>}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )
              )}
            </div>

            {/* ── Order Again (favourites) ── */}
            {topFoods.length > 0 && (
              <div style={{ padding: '24px 0 0' }}>
                <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 800, color: TXT }}>🔁 Order Again</p>
                  <span style={{ fontSize: '0.58rem', color: MUT }}>Your most eaten</span>
                </div>
                <div style={{ display: 'flex', gap: 10, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {topFoods.map(({ credit, count, avgAmt }) => {
                    const vis   = getFoodVisual(credit.meal_description, credit.meal_type);
                    const label = credit.meal_description || credit.vendor_name;
                    return (
                      <motion.button key={credit.id + label} whileTap={{ scale: 0.94 }}
                        onClick={() => openAdd({ meal_description: credit.meal_description, vendor_name: credit.vendor_name, amount: credit.amount, meal_type: credit.meal_type })}
                        style={{ flexShrink: 0, width: 120, background: CARD, borderRadius: 20, border: `1px solid ${BDR}`, padding: 12, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 9, boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}>
                          {vis.emoji}
                        </div>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: '0.5rem', color: MUT, marginBottom: 5 }}>×{count} ordered</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 800, color: ORG }}>{fmtAmt(Math.round(avgAmt))}</p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Your Spots (vendors as restaurant cards) ── */}
            {vendors.length > 0 && (
              <div style={{ padding: '24px 0 0' }}>
                <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 800, color: TXT }}>📍 Your Spots</p>
                  <span style={{ fontSize: '0.58rem', color: MUT }}>{vendors.length} restaurants</span>
                </div>
                <div style={{ display: 'flex', gap: 12, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {vendors.slice().sort((a, b) => b.total_spent - a.total_spent).map(v => {
                    const owed     = vendorUnpaidMap[v.vendor_name]?.amount ?? 0;
                    const isPaying = payingVendor === v.vendor_name;
                    const vis      = getFoodVisual(v.vendor_name, null);
                    // Rating: 1 visit = 3.0, 5+ = 4.5, 10+ = 4.9
                    const rating   = Math.min(4.9, 3.0 + Math.log10(Math.max(1, v.total_meals)) * 1.2);
                    return (
                      <div key={v.vendor_name} style={{ flexShrink: 0, width: 168, background: CARD, borderRadius: 22, border: `1px solid ${BDR}`, overflow: 'hidden' }}>
                        {/* Cover */}
                        <div style={{ height: 90, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', position: 'relative' }}>
                          {vis.emoji}
                          {owed > 0 && (
                            <span style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 8, background: RED, fontSize: '0.48rem', fontWeight: 800, color: TXT }}>TAB OPEN</span>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ padding: '10px 12px 12px' }}>
                          <p style={{ fontSize: '0.78rem', fontWeight: 800, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{v.vendor_name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                            <Star size={9} fill={GOLD} stroke="none" />
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, color: GOLD }}>{rating.toFixed(1)}</span>
                            <span style={{ fontSize: '0.55rem', color: MUT }}>· {v.total_meals} orders</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${BDR}` }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, color: owed > 0 ? RED : G }}>
                              {owed > 0 ? fmtAmt(owed) : '✓ Clear'}
                            </span>
                            {owed > 0 && (
                              <button onClick={() => handlePayVendor(v.vendor_name)} disabled={isPaying || paying}
                                style={{ padding: '4px 10px', borderRadius: 10, border: 'none', cursor: isPaying ? 'not-allowed' : 'pointer', background: ORG, color: '#000', fontSize: '0.58rem', fontWeight: 800, opacity: isPaying ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                                {isPaying ? <Loader2 size={9} className="fspin" /> : 'Pay'}
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
              width: 'calc(100% - 32px)', margin: '28px 16px 0', padding: '16px 20px', borderRadius: 20,
              background: 'linear-gradient(135deg,#06D6A0 0%,#4CC9F0 100%)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 6px 24px rgba(6,214,160,0.35)',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 15, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={22} color="#000" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontSize: '0.92rem', fontWeight: 900, color: '#000' }}>AI Food Doctor</p>
                <p style={{ fontSize: '0.62rem', color: 'rgba(0,0,0,0.6)', marginTop: 1 }}>Health analysis • Pattern insights • Gemini AI</p>
              </div>
              <ChevronRight size={18} color="rgba(0,0,0,0.5)" />
            </motion.button>

            {/* ── Monthly chart ── */}
            {monthlyChartData.length > 0 && (
              <div style={{ margin: '20px 16px 0', background: CARD, borderRadius: 22, padding: '16px 14px 12px', border: `1px solid ${BDR}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <TrendingUp size={15} color={ORG} />
                  <p style={{ fontSize: '0.8rem', fontWeight: 800, color: TXT }}>Monthly Spending</p>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <XAxis dataKey="label" tick={{ fill: MUT, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} tick={{ fill: MUT, fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      contentStyle={{ background: CARD2, border: `1px solid ${BDR}`, borderRadius: 12, padding: '8px 12px' }}
                      labelStyle={{ color: MUT, fontSize: 10 }}
                      formatter={(v: number) => [`₦${Number(v).toLocaleString()}`, 'Spent']}
                    />
                    <Bar dataKey="spent" radius={[6,6,0,0]}>
                      {monthlyChartData.map((_,i) => (
                        <Cell key={i} fill={i===monthlyChartData.length-1 ? ORG : 'rgba(255,107,53,0.3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════ CART / MY TAB ════════════════ */}
        {currentView === 'cart' && (
          <motion.div key="cart" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.26, ease: [0.16,1,0.3,1] }}>
            {/* Header */}
            <div style={{ background: CARD, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BDR}` }}>
              <button onClick={() => setCurrentView('main')} style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: CARD2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ArrowLeft size={16} color={TXT} />
              </button>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: TXT }}>My Tab</h2>
                <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 1 }}>{unpaid.length} item{unpaid.length !== 1 ? 's' : ''} outstanding</p>
              </div>
              {unpaid.length > 0 && (
                <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(255,65,108,0.15)', fontSize: '0.65rem', fontWeight: 800, color: RED, border: `1px solid rgba(255,65,108,0.3)` }}>
                  {fmtAmt(totalUnpaidAmt)}
                </span>
              )}
            </div>

            <div style={{ padding: '14px 16px' }}>
              {unpaid.length === 0 ? (
                <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: TXT, marginBottom: 8 }}>Tab's clear!</p>
                  <p style={{ fontSize: '0.75rem', color: MUT, marginBottom: 24 }}>All settled with your vendors</p>
                  <button onClick={() => setCurrentView('main')} style={{ padding: '11px 28px', borderRadius: 20, border: 'none', background: `linear-gradient(135deg,${ORG},${RED})`, color: '#000', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Back to Menu
                  </button>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {unpaid.map((credit, i) => {
                      const vis   = getFoodVisual(credit.meal_description, credit.meal_type);
                      const label = credit.meal_description || credit.vendor_name;
                      return (
                        <motion.div key={credit.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60 }}
                          transition={{ duration: 0.18, delay: i * 0.04 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', borderRadius: 20, marginBottom: 10, background: CARD, border: `1px solid ${BDR}` }}>
                          <div style={{ width: 56, height: 56, borderRadius: 17, flexShrink: 0, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}>
                            {vis.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
                            <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 2 }}>{credit.vendor_name} · {format(new Date(credit.purchase_date + 'T00:00:00'), 'd MMM')}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 800, color: ORG }}>
                              {fmtAmt(Number(credit.amount))}
                            </span>
                            <button onClick={() => handleDelete(credit.id)} style={{ width: 28, height: 28, borderRadius: 9, border: `1px solid rgba(255,65,108,0.25)`, background: 'rgba(255,65,108,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <Trash2 size={12} color={RED} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Receipt summary */}
                  <div style={{ background: CARD, borderRadius: 22, padding: '16px 18px', border: `1px solid ${BDR}`, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.75rem', color: MUT }}>Subtotal</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: TXT }}>{fmtAmt(totalUnpaidAmt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: '0.75rem', color: MUT }}>Service charge</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: G }}>FREE</span>
                    </div>
                    <div style={{ borderTop: `1px solid ${BDR}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: TXT }}>TOTAL DUE</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 900, color: ORG }}>
                        {fmtAmt(analytics?.total_outstanding ?? totalUnpaidAmt)}
                      </span>
                    </div>
                  </div>

                  {/* Pay CTA */}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowConfirm(true)} style={{
                    width: '100%', padding: '17px', borderRadius: 20, border: 'none', cursor: 'pointer', marginTop: 12,
                    background: `linear-gradient(135deg,${ORG} 0%,${RED} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: '0 8px 24px rgba(255,107,53,0.45)',
                  }}>
                    <ShoppingBag size={18} color="#000" />
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#000' }}>
                      Clear Tab · {fmtAmt(totalUnpaidAmt)}
                    </span>
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════ HISTORY ════════════════ */}
        {currentView === 'history' && (
          <motion.div key="history" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.26, ease: [0.16,1,0.3,1] }}>
            <div style={{ background: CARD, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BDR}` }}>
              <button onClick={() => setCurrentView('main')} style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${BDR}`, background: CARD2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ArrowLeft size={16} color={TXT} />
              </button>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: TXT }}>Payment History</h2>
                <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 1 }}>All vendor settlements</p>
              </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16 }}>
                {historyMonthOpts.map(opt => {
                  const active = selHistoryMonth === opt.key;
                  return (
                    <button key={opt.key} onClick={() => setSelHistoryMonth(opt.key)} style={{
                      padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? 'transparent' : BDR}`,
                      cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0,
                      background: active ? ORG : CARD2, color: active ? '#000' : MUT, transition: 'all 0.15s',
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {filteredPayments.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: CARD, borderRadius: 20, border: `1px solid ${BDR}` }}>
                  <CalendarDays size={36} color={MUT} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: '0.78rem', color: MUT }}>No payments yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredPayments.map(payment => {
                    const d   = new Date(payment.paid_at);
                    const vis = getFoodVisual(payment.vendor_name, null);
                    return (
                      <div key={payment.id} style={{ background: CARD, borderRadius: 18, padding: '13px 14px', border: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 50, height: 50, borderRadius: 16, flexShrink: 0, background: vis.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                          {vis.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{payment.vendor_name}</p>
                          <p style={{ fontSize: '0.6rem', color: MUT, marginTop: 2 }}>{format(d, 'EEEE, d MMMM yyyy')}</p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color: G }}>₦{Number(payment.amount_paid).toLocaleString()}</p>
                          <p style={{ fontSize: '0.5rem', color: G, fontWeight: 700, marginTop: 2 }}>SETTLED ✓</p>
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

      {/* ── Sticky tab bar ── */}
      {currentView === 'main' && unpaid.length > 0 && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }}
          style={{ position: 'fixed', bottom: 'calc(62px + env(safe-area-inset-bottom))', left: 16, right: 16, zIndex: 300,
            background: 'linear-gradient(135deg,#1A0E08,#200A0F)',
            borderRadius: 22, padding: '13px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: `1px solid rgba(255,107,53,0.3)`,
            boxShadow: '0 8px 32px rgba(255,65,108,0.3)',
          }}>
          <div>
            <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 2 }}>My Tab</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.08rem', fontWeight: 900, color: TXT }}>
              {fmtAmt(totalUnpaidAmt)}
            </p>
          </div>
          <button onClick={() => setCurrentView('cart')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${ORG},${RED})`, color: '#000', fontWeight: 800, fontSize: '0.8rem', boxShadow: `0 4px 12px rgba(255,107,53,0.4)` }}>
            <ShoppingBag size={15} />
            View · {unpaid.length}
          </button>
        </motion.div>
      )}

      {/* ── FAB ── */}
      {currentView === 'main' && unpaid.length === 0 && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => openAdd()} style={{
          position: 'fixed', bottom: 'calc(82px + env(safe-area-inset-bottom))', right: 20, zIndex: 200,
          width: 54, height: 54, borderRadius: 20, background: `linear-gradient(135deg,${ORG},${RED})`, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(255,107,53,0.55)',
        }}>
          <Plus size={24} color="#000" strokeWidth={2.8} />
        </motion.button>
      )}

      {/* ── AI Doctor ── */}
      <AIDoctorSheet open={showDoctor} onClose={() => setShowDoctor(false)} payload={doctorPayload} />

      {/* ── Modals ── */}
      <Modal isOpen={showAdd} title="Add to Tab" onClose={() => { setShowAdd(false); setAddPrefill(undefined); }}>
        <FoodVendorForm
          allVendors={Array.from(new Set(allCredits.map(c => c.vendor_name))).sort()}
          allCredits={allCredits}
          initialValues={addPrefill}
          onSubmit={handleCreate}
          onCancel={() => { setShowAdd(false); setAddPrefill(undefined); }}
        />
      </Modal>

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
            <button onClick={() => handleDelete(editCredit.id)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 14, border: `1.5px solid rgba(255,65,108,0.3)`, background: 'rgba(255,65,108,0.08)', color: RED, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              Remove from Tab
            </button>
          </>
        )}
      </Modal>

      <AnimatePresence>
        {showDayPay && (
          <Modal isOpen={showDayPay} title="Pay This Day" onClose={() => setShowDayPay(false)}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '14px', borderRadius: 16, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', marginBottom: 16 }}>
                <p style={{ fontSize: '0.7rem', color: MUT, marginBottom: 8 }}>{format(new Date(selectedDate+'T00:00:00'), 'EEEE, d MMMM')}</p>
                {Object.entries(dayUnpaid.reduce((acc, c) => { acc[c.vendor_name]=(acc[c.vendor_name]??0)+Number(c.amount); return acc; }, {} as Record<string,number>)).map(([v,a]) => (
                  <div key={v} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: TXT, fontWeight: 600 }}>{v}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: TXT }}>₦{(a as number).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${BDR}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: TXT }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 900, color: ORG }}>₦{dayUnpaid.reduce((s,c)=>s+Number(c.amount),0).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDayPay(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1px solid ${BDR}`, background: CARD2, fontWeight: 700, cursor: 'pointer', color: TXT }}>Cancel</button>
                <button onClick={handlePayDay} disabled={paying} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${ORG},${RED})`, color: '#000', fontWeight: 900, cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying ? 0.7 : 1, fontSize: '0.88rem' }}>
                  {paying ? <Loader2 size={16} className="fspin" /> : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <Modal isOpen={showConfirm} title="Clear Your Tab" onClose={() => setShowConfirm(false)}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', marginBottom: 20, textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: MUT, marginBottom: 8 }}>{unpaid.length} item{unpaid.length !== 1 ? 's' : ''} across your vendors</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 900, color: ORG }}>₦{totalUnpaidAmt.toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1px solid ${BDR}`, background: CARD2, fontWeight: 700, cursor: 'pointer', color: TXT }}>Cancel</button>
                <button onClick={handlePayAll} disabled={paying} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${ORG},${RED})`, color: '#000', fontWeight: 900, cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying ? 0.7 : 1, fontSize: '0.88rem' }}>
                  {paying ? <Loader2 size={16} className="fspin" /> : 'Pay & Clear Tab'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBudget && (
          <Modal isOpen={showBudget} title="Monthly Food Budget" onClose={() => setShowBudget(false)}>
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: '0.78rem', color: MUT, marginBottom: 16 }}>Daily limit = monthly ÷ 30</p>
              <CurrencyInput label="Monthly Budget (₦)" value={budgetInput} onChange={setBudgetInput} />
              {budgetInput > 0 && <p style={{ fontSize: '0.72rem', color: ORG, fontWeight: 600, marginTop: 8 }}>Daily: ₦{Math.round(budgetInput/30).toLocaleString()}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowBudget(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1px solid ${BDR}`, background: CARD2, fontWeight: 700, cursor: 'pointer', color: TXT }}>Cancel</button>
                <button onClick={handleSaveBudget} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${ORG},${RED})`, color: '#000', fontWeight: 900, cursor: 'pointer', fontSize: '0.88rem' }}>Save Budget</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
