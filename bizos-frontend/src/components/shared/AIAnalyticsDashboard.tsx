'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2,
  Zap, DollarSign, BarChart2, MessageSquare, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import { streamGemini, GeminiMessage } from '@/lib/ai/gemini';

// ── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySummary = Record<string, any> | null;

interface Props {
  summary: AnySummary;
  prevSummary: AnySummary;
  expenseBreakdown: { category: string; amount: number; percentage?: number }[];
  topItems: { item_name: string; total_revenue: number; total_quantity: number }[];
  repairStats: { device_type: string; job_count: number; total_revenue: number }[];
  periodLabel: string;
  prevPeriodLabel: string;
  periodCacheKey: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type TabKey = 'overview' | 'wins' | 'warnings' | 'expenses' | 'forecast' | 'actions';

// ── Constants ────────────────────────────────────────────────────────────────

const TABS: {
  key: TabKey;
  label: string;
  Icon: React.ElementType;
  sectionKey: string;
  color: string;
}[] = [
  { key: 'overview',  label: 'Overview',  Icon: TrendingUp,    sectionKey: 'health',       color: '#3B82F6' },
  { key: 'wins',      label: 'Wins',      Icon: CheckCircle2,  sectionKey: 'wins',         color: '#10B981' },
  { key: 'warnings',  label: 'Watch',     Icon: AlertTriangle, sectionKey: 'warnings',     color: '#F59E0B' },
  { key: 'expenses',  label: 'Expenses',  Icon: DollarSign,    sectionKey: 'expenses',     color: '#EF4444' },
  { key: 'forecast',  label: 'Forecast',  Icon: BarChart2,     sectionKey: 'forecast',     color: '#8B5CF6' },
  { key: 'actions',   label: 'Actions',   Icon: Zap,           sectionKey: 'next actions', color: '#C8102E' },
];

const SUGGESTED_QUESTIONS = [
  'Why did my profit change?',
  'What should I restock?',
  "How's my cash flow?",
  'Which repairs make most money?',
  'What are my biggest expenses?',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const parts = raw.split(/^## /m);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    if (nl === -1) continue;
    const key = part.slice(0, nl).trim().toLowerCase();
    sections[key] = part.slice(nl + 1).trim();
  }
  return sections;
}

function extractScore(healthText: string): number | null {
  const m = healthText.match(/score\s*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i)
         ?? healthText.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (!m) return null;
  const s = parseFloat(m[1]);
  return s >= 0 && s <= 10 ? s : null;
}

function scoreColor(s: number | null) {
  if (s === null) return '#8B96A8';
  if (s >= 7) return '#10B981';
  if (s >= 4) return '#F59E0B';
  return '#EF4444';
}

function scoreLabel(s: number | null) {
  if (s === null) return '';
  if (s >= 8) return 'Excellent';
  if (s >= 6) return 'Good';
  if (s >= 4) return 'Fair';
  return 'Needs attention';
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BulletList({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, i) => {
        const cp = line.codePointAt(0) ?? 0;
        const hasEmoji = cp >= 0x2600;
        const emoji = hasEmoji ? String.fromCodePoint(cp) : '•';
        const body  = hasEmoji ? line.slice(emoji.length).trim() : line;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--glass-bg-light)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{emoji}</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {body}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function NumberedList({ text, color }: { text: string; color: string }) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 14px', borderRadius: 10,
            background: `${color}08`, border: `1px solid ${color}22`,
          }}
        >
          <span style={{
            minWidth: 22, height: 22, borderRadius: '50%',
            background: `${color}18`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
          }}>
            {i + 1}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {line}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function AIAnalyticsDashboard({
  summary, prevSummary, expenseBreakdown, topItems, repairStats,
  periodLabel, prevPeriodLabel, periodCacheKey,
}: Props) {
  const [reportText, setReportText]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [analyzedKey, setAnalyzedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<TabKey>('overview');

  // Chat state
  const [chatOpen, setChatOpen]     = useState(false);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const sections   = parseSections(reportText);
  const healthText = sections['health'] ?? '';
  const score      = extractScore(healthText);
  const hasReport  = reportText.length > 0;

  // kept for possible future use
  // const getToken = () => typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';

  // ── Build context string for chat ────────────────────────────────────────
  const buildContext = useCallback((): string => {
    const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
    return [
      `Period: ${periodLabel} vs ${prevPeriodLabel}`,
      `Revenue: ${fmt(summary?.total_revenue ?? 0)} | Expenses: ${fmt(summary?.total_expenses ?? 0)} | Net Profit: ${fmt(summary?.net_profit ?? 0)}`,
      `Available Balance: ${fmt(summary?.available_balance ?? 0)} | Tithe Due: ${fmt(summary?.tithe_due ?? 0)}`,
      `Pending Jobs: ${summary?.pending_jobs ?? 0} | Low Stock Items: ${summary?.low_stock_count ?? 0}`,
      `Previous Revenue: ${fmt(prevSummary?.total_revenue ?? 0)} | Previous Profit: ${fmt(prevSummary?.net_profit ?? 0)}`,
      `Top Expenses: ${expenseBreakdown.sort((a, b) => b.amount - a.amount).slice(0, 4).map(e => `${e.category.replace(/_/g, ' ')} ${fmt(e.amount)}`).join(', ')}`,
      `Top Items: ${topItems.slice(0, 4).map(i => `${i.item_name} ${fmt(i.total_revenue)}`).join(', ')}`,
      `Repairs: ${repairStats.map(r => `${r.device_type} ${r.job_count} jobs`).join(', ')}`,
    ].join('\n');
  }, [summary, prevSummary, expenseBreakdown, topItems, repairStats, periodLabel, prevPeriodLabel]);

  // ── Fetch AI report ──────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!summary) return;
    setLoading(true);
    setReportText('');
    setActiveTab('overview');

    const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
    const pct = (cur: number, prev: number) => {
      if (!prev) return 'N/A';
      const diff = ((cur - prev) / Math.abs(prev)) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };
    const curRev    = Number(summary?.total_revenue    ?? 0);
    const curExp    = Number(summary?.total_expenses   ?? 0);
    const curProfit = Number(summary?.net_profit       ?? 0);
    const prevRev   = Number(prevSummary?.total_revenue    ?? 0);
    const prevExp   = Number(prevSummary?.total_expenses   ?? 0);
    const prevProfit= Number(prevSummary?.net_profit       ?? 0);
    const topExpenses = [...(expenseBreakdown ?? [])]
      .sort((a, b) => b.amount - a.amount).slice(0, 5)
      .map(e => `${e.category.replace(/_/g, ' ')} (${fmt(e.amount)}, ${e.percentage?.toFixed(1) ?? '?'}%)`)
      .join(', ');
    const topItemsStr = (topItems ?? []).slice(0, 5)
      .map(i => `${i.item_name}: ${fmt(i.total_revenue)} revenue, qty ${i.total_quantity}`).join('; ');
    const repairStr = [...(repairStats ?? [])]
      .sort((a, b) => b.job_count - a.job_count)
      .map(r => `${r.device_type}: ${r.job_count} jobs, ${fmt(r.total_revenue)}`).join('; ');
    const marginPct = curRev > 0 ? ((curProfit / curRev) * 100).toFixed(1) : '0';
    const prevMarginPct = prevRev > 0 ? ((prevProfit / prevRev) * 100).toFixed(1) : '0';

    const dataContext = `PERIOD: ${periodLabel} vs ${prevPeriodLabel}
REVENUE
  Current:  ${fmt(curRev)} (${pct(curRev, prevRev)} vs prior)
  Previous: ${fmt(prevRev)}
EXPENSES
  Current:  ${fmt(curExp)} (${pct(curExp, prevExp)} vs prior)
  Previous: ${fmt(prevExp)}
  Top categories: ${topExpenses || 'none'}
PROFIT
  Current:  ${fmt(curProfit)} — ${curProfit >= 0 ? 'PROFIT' : 'LOSS'} (${pct(curProfit, prevProfit)} vs prior)
  Previous: ${fmt(prevProfit)} — ${prevProfit >= 0 ? 'profit' : 'loss'}
  Margin:   ${marginPct}% current vs ${prevMarginPct}% previous
CASH POSITION
  Available balance:  ${fmt(Number(summary?.available_balance ?? 0))}
  Tithe due (unpaid): ${fmt(Number(summary?.tithe_due ?? 0))}
OPERATIONS
  Pending repair jobs: ${summary?.pending_jobs ?? 0}
  Low stock items:     ${summary?.low_stock_count ?? 0}
TOP SELLING ITEMS
  ${topItemsStr || 'No data'}
REPAIR JOBS BY DEVICE
  ${repairStr || 'No data'}`;

    const systemPrompt = `You are Dash AI, the business intelligence engine for Dash & Co., a phone repair and electronics shop in Nigeria. You analyze real financial data and speak directly to the owner.

Respond in EXACTLY this format — use ONLY these section headers, in this order:

## Health
Score: X/10. [One clear sentence on overall business health for this period. Be direct.]

## Wins
- [emoji] [What went well, specific to the data — name exact amounts]
- [emoji] [Second win]
- [emoji] [Third win]

## Warnings
- [emoji] [Risk or concern, tied to actual numbers]
- [emoji] [Second warning]
- [emoji] [Third warning]

## Expenses
[One or two sentences on the biggest expense pattern. Name the category and amount. Say whether it's alarming or expected.]

## Forecast
[2-3 sentences predicting next period based on the current trend. Be specific — project an approximate revenue and profit figure.]

## Next Actions
1. [Specific action tied to the numbers — name items, amounts, categories]
2. [Second action]
3. [Third action]

Rules:
- Every number you cite must come from the provided data
- Nigerian Naira context: ₦50k is a typical day, ₦500k+ month is strong, ₦1M+ is excellent
- If profit is negative, treat it as a crisis — be blunt
- No generic advice ("review your expenses") — always say WHICH and WHY`;

    try {
      await streamGemini(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this business data:\n\n${dataContext}` },
        ],
        (acc) => setReportText(acc),
        { maxTokens: 900, temperature: 0.55 },
      );
      setAnalyzedKey(periodCacheKey);
    } catch (err) {
      setReportText(
        `## Health\nScore: 0/10. ${err instanceof Error ? err.message : 'Analysis failed.'}`,
      );
      setAnalyzedKey(periodCacheKey);
    } finally {
      setLoading(false);
    }
  }, [summary, prevSummary, expenseBreakdown, topItems, repairStats, periodLabel, prevPeriodLabel, periodCacheKey]);

