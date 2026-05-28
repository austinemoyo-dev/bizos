'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, CheckCircle2, Zap, DollarSign } from 'lucide-react';
import { streamGemini } from '@/lib/ai/gemini';

interface AIAnalyticsPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prevSummary: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expenseBreakdown: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topItems: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repairStats: any[];
  periodLabel: string;
  prevPeriodLabel: string;
}

// Parse the streamed markdown-ish output into named sections
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

function BulletList({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n').map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--glass-bg-light)',
            border: '1px solid var(--glass-border)',
            fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6,
          }}
        >
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{line.slice(0, 2)}</span>
          <span>{line.slice(2).trim() || line}</span>
        </motion.div>
      ))}
    </div>
  );
}

function NumberedList({ text }: { text: string }) {
  const lines = text.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(200,16,46,0.04)',
            border: '1px solid rgba(200,16,46,0.12)',
          }}
        >
          <span style={{
            minWidth: 22, height: 22, borderRadius: '50%',
            background: 'rgba(200,16,46,0.12)', color: '#C8102E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
          }}>
            {i + 1}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6 }}>{line}</span>
        </motion.div>
      ))}
    </div>
  );
}

type TabKey = 'overview' | 'wins' | 'warnings' | 'expenses' | 'actions';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; sectionKey: string }[] = [
  { key: 'overview',  label: 'Overview',  icon: <TrendingUp size={12} />,    sectionKey: 'health'       },
  { key: 'wins',      label: 'Wins',      icon: <CheckCircle2 size={12} />,  sectionKey: 'wins'         },
  { key: 'warnings',  label: 'Watch',     icon: <AlertTriangle size={12} />, sectionKey: 'warnings'     },
  { key: 'expenses',  label: 'Expenses',  icon: <DollarSign size={12} />,    sectionKey: 'expenses'     },
  { key: 'actions',   label: 'Actions',   icon: <Zap size={12} />,           sectionKey: 'next actions' },
];

const TAB_COLORS: Record<TabKey, string> = {
  overview: '#3B82F6',
  wins:     '#10B981',
  warnings: '#F59E0B',
  expenses: '#EF4444',
  actions:  '#C8102E',
};

