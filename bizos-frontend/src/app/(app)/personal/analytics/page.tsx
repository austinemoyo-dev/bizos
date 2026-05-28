'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatNaira } from '@/lib/format';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, startOfYear, endOfYear,
} from 'date-fns';
import {
  Sparkles, TrendingUp, TrendingDown, Target, Loader2,
  RefreshCw, Utensils, Car, Wifi, Phone, Receipt,
  PiggyBank, Coins, Wallet, HelpCircle,
} from 'lucide-react';
import { streamGemini } from '@/lib/ai/gemini';
import { ComparisonLineChart, ComparisonPoint } from '@/components/charts/ComparisonLineChart';
import { Skeleton } from '@/components/shared/Skeleton';

type PeriodKey = 'this_week' | 'this_month' | 'last_month' | 'year';

function fmt(d: Date) { return format(d, 'yyyy-MM-dd'); }

function getPeriod(key: PeriodKey) {
  const now = new Date();
  switch (key) {
    case 'this_week':  return { start: fmt(startOfWeek(now, { weekStartsOn: 1 })), end: fmt(endOfWeek(now, { weekStartsOn: 1 })), label: 'This Week' };
    case 'this_month': return { start: fmt(startOfMonth(now)), end: fmt(endOfMonth(now)), label: 'This Month' };
    case 'last_month': { const lm = subMonths(now, 1); return { start: fmt(startOfMonth(lm)), end: fmt(endOfMonth(lm)), label: 'Last Month' }; }
    case 'year':       return { start: fmt(startOfYear(now)), end: fmt(endOfYear(now)), label: 'This Year' };
  }
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'this_week', label: 'Week' }, { key: 'this_month', label: 'Month' },
  { key: 'last_month', label: 'Last Month' }, { key: 'year', label: 'Year' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils, transport: Car, data: Wifi, airtime: Phone,
  bills: Receipt, savings: PiggyBank, tithe: Coins, salary: Wallet, side_income: TrendingUp, gift: Coins,
};
const CATEGORY_COLORS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#8B5CF6','#84CC16','#F97316'];

// ── Section icons for AI response ────────────────────────────────────────────
const SECTION_META: Record<string, { icon: React.ElementType; color: string }> = {
  'financial health score':    { icon: Target,      color: '#7C3AED' },
  'what the numbers say':      { icon: Sparkles,    color: '#4F46E5' },
  'biggest opportunity':       { icon: TrendingUp,  color: '#10B981' },
  'spending intelligence':     { icon: Wallet,      color: '#F59E0B' },
  '30-day action plan':        { icon: Target,      color: '#800000' },
  'forecast':                  { icon: TrendingUp,  color: '#06B6D4' },
};

function getSectionMeta(heading: string) {
  const key = heading.toLowerCase();
  for (const [k, v] of Object.entries(SECTION_META)) {
    if (key.includes(k)) return v;
  }
  return { icon: Sparkles, color: '#7C3AED' };
}