  // ── Auto-load when data or period changes ────────────────────────────────
  useEffect(() => {
    if (summary && periodCacheKey !== analyzedKey && !loading) {
      fetchReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, periodCacheKey]);

  // ── Send chat message ────────────────────────────────────────────────────
  const sendChat = useCallback(async (presetText?: string) => {
    const text = (presetText ?? chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    const withUser = [...messages, userMsg];
    setMessages([...withUser, { role: 'assistant', content: '' }]);
    setChatLoading(true);

    const chatSystem = `You are Dash AI, the business intelligence assistant for Dash & Co., a phone repair and electronics shop in Nigeria.

You have access to the following live business data:

${buildContext()}

Answer the owner's questions conversationally and specifically. Always reference actual numbers from the data above when relevant.
- Keep answers concise: 2–4 sentences for simple questions, up to 6 for complex ones
- Use Nigerian Naira (₦) for all amounts
- If asked about something not in the data, say so clearly
- Be direct and practical — this is a real business owner making real decisions
- Do not repeat the question back or add unnecessary preamble`;

    const geminiMessages: GeminiMessage[] = [
      { role: 'system', content: chatSystem },
      ...withUser.map(m => ({ role: m.role, content: m.content })),
    ];

    try {
      await streamGemini(
        geminiMessages,
        (acc) => setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: acc }]),
        { maxTokens: 450, temperature: 0.5 },
      );
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: err instanceof Error ? err.message : 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, messages, buildContext]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeTabDef  = TABS.find(t => t.key === activeTab)!;
  const activeSection = activeTabDef.sectionKey;
  const activeText    = sections[activeSection] ?? '';
  const activeColor   = activeTabDef.color;

  const cleanHealth = healthText
    .replace(/score\s*:\s*\d+(?:\.\d+)?\s*\/\s*10\.?\s*/i, '')
    .trim();

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden',
      border: '1px solid rgba(200,16,46,0.2)',
      background: 'var(--bg-surface)',
      marginBottom: 'var(--space-5)',
    }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0A0C12 0%, #1a0408 60%, #0A0C12 100%)',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid rgba(200,16,46,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #7B0018, #C8102E 50%, #D4A535)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(200,16,46,0.5)',
            }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-md)', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                Dash AI
              </p>
              <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
                Groq · Llama 3.3 70B · {periodLabel}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Health score badge */}
            {score !== null && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: `${scoreColor(score)}18`,
                  border: `1px solid ${scoreColor(score)}40`,
                  borderRadius: 20, padding: '4px 11px',
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: scoreColor(score), boxShadow: `0 0 6px ${scoreColor(score)}` }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: scoreColor(score) }}>
                  {score}/10 · {scoreLabel(score)}
                </span>
              </motion.div>
            )}

            {/* Spinner while loading */}
            {loading && (
              <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: '#C8102E',
                borderRadius: '50%',
                animation: 'ai-spin 0.8s linear infinite',
              }} />
            )}

            {/* Refresh */}
            {!loading && hasReport && (
              <button
                onClick={() => { setMessages([]); fetchReport(); }}
                title="Re-analyze this period"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 9, cursor: 'pointer',
                  padding: '6px 8px', color: 'rgba(255,255,255,0.45)',
                  display: 'flex', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Health one-liner */}
        <AnimatePresence>
          {cleanHealth && !loading && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 'var(--space-3)',
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.82)',
                lineHeight: 1.6,
              }}
            >
              {cleanHealth}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Loading state in header */}
        {loading && !reportText && (
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 18, height: 18,
              border: '2px solid rgba(255,255,255,0.08)',
              borderTopColor: '#C8102E',
              borderRadius: '50%',
              animation: 'ai-spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.35)' }}>
              Analyzing {periodLabel} business data…
            </p>
          </div>
        )}
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      {(hasReport || loading) && (
        <>
          <div style={{
            display: 'flex', overflowX: 'auto', scrollbarWidth: 'none',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const ready    = !!sections[tab.sectionKey];
              const Icon     = tab.Icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  disabled={!ready && !loading}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '10px 14px',
                    border: 'none', cursor: (ready || loading) ? 'pointer' : 'default',
                    fontSize: '0.65rem', fontWeight: 600,
                    background: isActive ? `${tab.color}12` : 'transparent',
                    color: isActive ? tab.color : ready ? 'var(--text-secondary)' : 'var(--text-muted)',
                    borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                    opacity: (ready || loading) ? 1 : 0.3,
                    transition: 'all 0.15s',
                    letterSpacing: '0.02em',
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                  }}
                >
                  <Icon size={11} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
          <div style={{ padding: 'var(--space-4) var(--space-5)', minHeight: 90 }}>
            {!activeText && loading ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>
                <div style={{
                  width: 10, height: 10,
                  border: `2px solid ${activeColor}30`,
                  borderTopColor: activeColor,
                  borderRadius: '50%',
                  animation: 'ai-spin 0.8s linear infinite',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 'var(--text-xs)' }}>
                  Generating {activeTabDef.label.toLowerCase()} analysis…
                </span>
              </div>
            ) : activeTab === 'overview' ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.75,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {activeText.replace(/score\s*:\s*\d+(?:\.\d+)?\s*\/\s*10\.?\s*/i, '').trim()}
              </motion.p>
            ) : activeTab === 'forecast' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(139,92,246,0.06)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.75,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <BarChart2 size={13} style={{ color: '#8B5CF6' }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    AI Forecast
                  </span>
                </div>
                {activeText}
              </motion.div>
            ) : activeTab === 'actions' ? (
              <NumberedList text={activeText} color={activeColor} />
            ) : (
              <BulletList text={activeText} />
            )}

            {/* Streaming cursor */}
            {loading && activeText && (
              <span style={{
                display: 'inline-block', width: 6, height: 13, borderRadius: 2,
                background: activeColor, marginLeft: 4,
                animation: 'ai-pulse 0.9s ease-in-out infinite',
                verticalAlign: 'middle',
              }} />
            )}
          </div>
        </>
      )}

      {/* ── CHAT SECTION ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {/* Chat toggle header */}
        <button
          onClick={() => {
            setChatOpen(v => !v);
            if (!chatOpen) setTimeout(() => inputRef.current?.focus(), 220);
          }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-5)',
            background: 'none', border: 'none', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent', outline: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8,
              background: chatOpen ? 'rgba(200,16,46,0.12)' : 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>
              <MessageSquare size={13} style={{ color: chatOpen ? '#C8102E' : 'var(--text-muted)' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Ask Dash AI
              </p>
              <p style={{ fontSize: '0.57rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {messages.length > 0 ? `${Math.ceil(messages.length / 2)} question${messages.length > 2 ? 's' : ''}` : 'Ask anything about your business'}
              </p>
            </div>
          </div>
          {chatOpen
            ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          }
        </button>

        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>

                {/* Suggested questions (when empty) */}
                {messages.length === 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-4)' }}>
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => sendChat(q)}
                        disabled={chatLoading}
                        style={{
                          fontSize: '0.65rem', fontWeight: 600,
                          padding: '6px 12px', borderRadius: 20,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)', cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                          transition: 'all 0.15s', outline: 'none',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message thread */}
                {messages.length > 0 && (
                  <div style={{
                    maxHeight: 320, overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    marginBottom: 'var(--space-3)', paddingRight: 2,
                  }}>
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {/* AI avatar dot */}
                        {msg.role === 'assistant' && (
                          <div style={{
                            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                            background: 'linear-gradient(135deg, #7B0018, #C8102E)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginRight: 7, marginTop: 2,
                          }}>
                            <Sparkles size={10} color="#fff" />
                          </div>
                        )}
                        <div style={{
                          maxWidth: '82%',
                          padding: '9px 13px',
                          borderRadius: msg.role === 'user'
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                          background: msg.role === 'user'
                            ? 'linear-gradient(135deg, #C8102E, #9B0D22)'
                            : 'var(--bg-elevated)',
                          border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                          fontSize: 'var(--text-sm)',
                          color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                          lineHeight: 1.6,
                        }}>
                          {msg.content === '' && chatLoading && i === messages.length - 1 ? (
                            <span style={{
                              display: 'inline-block', width: 5, height: 12, borderRadius: 2,
                              background: 'var(--text-muted)',
                              animation: 'ai-pulse 0.9s ease-in-out infinite',
                            }} />
                          ) : msg.content}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Input row */}
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 14, padding: '8px 8px 8px 14px',
                }}>
                  <input
                    ref={inputRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="Ask about your business…"
                    disabled={chatLoading}
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  />
                  <button
                    onClick={() => sendChat()}
                    disabled={!chatInput.trim() || chatLoading}
                    style={{
                      width: 34, height: 34, borderRadius: 10, border: 'none',
                      background: chatInput.trim() && !chatLoading
                        ? 'linear-gradient(135deg, #C8102E, #9B0D22)'
                        : 'var(--bg-overlay)',
                      cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s', flexShrink: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {chatLoading ? (
                      <div style={{
                        width: 12, height: 12,
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'ai-spin 0.8s linear infinite',
                      }} />
                    ) : (
                      <Send size={14} color={chatInput.trim() ? '#fff' : 'var(--text-muted)'} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes ai-spin  { to { transform: rotate(360deg); } }
        @keyframes ai-pulse { 0%,100% { opacity:1; } 50% { opacity:0.15; } }
      `}</style>
    </div>
  );
}