export function AIAnalyticsPanel({
  summary, prevSummary, expenseBreakdown, topItems, repairStats, periodLabel, prevPeriodLabel,
}: AIAnalyticsPanelProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const sections = parseSections(text);

  const fetchAnalysis = async () => {
    if (!summary) return;
    setLoading(true);
    setText('');
    setExpanded(true);
    setActiveTab('overview');

    const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
    const pct = (cur: number, prev: number) => {
      if (!prev) return 'N/A';
      const diff = ((cur - prev) / Math.abs(prev)) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };
    const curRev    = Number(summary?.total_revenue ?? 0);
    const curExp    = Number(summary?.total_expenses ?? 0);
    const curProfit = Number(summary?.net_profit ?? 0);
    const prevRev   = Number(prevSummary?.total_revenue ?? 0);
    const prevExp   = Number(prevSummary?.total_expenses ?? 0);
    const prevProfit= Number(prevSummary?.net_profit ?? 0);
    const topExp = [...(expenseBreakdown ?? [])]
      .sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount).slice(0, 5)
      .map((e: { category: string; amount: number }) => `${e.category.replace(/_/g, ' ')} ${fmt(e.amount)}`).join(', ');
    const topItms = (topItems ?? []).slice(0, 4)
      .map((i: { item_name: string; total_revenue: number }) => `${i.item_name} ${fmt(i.total_revenue)}`).join('; ');
    const repStr = (repairStats ?? [])
      .map((r: { device_type: string; job_count: number }) => `${r.device_type} ${r.job_count} jobs`).join('; ');

    const dataContext = `PERIOD: ${periodLabel} vs ${prevPeriodLabel}
REVENUE: ${fmt(curRev)} (${pct(curRev, prevRev)} vs prior) | Prior: ${fmt(prevRev)}
EXPENSES: ${fmt(curExp)} (${pct(curExp, prevExp)} vs prior) | Top: ${topExp || 'none'}
PROFIT: ${fmt(curProfit)} — ${curProfit >= 0 ? 'PROFIT' : 'LOSS'} (${pct(curProfit, prevProfit)} vs prior)
CASH: Available ${fmt(Number(summary?.available_balance ?? 0))} | Tithe due ${fmt(Number(summary?.tithe_due ?? 0))}
OPERATIONS: ${summary?.pending_jobs ?? 0} pending jobs | ${summary?.low_stock_count ?? 0} low stock
TOP ITEMS: ${topItms || 'none'}
REPAIRS: ${repStr || 'none'}`;

    const systemPrompt = `You are Dash AI for Dash & Co., a phone repair and electronics shop in Nigeria. Analyze real financial data and speak directly to the owner.

Respond in EXACTLY this format:

## Health
Score: X/10. [One direct sentence on business health.]

## Wins
- [emoji] [Win with exact amount]
- [emoji] [Second win]
- [emoji] [Third win]

## Warnings
- [emoji] [Risk with actual numbers]
- [emoji] [Second warning]
- [emoji] [Third warning]

## Expenses
[1-2 sentences on biggest expense. Name the category and amount.]

## Next Actions
1. [Specific action — name items, amounts, categories]
2. [Second action]
3. [Third action]

Rules: cite real numbers only. Nigerian Naira context: ₦500k+ monthly is strong. If loss, be blunt. No generic advice.`;

    try {
      await streamGemini(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this business data:\n\n${dataContext}` },
        ],
        (acc) => setText(acc),
        { maxTokens: 800, temperature: 0.55 },
      );
      setHasLoaded(true);
    } catch (err) {
      setText(`## Health\nScore: 0/10. ${err instanceof Error ? err.message : 'Analysis failed.'}`);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const activeSection = TABS.find(t => t.key === activeTab)?.sectionKey ?? '';
  const activeText = sections[activeSection] ?? '';
  const activeColor = TAB_COLORS[activeTab];

  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 20,
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden', marginBottom: 'var(--space-5)',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
        }}
        onClick={() => expanded ? setExpanded(false) : (hasLoaded ? setExpanded(true) : fetchAnalysis())}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #8B0018, #C8102E, #D4A535)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(200,16,46,0.4)',
          }}>
            <Sparkles size={16} style={{ color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Analytics Report
            </p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Powered by Groq · Llama 3.3 70B · {periodLabel}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasLoaded && (
            <button
              onClick={(e) => { e.stopPropagation(); fetchAnalysis(); }}
              title="Refresh analysis"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                display: 'flex',
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}

          {!hasLoaded && !loading && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, color: '#C8102E',
              background: 'rgba(200,16,46,0.08)', padding: '3px 9px',
              borderRadius: 10, border: '1px solid rgba(200,16,46,0.2)',
            }}>
              Analyze period
            </span>
          )}

          {loading
            ? <div style={{ width: 14, height: 14, border: '2px solid var(--border-default)', borderTopColor: '#C8102E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : expanded
              ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
              : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          }
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {loading && !text ? (
              <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: '#C8102E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Analyzing {periodLabel} business data…
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{
                  display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none',
                  padding: 'var(--space-3) var(--space-5) 0',
                }}>
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const sectionReady = !!sections[tab.sectionKey];
                    return (
                      <button
                        key={tab.key}
                        onClick={(e) => { e.stopPropagation(); setActiveTab(tab.key); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: '10px 10px 0 0',
                          border: 'none', cursor: 'pointer', flexShrink: 0,
                          fontSize: '0.7rem', fontWeight: 600,
                          background: isActive ? TAB_COLORS[tab.key] : 'var(--bg-overlay)',
                          color: isActive ? 'white' : sectionReady ? 'var(--text-secondary)' : 'var(--text-muted)',
                          opacity: sectionReady || loading ? 1 : 0.4,
                          transition: 'all 0.15s',
                        }}
                        disabled={!sectionReady && !loading}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div style={{
                  padding: 'var(--space-4) var(--space-5)',
                  borderTop: `2px solid ${activeColor}`,
                  minHeight: 80,
                }}>
                  {!activeText && loading ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>
                      <div style={{ width: 10, height: 10, border: '2px solid var(--border-default)', borderTopColor: activeColor, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--text-xs)' }}>Generating {activeTab} analysis…</span>
                    </div>
                  ) : !activeText ? (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Waiting for data…</p>
                  ) : activeTab === 'overview' ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.7,
                        padding: '12px 16px', borderRadius: 12,
                        background: 'var(--glass-bg-light)', border: '1px solid var(--glass-border)',
                      }}
                    >
                      {activeText}
                    </motion.p>
                  ) : activeTab === 'actions' ? (
                    <NumberedList text={activeText} />
                  ) : (
                    <BulletList text={activeText} color={activeColor} />
                  )}

                  {/* Streaming cursor */}
                  {loading && activeText && (
                    <span style={{
                      display: 'inline-block', width: 7, height: 14, borderRadius: 2,
                      background: activeColor, marginLeft: 4,
                      animation: 'pulse 0.9s ease-in-out infinite',
                      verticalAlign: 'middle',
                    }} />
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
      `}</style>
    </div>
  );
}