// ── AI Insights panel ─────────────────────────────────────────────────────────
function AIInsightsPanel({ payload, period }: { payload: object; period: string }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [ran, setRan]         = useState(false);

  const run = async () => {
    setLoading(true); setError(''); setText(''); setRan(true);

    const p = payload as {
      summary?: { total_income?: number; total_expenses?: number };
      trend?: { date: string; expenses: number }[];
      expenseBreakdown?: { category: string; amount: number }[];
      incomeBreakdown?: { category: string; amount: number }[];
    };
    const fmt2 = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
    const totalIncome   = Number(p.summary?.total_income   ?? 0);
    const totalExpenses = Number(p.summary?.total_expenses ?? 0);
    const net           = totalIncome - totalExpenses;
    const savingsRate   = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0';

    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dowSpend: Record<string, number> = {};
    DAYS.forEach(d => { dowSpend[d] = 0; });
    (p.trend ?? []).forEach(t => {
      const d = DAYS[new Date(t.date + 'T00:00:00').getDay()];
      dowSpend[d] = (dowSpend[d] ?? 0) + Number(t.expenses);
    });
    const heaviest = Object.entries(dowSpend).sort((a, b) => b[1] - a[1])[0];
    const lightest  = Object.entries(dowSpend).sort((a, b) => a[1] - b[1]).find(([,v]) => v > 0);
    const expLines  = (p.expenseBreakdown ?? []).map(e => `  • ${e.category}: ${fmt2(e.amount)} (${totalExpenses > 0 ? ((e.amount/totalExpenses)*100).toFixed(0) : 0}%)`).join('\n');
    const incLines  = (p.incomeBreakdown  ?? []).map(i => `  • ${i.category}: ${fmt2(i.amount)}`).join('\n');

    const dataCtx = `PERSONAL FINANCE SNAPSHOT — ${period}
SUMMARY
  Income:   ${fmt2(totalIncome)} | Expenses: ${fmt2(totalExpenses)}
  Net: ${fmt2(Math.abs(net))} ${net >= 0 ? 'SURPLUS' : 'DEFICIT'} | Savings rate: ${savingsRate}%
EXPENSE CATEGORIES
${expLines || '  No expense data'}
INCOME SOURCES
${incLines  || '  No income data'}
DAILY SPENDING PATTERN
${Object.entries(dowSpend).map(([d, v]) => `  ${d}: ${fmt2(v)}`).join('\n')}
  Heaviest day: ${heaviest ? `${heaviest[0]} (${fmt2(heaviest[1])})` : 'N/A'}
  Lightest day: ${lightest  ? `${lightest[0]}  (${fmt2(lightest[1])})` : 'N/A'}`;

    const systemPrompt = `You are an expert personal finance analyst for a Nigerian professional.
Analyze their financial data and respond in EXACTLY this format:

## Financial Health Score
Score: X/10. [One sharp sentence: are they saving enough, spending wisely, or in financial danger?]

## What the Numbers Say
- [emoji] [Specific insight — cite exact amounts or percentages]
- [emoji] [Second insight]
- [emoji] [Third insight]

## Biggest Opportunity
[2 sentences. What ONE thing could they do differently to improve their finances? Name the category, amount, and action.]

## Spending Intelligence
- [emoji] [Day-of-week pattern — name the heaviest day and amount]
- [emoji] [Top expense category analysis]
- [emoji] [Income concentration risk or diversification note]

## 30-Day Action Plan
1. [Specific, measurable action — e.g. "Cap food spending at ₦X per week"]
2. [Second action]
3. [Third action]

## Forecast
[2 sentences. If current patterns continue, what will their situation look like in 3 months?]

Rules: every claim must be backed by a number. Nigerian context: savings rate >20% is excellent, <10% is poor. If expenses > income, treat it as urgent.`;

    try {
      await streamGemini(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyse my personal finances:\n\n${dataCtx}` },
        ],
        (acc) => setText(acc),
        { maxTokens: 800, temperature: 0.55 },
      );
    } catch (err) { setError(err instanceof Error ? err.message : 'Connection failed. Try again.'); }
    finally { setLoading(false); }
  };

  // Parse streamed markdown into sections
  const sections = text.split(/^## /m).filter(Boolean).map(s => {
    const [heading, ...rest] = s.split('\n');
    return { heading: heading.trim(), body: rest.join('\n').trim() };
  });

  // Extract health score from first section
  const scoreMatch = text.match(/Score:\s*(\d+)\/10/);
  const score      = scoreMatch ? parseInt(scoreMatch[1]) : null;
  const scoreColor = score !== null ? (score >= 7 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444') : '#7C3AED';

  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 24, overflow: 'hidden', marginBottom: 20, border: '1px solid var(--glass-border)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1b6e 0%, #2e3fa0 100%)',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>AI Finance Analyst</p>
            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)' }}>Groq · Llama 3.3 70B · {period}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {score !== null && (
            <div style={{ padding: '4px 14px', borderRadius: 20, background: scoreColor, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>{score}/10</span>
            </div>
          )}
          <button
            onClick={run}
            disabled={loading}
            style={{
              padding: '8px 16px', borderRadius: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: ran ? 'rgba(255,255,255,0.12)' : '#fff',
              color: ran ? '#fff' : '#1a1b6e',
              fontSize: '0.72rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Analysing…</>
              : ran
                ? <><RefreshCw size={13} /> Refresh</>
                : <><Sparkles size={13} /> Analyse Now</>
            }
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {!ran && !loading && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 20, background: 'rgba(79,70,229,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Sparkles size={24} style={{ color: '#4F46E5' }} />
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Get your AI financial analysis
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Tap "Analyse Now" to get personalised insights, spending intelligence, and a 30-day action plan based on your real data.
            </p>
            <button
              onClick={run}
              style={{ padding: '10px 24px', borderRadius: 20, border: 'none', cursor: 'pointer', background: '#4F46E5', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}
            >
              Analyse Now
            </button>
          </div>
        )}

        {loading && !text && (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={28} style={{ color: '#4F46E5', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Analysing your financial patterns…</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.78rem' }}>
            {error}
          </div>
        )}

        {/* Rendered sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map(({ heading, body }, i) => {
            const meta = getSectionMeta(heading);
            const Icon = meta.icon;
            const isScore = heading.toLowerCase().includes('health score');
            return (
              <div key={i} style={{
                padding: '14px 16px', borderRadius: 18,
                background: isScore ? `${scoreColor}10` : 'var(--bg-card, var(--glass-bg-light))',
                border: `1px solid ${isScore ? `${scoreColor}30` : 'var(--glass-border)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} style={{ color: meta.color }} />
                  </div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {heading}
                  </p>
                </div>
                {body.split('\n').filter(Boolean).map((line, j) => (
                  <p key={j} style={{ fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 3 }}>
                    {line}
                  </p>
                ))}
              </div>
            );
          })}
        </div>

        {/* Streaming raw text before sections parse */}
        {loading && text && sections.length === 0 && (
          <p style={{ fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{text}</p>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PersonalAnalyticsPage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('this_month');
  const period = getPeriod(periodKey);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['personal-summary', period.start, period.end],
    queryFn:  () => analyticsApi.personalSummary({ period_start: period.start, period_end: period.end }),
  });

  const { data: trend, isLoading: loadingTrend } = useQuery({
    queryKey: ['personal-spending-trend', period.start, period.end],
    queryFn:  () => analyticsApi.personalSpendingTrend({ period_start: period.start, period_end: period.end }),
  });

  const { data: expenseBreakdown } = useQuery({
    queryKey: ['personal-category-breakdown', 'expense', period.start, period.end],
    queryFn:  () => analyticsApi.personalCategoryBreakdown({ period_start: period.start, period_end: period.end, tx_type: 'expense' }),
  });

  const { data: incomeBreakdown } = useQuery({
    queryKey: ['personal-category-breakdown', 'income', period.start, period.end],
    queryFn:  () => analyticsApi.personalCategoryBreakdown({ period_start: period.start, period_end: period.end, tx_type: 'income' }),
  });

  const chartData: ComparisonPoint[] = useMemo(() => {
    if (!trend) return [];
    return trend.map(t => ({ label: format(new Date(t.date), 'dd MMM'), current: t.income, previous: t.expenses }));
  }, [trend]);

  const totalIncome   = summary?.total_income   ?? 0;
  const totalExpenses = summary?.total_expenses ?? 0;
  const net           = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(0) : '0';
  const isPositive    = net >= 0;

  const expenseTotal = expenseBreakdown?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const incomeTotal  = incomeBreakdown?.reduce((s, e)  => s + Number(e.amount), 0) ?? 0;

  const aiPayload = useMemo(() => ({
    summary, trend, expenseBreakdown, incomeBreakdown,
  }), [summary, trend, expenseBreakdown, incomeBreakdown]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Analytics" subtitle="AI-powered personal finance insights" />

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriodKey(p.key)} style={{
            flexShrink: 0, padding: '7px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 700,
            background: periodKey === p.key ? '#7C3AED' : 'var(--bg-elevated)',
            color: periodKey === p.key ? '#fff' : 'var(--text-muted)',
            boxShadow: periodKey === p.key ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
            transition: 'all 0.18s',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ── AI Insights — FIRST and PROMINENT ──────────────────────── */}
      <AIInsightsPanel payload={aiPayload} period={period.label} />

      {/* ── Quick stats ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {[
          { label: 'Income',       value: totalIncome,   color: '#10B981', bg: 'rgba(16,185,129,0.08)'  },
          { label: 'Expenses',     value: totalExpenses, color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
          { label: isPositive ? 'Surplus' : 'Deficit', value: Math.abs(net),
            color: isPositive ? '#10B981' : '#EF4444',
            bg: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' },
          { label: 'Savings Rate', value: null, extra: `${savingsRate}%`,
            color: Number(savingsRate) >= 20 ? '#10B981' : Number(savingsRate) >= 10 ? '#F59E0B' : '#EF4444',
            bg: 'rgba(79,70,229,0.08)' },
        ].map(({ label, value, extra, color, bg }) => (
          <div key={label} style={{ padding: '14px 16px', borderRadius: 16, background: bg, border: `1px solid ${color}20` }}>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color, lineHeight: 1 }}>
              {extra ?? (loadingSummary ? '—' : formatNaira(value!))}
            </p>
          </div>
        ))}
      </div>

      {/* ── Income vs Expenses trend chart ──────────────────────────── */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 20, padding: '16px', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Income vs Expenses</p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{period.label} · day by day</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[['#10B981','Income'],['#EF4444','Expenses']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: c }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        {loadingTrend ? <Skeleton width="100%" height={180} /> : chartData.length > 0
          ? <ComparisonLineChart data={chartData} currentLabel="Income" previousLabel="Expenses" height={200} />
          : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</div>
        }
      </div>

      {/* ── Category breakdowns ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="stat-grid">
        {[
          { title: 'Where Money Goes', items: expenseBreakdown, total: expenseTotal, colorOffset: 0 },
          { title: 'Income Sources',   items: incomeBreakdown,  total: incomeTotal,  colorOffset: 4 },
        ].map(({ title, items, total, colorOffset }) => (
          <div key={title} style={{ background: 'var(--bg-elevated)', borderRadius: 20, padding: 16, border: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</p>
            {!items || items.length === 0
              ? <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No data</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((cat, idx) => {
                    const Icon  = CATEGORY_ICONS[cat.category] || HelpCircle;
                    const pct   = total > 0 ? ((cat.amount / total) * 100).toFixed(0) : '0';
                    const color = CATEGORY_COLORS[(idx + colorOffset) % CATEGORY_COLORS.length];
                    return (
                      <div key={cat.category}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={13} style={{ color }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 500, textTransform: 'capitalize' }}>
                              {cat.category.replace('_', ' ')}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700 }}>{formatNaira(cat.amount)}</span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: 5 }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        ))}
      </div>
    </div>
  );
}
