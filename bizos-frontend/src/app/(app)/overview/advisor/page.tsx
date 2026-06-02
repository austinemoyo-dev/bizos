'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cashFlowApi } from '@/lib/api/cash-flow';
import { analyticsApi } from '@/lib/api/analytics';
import { PageHeader } from '@/components/shared/PageHeader';
import { fadeUp } from '@/lib/motion-variants';
import { streamGemini, GeminiMessage } from '@/lib/ai/gemini';
import { useUIStore } from '@/lib/stores/uiStore';
import {
  Sparkles, Target, AlertTriangle, TrendingUp,
  Zap, Activity, Shield, Loader2, RefreshCw,
  Briefcase, User, Scale, BarChart2, Package,
  PiggyBank, Banknote, Award, ChevronRight,
  Send, MessageCircle, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type RiskLevel = 'critical' | 'warning' | 'good';
type Momentum  = 'GROWING' | 'DECLINING' | 'STABLE' | 'VOLATILE';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface Decision {
  question: string;
  recommendation: string;
  reason: string;
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  trendBased?: boolean;
}

interface Risk {
  category: string;
  level: RiskLevel;
  metric: string;
  description: string;
  icon: React.ElementType;
  trend?: Momentum;
}

interface TrendSeries {
  labels: string[];
  values: number[];
  latest: number;
  previous: number;
  mom: number;
  avg4: number;
  direction: Momentum;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: '#EF4444', warning: '#F59E0B', good: '#10B981',
};
const RISK_LABELS: Record<RiskLevel, string> = {
  critical: 'Critical', warning: 'Warning', good: 'Good',
};
const IMPACT_COLORS: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981',
};
const MOMENTUM_COLORS: Record<Momentum, string> = {
  GROWING: '#10B981', DECLINING: '#EF4444', STABLE: '#60A5FA', VOLATILE: '#F59E0B',
};

const SECTION_META: Record<string, { icon: React.ElementType; color: string }> = {
  'situation':          { icon: Activity,      color: '#A78BFA' },
  'assessment':         { icon: Activity,      color: '#A78BFA' },
  'critical':           { icon: AlertTriangle, color: '#EF4444' },
  'alert':              { icon: AlertTriangle, color: '#EF4444' },
  'opportunit':         { icon: Target,        color: '#10B981' },
  'system':             { icon: Zap,           color: '#F59E0B' },
  'decision':           { icon: Sparkles,      color: '#3B82F6' },
  'roadmap':            { icon: Target,        color: '#8B0018' },
  'projection':         { icon: TrendingUp,    color: '#34D399' },
  'recommendation':     { icon: Target,        color: '#10B981' },
  'action':             { icon: Zap,           color: '#F59E0B' },
  'answer':             { icon: Sparkles,      color: '#A78BFA' },
  'analysis':           { icon: Activity,      color: '#A78BFA' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number {
  const x = Number(v);
  return isFinite(x) ? x : 0;
}

function n(v: number) {
  return `₦${safeNum(v).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
}

function pct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function buildTrend(
  labels: string[],
  values: (number | undefined)[]
): TrendSeries {
  const vals = values.map((v) => v ?? 0);
  const latest   = vals[0] ?? 0;
  const previous = vals[1] ?? 0;
  const mom      = previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : 0;
  const avg4     = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  let gains = 0, drops = 0;
  for (let i = 0; i < vals.length - 1; i++) {
    if (vals[i] > vals[i + 1] * 1.02) gains++;
    else if (vals[i] < vals[i + 1] * 0.98) drops++;
  }

  let direction: Momentum;
  if (gains >= 2)            direction = 'GROWING';
  else if (drops >= 2)       direction = 'DECLINING';
  else if (Math.abs(mom) < 8) direction = 'STABLE';
  else                        direction = 'VOLATILE';

  return { labels, values: vals, latest, previous, mom, avg4, direction };
}

function getSectionMeta(heading: string) {
  const k = heading.toLowerCase();
  for (const [key, val] of Object.entries(SECTION_META)) {
    if (k.includes(key)) return val;
  }
  return { icon: Sparkles, color: '#A78BFA' };
}

function parseAI(text: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  let curHeading = '';
  let curLines: string[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      if (curHeading || curLines.length) {
        sections.push({ heading: curHeading, content: curLines.join('\n').trim() });
      }
      curHeading = line.replace(/^##\s+/, '').replace(/[^\x00-\x7F]/g, '').trim();
      curLines = [];
    } else {
      curLines.push(line);
    }
  }
  if (curHeading || curLines.length) {
    sections.push({ heading: curHeading, content: curLines.join('\n').trim() });
  }
  return sections.filter((s) => s.heading || s.content);
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 20,
  padding: 'var(--space-5)', border: '1px solid var(--border-subtle)',
  marginBottom: 'var(--space-5)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function MomentumBadge({ direction }: { direction: Momentum }) {
  const color = MOMENTUM_COLORS[direction];
  const Icon  = direction === 'GROWING' ? ArrowUpRight : direction === 'DECLINING' ? ArrowDownRight : Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.5rem', fontWeight: 800, color, background: `${color}18`, padding: '1px 6px', borderRadius: 20 }}>
      <Icon size={9} />{direction}
    </span>
  );
}

function AISection({ heading, content, idx }: { heading: string; content: string; idx: number }) {
  const { icon: Icon, color } = getSectionMeta(heading);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14, border: `1px solid ${color}18` }}
    >
      {heading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={12} style={{ color }} />
          </div>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            {heading}
          </p>
        </div>
      )}
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
        {content.split('\n').map((line, i) => {
          if (!line.trim()) return <div key={i} style={{ height: 5 }} />;
          const isArrow    = line.startsWith('→');
          const isBullet   = line.startsWith('- ') || line.startsWith('• ');
          const isNumbered = /^\d+\./.test(line);
          const isLabel    = /^[A-Z]{2,}:/.test(line) && line.length < 40;
          if (isArrow) {
            const isGo = line.includes('DO IT');
            const isNo = line.includes("DON'T");
            const c    = isGo ? '#10B981' : isNo ? '#EF4444' : '#F59E0B';
            return <p key={i} style={{ margin: '4px 0', color: c, fontWeight: 700 }}>{line}</p>;
          }
          if (isBullet) {
            return (
              <p key={i} style={{ margin: '3px 0', paddingLeft: 12, borderLeft: `2px solid ${color}40` }}>
                {line.replace(/^[-•]\s/, '')}
              </p>
            );
          }
          if (isNumbered) return <p key={i} style={{ margin: '3px 0' }}>{line}</p>;
          if (isLabel)    return <p key={i} style={{ margin: '8px 0 3px', fontWeight: 700, color: 'var(--text-primary)' }}>{line}</p>;
          return <p key={i} style={{ margin: '2px 0' }}>{line}</p>;
        })}
      </div>
    </motion.div>
  );
}

function DecisionCard({ d }: { d: Decision }) {
  const isGo  = d.recommendation.includes('DO IT') || d.recommendation.includes('ON TRACK') || d.recommendation.includes('DEBT-FREE') || d.recommendation.includes('DONE');
  const isNo  = d.recommendation.includes("DON'T");
  const recColor = isGo ? '#10B981' : isNo ? '#EF4444' : '#F59E0B';
  return (
    <div style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14, border: `1px solid ${recColor}1A` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--space-2)' }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, flex: 1 }}>{d.question}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {d.trendBased && (
            <span style={{ fontSize: '0.46rem', fontWeight: 800, color: '#60A5FA', background: 'rgba(96,165,250,0.12)', padding: '1px 5px', borderRadius: 10 }}>
              TREND
            </span>
          )}
          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: recColor, background: `${recColor}18`, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const }}>
            {d.recommendation}
          </span>
        </div>
      </div>
      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 10px' }}>{d.reason}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', margin: 0, flexShrink: 0 }}>Confidence</p>
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${d.confidence}%`, background: recColor, borderRadius: 2 }} />
        </div>
        <p style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: recColor, margin: 0, flexShrink: 0 }}>{d.confidence}%</p>
        <span style={{ fontSize: '0.52rem', color: IMPACT_COLORS[d.impact], background: `${IMPACT_COLORS[d.impact]}15`, padding: '1px 6px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>
          {d.impact}
        </span>
      </div>
    </div>
  );
}

function RiskRow({ risk }: { risk: Risk }) {
  const Icon  = risk.icon;
  const color = RISK_COLORS[risk.level];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' as const }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{risk.category}</p>
          <span style={{ fontSize: '0.52rem', fontWeight: 800, color, background: `${color}18`, padding: '1px 6px', borderRadius: 20, textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0 }}>
            {RISK_LABELS[risk.level]}
          </span>
          {risk.trend && <MomentumBadge direction={risk.trend} />}
        </div>
        <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{risk.description}</p>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color, flexShrink: 0, margin: 0 }}>{risk.metric}</p>
    </div>
  );
}

function MiniSparkline({ values, color, labels }: { values: number[]; color: string; labels: string[] }) {
  const maxV = Math.max(...values.map(Math.abs), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 22 }}>
      {[...values].reverse().map((v, i) => {
        const h = Math.max(3, (Math.abs(v) / maxV) * 22);
        const isLatest = i === values.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', height: h, background: isLatest ? color : `${color}45`, borderRadius: 2 }} />
            <p style={{ fontSize: '0.42rem', color: 'var(--text-muted)', margin: 0 }}>{labels[values.length - 1 - i]}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdvisorPage() {
  const { addToast } = useUIStore();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError]   = useState('');
  const chatEndRef  = useRef<HTMLDivElement>(null);

  // Scenario state
  const [revPct, setRevPct]         = useState(100);
  const [expCutPct, setExpCutPct]   = useState(0);
  const [extraSave, setExtraSave]   = useState(0);

  // ── Build 4-month period ranges ────────────────────────────────
  const now     = new Date();
  const periods = [0, 1, 2, 3].map((i) => {
    const d = subMonths(now, i);
    return {
      start: format(startOfMonth(d), 'yyyy-MM-dd'),
      end:   format(endOfMonth(d),   'yyyy-MM-dd'),
      label: format(d, 'MMM yy'),
    };
  });

  // ── Queries ────────────────────────────────────────────────────
  const { data: biz0 } = useQuery({ queryKey: ['biz-sum', periods[0].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[0].start, period_end: periods[0].end }) });
  const { data: biz1 } = useQuery({ queryKey: ['biz-sum', periods[1].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[1].start, period_end: periods[1].end }) });
  const { data: biz2 } = useQuery({ queryKey: ['biz-sum', periods[2].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[2].start, period_end: periods[2].end }) });
  const { data: biz3 } = useQuery({ queryKey: ['biz-sum', periods[3].start], queryFn: () => analyticsApi.businessSummary({ period_start: periods[3].start, period_end: periods[3].end }) });

  const { data: per0 } = useQuery({ queryKey: ['per-sum', periods[0].start], queryFn: () => analyticsApi.personalSummary({ period_start: periods[0].start, period_end: periods[0].end }) });
  const { data: per1 } = useQuery({ queryKey: ['per-sum', periods[1].start], queryFn: () => analyticsApi.personalSummary({ period_start: periods[1].start, period_end: periods[1].end }) });
  const { data: per2 } = useQuery({ queryKey: ['per-sum', periods[2].start], queryFn: () => analyticsApi.personalSummary({ period_start: periods[2].start, period_end: periods[2].end }) });
  const { data: per3 } = useQuery({ queryKey: ['per-sum', periods[3].start], queryFn: () => analyticsApi.personalSummary({ period_start: periods[3].start, period_end: periods[3].end }) });

  const { data: recovery } = useQuery({ queryKey: ['business-recovery'],          queryFn: () => cashFlowApi.getBusinessRecovery() });
  const { data: burnRate  } = useQuery({ queryKey: ['personal-burn-rate'],         queryFn: () => cashFlowApi.getBurnRate(3) });
  const { data: debtPlan  } = useQuery({ queryKey: ['personal-debt-plan'],         queryFn: () => cashFlowApi.getDebtPlan() });
  const { data: netWorth  } = useQuery({ queryKey: ['net-worth'],                  queryFn: () => cashFlowApi.getNetWorth() });
  const { data: cashPos   } = useQuery({ queryKey: ['cash-pos-personal'],          queryFn: () => cashFlowApi.getPosition('personal') });

  const allLoaded = !!(recovery && burnRate && debtPlan && netWorth);

  // ── Trend series ───────────────────────────────────────────────
  const lbls = periods.map((p) => p.label);

  const bizRevTrend    = buildTrend(lbls, [biz0?.total_revenue, biz1?.total_revenue, biz2?.total_revenue, biz3?.total_revenue]);
  const bizExpTrend    = buildTrend(lbls, [biz0?.total_expenses, biz1?.total_expenses, biz2?.total_expenses, biz3?.total_expenses]);
  const bizProfitTrend = buildTrend(lbls, [biz0?.net_profit, biz1?.net_profit, biz2?.net_profit, biz3?.net_profit]);
  const perIncTrend    = buildTrend(lbls, [per0?.total_income, per1?.total_income, per2?.total_income, per3?.total_income]);
  const perExpTrend    = buildTrend(lbls, [per0?.total_expenses, per1?.total_expenses, per2?.total_expenses, per3?.total_expenses]);
  const perSaveTrend   = buildTrend(lbls, [per0?.net_savings, per1?.net_savings, per2?.net_savings, per3?.net_savings]);

  // ── Derived metrics ────────────────────────────────────────────
  const avgBurn         = safeNum(burnRate?.average_monthly_burn) || 1;
  const avgIncome       = safeNum(debtPlan?.avg_monthly_income ?? perIncTrend.avg4);
  const avgExpenses     = safeNum(debtPlan?.avg_monthly_expenses ?? perExpTrend.avg4);
  const savingsRate     = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;
  const personalCash    = safeNum(per0?.available_balance ?? netWorth?.personal_cash ?? 0);
  const emergencyMonths = avgBurn > 0 ? personalCash / avgBurn : 0;
  const totalDebt       = safeNum(debtPlan?.total_personal_debt);
  const debtToIncome    = avgIncome > 0 ? safeNum(totalDebt / avgIncome) : 0;
  const disposable      = safeNum(debtPlan?.monthly_disposable);
  const isLoss          = recovery?.profit_status === 'loss';
  const profitMtd       = safeNum(recovery?.profit_mtd ?? bizProfitTrend.latest);
  const inventoryValue  = safeNum(netWorth?.inventory_value);
  const businessCash    = safeNum(netWorth?.business_cash);
  const pendingJobs     = safeNum(recovery?.pending_jobs);
  const avgJobRevenue   = safeNum(recovery?.avg_job_revenue);
  const recentJobs      = safeNum(recovery?.recent_job_count);

  // How many of the last 3 months was the business profitable?
  const profitableMonths = [biz0, biz1, biz2].filter((b) => (b?.net_profit ?? 0) > 0).length;

  // ── Trend-Aware Decision Engine ────────────────────────────────
  const raisePricesRec: string =
    bizRevTrend.direction === 'DECLINING' || (isLoss && bizRevTrend.direction !== 'GROWING')
      ? 'DO IT'
      : !isLoss && (bizRevTrend.direction === 'GROWING' || bizRevTrend.direction === 'STABLE')
        ? "DON'T YET"
        : 'EVALUATE';

  const hireRec: string =
    isLoss || profitableMonths < 2
      ? "DON'T DO IT"
      : bizRevTrend.direction === 'GROWING' && pendingJobs > 5 && profitableMonths >= 2
        ? 'DO IT'
        : 'WAIT';

  const debtRec: string   = totalDebt === 0 ? 'DEBT-FREE' : disposable > 0 ? 'DO IT' : 'WAIT';
  const emgRec: string    = emergencyMonths < 2 ? 'DO IT' : emergencyMonths >= 6 ? 'ALREADY DONE' : 'CONTINUE';

  const cutExpRec: string =
    perExpTrend.direction === 'GROWING' && savingsRate < 15
      ? 'DO IT'
      : savingsRate >= 20 && perExpTrend.direction !== 'GROWING'
        ? 'ON TRACK'
        : savingsRate < 5
          ? 'DO IT'
          : 'OPTIMISE';

  const restockRec: string =
    isLoss
      ? 'WAIT'
      : inventoryValue < bizRevTrend.avg4 * 0.3
        ? 'DO IT'
        : 'MONITOR';

  const decisions: Decision[] = [
    {
      question: 'Raise repair service prices?',
      recommendation: raisePricesRec,
      reason: isLoss
        ? `Revenue is ${bizRevTrend.direction.toLowerCase()} (${pct(bizRevTrend.mom)} MoM) while generating a ${n(Math.abs(profitMtd))} MTD loss — pricing is not covering costs`
        : `Revenue is ${bizRevTrend.direction.toLowerCase()} at ${pct(bizRevTrend.mom)} MoM and profitable — grow volume at current prices before raising`,
      confidence: (isLoss || bizRevTrend.direction === 'DECLINING') ? 87 : 69,
      impact: 'HIGH',
      trendBased: true,
    },
    {
      question: 'Hire a staff member or assistant?',
      recommendation: hireRec,
      reason: hireRec === 'DO IT'
        ? `Revenue GROWING ${pct(bizRevTrend.mom)} MoM, profitable in ${profitableMonths}/3 recent months, ${pendingJobs} pending jobs — demand exceeds capacity`
        : hireRec === "DON'T DO IT"
          ? `Only ${profitableMonths}/3 recent months profitable — adding payroll to an inconsistent business accelerates losses`
          : `Business is profitable but revenue needs one more month of consistent growth to justify payroll`,
      confidence: hireRec === 'DO IT' ? 81 : hireRec === "DON'T DO IT" ? 90 : 66,
      impact: 'HIGH',
      trendBased: true,
    },
    {
      question: 'Clear personal debt before saving?',
      recommendation: debtRec,
      reason: totalDebt > 0
        ? `${n(totalDebt)} total debt with ${n(Math.abs(disposable))}/mo disposable — debt interest compounds faster than savings earn in Nigeria`
        : 'No personal debt — redirect all surplus to savings and investments',
      confidence: 91,
      impact: 'HIGH',
    },
    {
      question: 'Prioritise building emergency fund?',
      recommendation: emgRec,
      reason: emergencyMonths < 2
        ? `Only ${emergencyMonths.toFixed(1)} months runway — one slow month forces borrowing at high Nigerian rates`
        : emergencyMonths >= 6
          ? `${emergencyMonths.toFixed(1)} months buffer is excellent — pivot surplus to investments`
          : `${emergencyMonths.toFixed(1)} months — keep building toward the 6-month target of ${n(avgBurn * 6)}`,
      confidence: 93,
      impact: 'HIGH',
    },
    {
      question: 'Cut personal monthly expenses now?',
      recommendation: cutExpRec,
      reason: perExpTrend.direction === 'GROWING' && savingsRate < 15
        ? `Personal expenses growing ${pct(perExpTrend.mom)} MoM while savings rate is only ${savingsRate.toFixed(1)}% — this trajectory destroys financial health`
        : savingsRate >= 20
          ? `${savingsRate.toFixed(1)}% savings rate is strong and expenses are ${perExpTrend.direction.toLowerCase()} — focus on growing income`
          : `${savingsRate.toFixed(1)}% savings rate — cut ${n(avgExpenses * 0.08)}/mo to hit the 20% target`,
      confidence: (perExpTrend.direction === 'GROWING' && savingsRate < 15) ? 88 : 72,
      impact: 'MEDIUM',
      trendBased: true,
    },
    {
      question: 'Restock inventory this month?',
      recommendation: restockRec,
      reason: restockRec === 'DO IT'
        ? `Inventory at ${n(inventoryValue)} is low relative to avg monthly revenue of ${n(bizRevTrend.avg4)} — thin stock limits repair capacity`
        : isLoss
          ? `Preserve cash in a loss period — restock only when business returns to consistent profit`
          : `${n(inventoryValue)} inventory is adequate for current revenue level — restock only fast-moving parts`,
      confidence: 74,
      impact: 'MEDIUM',
      trendBased: true,
    },
  ];

  // ── Risk Matrix ────────────────────────────────────────────────
  const risks: Risk[] = [
    {
      category: 'Business Profitability',
      level: isLoss ? (Math.abs(profitMtd) > 50000 ? 'critical' : 'warning') : 'good',
      metric: `${isLoss ? '−' : '+'}${n(Math.abs(profitMtd))}`,
      description: `MTD ${isLoss ? 'loss' : 'profit'} — ${isLoss ? 'revenue must exceed expenses to survive' : 'generating surplus'}`,
      icon: Briefcase,
      trend: bizProfitTrend.direction,
    },
    {
      category: 'Personal Emergency Fund',
      level: emergencyMonths < 1 ? 'critical' : emergencyMonths < 3 ? 'warning' : 'good',
      metric: `${emergencyMonths.toFixed(1)} mo`,
      description: `${emergencyMonths < 3 ? 'Below 3-month minimum' : 'Healthy buffer'} — monthly burn ${n(avgBurn)}`,
      icon: Shield,
    },
    {
      category: 'Personal Debt Load',
      level: debtToIncome > 0.5 ? 'critical' : debtToIncome > 0.3 ? 'warning' : 'good',
      metric: `${(debtToIncome * 100).toFixed(0)}% DTI`,
      description: `${n(totalDebt)} total debt vs ${n(avgIncome)} average monthly income`,
      icon: Banknote,
    },
    {
      category: 'Savings Rate',
      level: savingsRate < 0 ? 'critical' : savingsRate < 10 ? 'warning' : 'good',
      metric: `${savingsRate.toFixed(1)}%`,
      description: `${savingsRate < 10 ? 'Below 10% — financial vulnerability accumulating' : 'Saving positively — keep optimising'}`,
      icon: PiggyBank,
      trend: perExpTrend.direction === 'GROWING' ? 'DECLINING' : perSaveTrend.direction,
    },
    {
      category: 'Business Cash',
      level: businessCash < avgBurn ? 'critical' : businessCash < avgBurn * 2 ? 'warning' : 'good',
      metric: n(businessCash),
      description: `${(businessCash / Math.max(1, avgBurn)).toFixed(1)} months of expenses held as business cash`,
      icon: BarChart2,
      trend: bizRevTrend.direction,
    },
    {
      category: 'Inventory Level',
      level: inventoryValue < 50000 ? 'warning' : 'good',
      metric: n(inventoryValue),
      description: `${inventoryValue < 80000 ? 'Lean stock — restock soon to avoid capacity loss' : 'Adequate inventory levels'}`,
      icon: Package,
    },
  ];

  const criticalCount = risks.filter((r) => r.level === 'critical').length;
  const warningCount  = risks.filter((r) => r.level === 'warning').length;

  // ── Scenario Planner ──────────────────────────────────────────
  const extraSaveNaira      = extraSave * 1000;
  const scenarioBizRevenue  = (recovery?.revenue_mtd ?? 0) * (revPct / 100);
  const scenarioBizExpenses = recovery?.expenses_mtd ?? 0;
  const scenarioBizProfit   = scenarioBizRevenue - scenarioBizExpenses;
  const scenarioPersonalExp = avgExpenses * (1 - expCutPct / 100);
  const scenarioSavingsRate = avgIncome > 0 ? ((avgIncome - scenarioPersonalExp) / avgIncome) * 100 : 0;
  const totalScenarioSave   = Math.max(0, avgIncome - scenarioPersonalExp) + extraSaveNaira;
  const scenarioEmgMonths   = avgBurn > 0 ? (personalCash + totalScenarioSave * 6) / (avgBurn * Math.max(0.01, 1 - expCutPct / 100)) : 0;
  const scenarioDebtMonths  = totalDebt > 0 && Math.abs(disposable) + extraSaveNaira > 0
    ? Math.ceil(totalDebt / (Math.abs(disposable) + extraSaveNaira)) : 0;
  const scenarioNetWorth12  = (netWorth?.net_worth ?? 0) + (scenarioBizProfit + totalScenarioSave) * 12;

  // ── System prompt (includes 4-month trend data) ────────────────
  function buildSystemPrompt(): string {
    const bizTable = [biz0, biz1, biz2, biz3].map((b, i) => {
      const rev  = b?.total_revenue  ?? 0;
      const exp  = b?.total_expenses ?? 0;
      const prof = b?.net_profit     ?? 0;
      return `  ${periods[i].label} | Rev: ${n(rev)} | Exp: ${n(exp)} | Profit: ${prof >= 0 ? '+' : ''}${n(prof)}`;
    }).join('\n');

    const perTable = [per0, per1, per2, per3].map((p, i) => {
      const inc  = p?.total_income   ?? 0;
      const exp  = p?.total_expenses ?? 0;
      const sav  = p?.net_savings    ?? (inc - exp);
      return `  ${periods[i].label} | Income: ${n(inc)} | Exp: ${n(exp)} | Saved: ${sav >= 0 ? '+' : ''}${n(sav)}`;
    }).join('\n');

    const cats = Object.entries(burnRate?.category_breakdown ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amt]) => `  ${cat}: ${n(amt)} (${avgBurn > 0 ? ((amt / avgBurn) * 100).toFixed(0) : 0}%)`)
      .join('\n');

    return `You are Dash AI — an elite CFO and personal finance strategist for a Nigerian phone repair shop owner.

You have access to FOUR MONTHS of real financial history. This is what separates you from generic advice bots. Use the trend data in every answer — identify what is improving, what is declining, and what the trajectory means for this person's future.

=== BUSINESS — Dash & Co. (Phone Repair) ===
4-Month Trend (newest first):
${bizTable}

Momentum:
- Revenue:  ${bizRevTrend.direction} (MoM: ${pct(bizRevTrend.mom)}, 4-mo avg: ${n(bizRevTrend.avg4)})
- Expenses: ${bizExpTrend.direction} (MoM: ${pct(bizExpTrend.mom)})
- Profit:   ${bizProfitTrend.direction} (MoM: ${pct(bizProfitTrend.mom)}, profitable ${profitableMonths}/3 recent months)

Current snapshot:
- Revenue MTD: ${n(recovery?.revenue_mtd ?? 0)}
- Expenses MTD: ${n(recovery?.expenses_mtd ?? 0)}
- P&L MTD: ${n(Math.abs(profitMtd))} ${isLoss ? 'LOSS' : 'PROFIT'}
- Avg Job Revenue: ${n(avgJobRevenue)} (${recentJobs} recent jobs, ${pendingJobs} pending)
- Business Cash: ${n(businessCash)} | Inventory: ${n(inventoryValue)}

=== PERSONAL ===
4-Month Trend (newest first):
${perTable}

Momentum:
- Income:   ${perIncTrend.direction} (MoM: ${pct(perIncTrend.mom)})
- Expenses: ${perExpTrend.direction} (MoM: ${pct(perExpTrend.mom)})
- Savings:  ${perSaveTrend.direction} (MoM: ${pct(perSaveTrend.mom)})

Current snapshot:
- Avg Monthly Income (3mo): ${n(avgIncome)}
- Avg Monthly Expenses (3mo): ${n(avgExpenses)}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Personal Cash: ${n(personalCash)} (${emergencyMonths.toFixed(1)} months emergency runway)
- Total Debt: ${n(totalDebt)} | Months to clear: ${debtPlan?.months_to_clear_all ?? 'N/A'}
${cats ? `\nTop expense categories:\n${cats}` : ''}

=== COMBINED POSITION ===
- Business Assets: ${n(businessCash + inventoryValue)}
- Personal Cash: ${n(personalCash)}
- Loans Given: ${n(netWorth?.loans_given_outstanding ?? 0)}
- Debts Owed: ${n(netWorth?.debts_owed_outstanding ?? 0)}
- NET WORTH: ${n(netWorth?.net_worth ?? 0)}

=== YOUR RULES ===
1. ALWAYS reference the trend data. Start answers by acknowledging whether things are getting better or worse.
2. Cite exact Naira amounts from the data above. Never invent numbers.
3. Be direct. Say "DO this" or "DON'T do this" — not "consider" or "might".
4. Give specific timelines: "at this rate, in 4 months you will..." not vague estimates.
5. Treat business and personal as one connected wealth system — decisions in one affect the other.
6. Nigerian context: high inflation, limited investment options, cash economy. Factor this in.
7. If the user asks a question you don't have data for, say so clearly and work with what you have.`;
  }

  // ── Send a chat message ────────────────────────────────────────
  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;
    if (!allLoaded) {
      addToast({ type: 'error', title: 'Data loading', message: 'Wait for financial data to load first.' });
      return;
    }

    setChatError('');
    const userMsg: Message     = { id: String(Date.now()),     role: 'user',      content: text.trim() };
    const assistId             = String(Date.now() + 1);
    const assistMsg: Message   = { id: assistId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, assistMsg]);
    setInputValue('');
    setIsStreaming(true);

    const systemMsg: GeminiMessage = { role: 'system', content: buildSystemPrompt() };
    const history: GeminiMessage[] = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const allMsgs: GeminiMessage[] = [
      systemMsg,
      ...history,
      { role: 'user', content: text.trim() },
    ];

    try {
      await streamGemini(allMsgs, (accumulated) => {
        setMessages((prev) =>
          prev.map((m) => m.id === assistId ? { ...m, content: accumulated } : m)
        );
      }, { maxTokens: 1400, temperature: 0.65 });
      setMessages((prev) => prev.map((m) => m.id === assistId ? { ...m, streaming: false } : m));
    } catch (err: unknown) {
      setChatError((err as Error)?.message ?? 'Failed to get a response. Try again.');
      setMessages((prev) => prev.filter((m) => m.id !== assistId));
    } finally {
      setIsStreaming(false);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Contextual suggested questions ────────────────────────────
  const suggestedQuestions = [
    bizRevTrend.direction === 'DECLINING'
      ? 'My revenue has been declining — what is causing it and how do I reverse it?'
      : isLoss
        ? 'The business is losing money this month — what is the fastest path back to profit?'
        : 'Business is profitable — how do I accelerate growth over the next 3 months?',
    savingsRate < 15
      ? `My savings rate is ${savingsRate.toFixed(0)}% — how do I realistically hit 20%?`
      : totalDebt > 0
        ? `I have ${n(totalDebt)} in debt — give me a month-by-month payoff plan`
        : 'What should I do with my savings surplus right now?',
    totalDebt > 0
      ? 'How fast can I be completely debt-free given my current income and expenses?'
      : emergencyMonths < 6
        ? `I have ${emergencyMonths.toFixed(1)} months emergency fund — how do I reach 6 months faster?`
        : 'My emergency fund is solid — what investments make sense for a Nigerian small business owner?',
    'What is my single biggest financial risk right now, and what do I do about it today?',
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="AI Advisor"
        subtitle="Trend-aware · Conversational · 4-month history · Decision engine"
      />

      {/* ══ COMMAND CENTER ══════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        {[
          {
            label: 'Business Health',
            value: `${isLoss ? '−' : '+'}${n(Math.abs(profitMtd))}`,
            sub: `MTD ${isLoss ? 'loss' : 'profit'} · ${bizRevTrend.direction}`,
            color: isLoss ? '#EF4444' : '#10B981',
            bg: isLoss ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            Icon: Briefcase as React.ElementType,
          },
          {
            label: 'Personal Health',
            value: `${savingsRate.toFixed(1)}%`,
            sub: `Savings rate · ${emergencyMonths.toFixed(1)}mo runway`,
            color: savingsRate >= 20 ? '#10B981' : savingsRate >= 10 ? '#F59E0B' : '#EF4444',
            bg: savingsRate >= 20 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            Icon: User as React.ElementType,
          },
          {
            label: 'Net Worth',
            value: n(netWorth?.net_worth ?? 0),
            sub: `${n(netWorth?.total_cash ?? 0)} cash · ${n(inventoryValue)} inventory`,
            color: (netWorth?.net_worth ?? 0) >= 0 ? '#10B981' : '#EF4444',
            bg: (netWorth?.net_worth ?? 0) >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            Icon: Scale as React.ElementType,
          },
          {
            label: 'Overall Risk',
            value: criticalCount > 0 ? `${criticalCount} Critical` : warningCount > 2 ? 'Moderate' : 'Low Risk',
            sub: `${criticalCount} critical · ${warningCount} warnings`,
            color: criticalCount > 0 ? '#EF4444' : warningCount > 2 ? '#F59E0B' : '#10B981',
            bg: criticalCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            Icon: Shield as React.ElementType,
          },
        ].map(({ label, value, sub, color, bg, Icon }) => (
          <div key={label} style={{ padding: 'var(--space-4)', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>{label}</p>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color, lineHeight: 1, margin: '0 0 4px' }}>{value}</p>
            <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* ══ 4-MONTH TREND SNAPSHOT ═══════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Activity size={14} style={{ color: '#60A5FA' }} />
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            4-Month Trend Snapshot
          </p>
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 20 }}>
            feeds the AI
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          {[
            { label: 'Biz Revenue',    trend: bizRevTrend,    color: '#8B0018' },
            { label: 'Biz Profit',     trend: bizProfitTrend, color: bizProfitTrend.latest >= 0 ? '#10B981' : '#EF4444' },
            { label: 'Personal Income', trend: perIncTrend,   color: '#D4A535' },
            { label: 'Personal Spend', trend: perExpTrend,    color: perExpTrend.direction === 'GROWING' ? '#EF4444' : '#60A5FA' },
          ].map(({ label, trend, color }) => (
            <div key={label} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
                <MomentumBadge direction={trend.direction} />
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color, margin: '0 0 2px' }}>
                {n(trend.latest)}
              </p>
              <p style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: trend.mom >= 0 ? '#10B981' : '#EF4444', margin: '0 0 8px' }}>
                {pct(trend.mom)} MoM
              </p>
              <MiniSparkline values={trend.values} color={color} labels={trend.labels} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══ DASH AI CONVERSATIONAL ADVISOR ══════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={17} style={{ color: '#A78BFA' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Dash AI</p>
            <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', margin: 0 }}>
              Llama 3.3 70B · Groq · 4-month trend history · Conversational
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setChatError(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.58rem', padding: '4px 8px', borderRadius: 8 }}
            >
              <RefreshCw size={11} /> New chat
            </button>
          )}
        </div>

        {/* Message history */}
        {messages.length > 0 && (
          <div style={{ maxHeight: 560, overflowY: 'auto', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingRight: 4 }}>
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '82%', padding: '10px 14px',
                      borderRadius: '16px 16px 4px 16px',
                      background: 'rgba(139,92,246,0.16)',
                      border: '1px solid rgba(139,92,246,0.22)',
                      fontSize: 'var(--text-xs)', color: 'var(--text-primary)', lineHeight: 1.6,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }}>
                      <Sparkles size={11} style={{ color: '#A78BFA' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {msg.content ? (
                        <div>
                          {parseAI(msg.content).map((s, i) => (
                            <AISection key={i} heading={s.heading} content={s.content} idx={i} />
                          ))}
                          {msg.streaming && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.58rem', color: '#A78BFA', padding: '2px 0' }}>
                              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> thinking…
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', fontSize: 'var(--text-xs)', color: '#A78BFA' }}>
                          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          Analysing 4 months of financial data…
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-5)', background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.04))', borderRadius: 16, border: '1px solid rgba(139,92,246,0.14)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(139,92,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <MessageCircle size={20} style={{ color: '#A78BFA' }} />
              </div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Ask Dash AI anything about your finances
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.65 }}>
                Backed by 4 months of your real data — revenue trends, expense patterns, debt trajectory.<br />
                Direct answers, not generic advice.
              </p>
            </div>

            {allLoaded ? (
              <div>
                <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 var(--space-3)', fontWeight: 700 }}>
                  Suggested questions
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {suggestedQuestions.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)} disabled={isStreaming}
                      style={{
                        textAlign: 'left', padding: '10px 14px', borderRadius: 12,
                        border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4,
                      }}>
                      <ChevronRight size={12} style={{ color: '#A78BFA', flexShrink: 0 }} />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Loading 4 months of financial data…
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {chatError && (
          <div style={{ padding: 'var(--space-3)', background: 'rgba(239,68,68,0.07)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: '#EF4444', margin: 0 }}>{chatError}</p>
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); } }}
            placeholder={allLoaded ? 'Ask about your finances, trends, decisions…' : 'Loading financial data…'}
            disabled={isStreaming || !allLoaded}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)', fontSize: 'var(--text-xs)', outline: 'none',
              opacity: !allLoaded ? 0.5 : 1,
            }}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={isStreaming || !inputValue.trim() || !allLoaded}
            style={{
              width: 42, height: 42, flexShrink: 0, borderRadius: 12,
              background: inputValue.trim() && !isStreaming ? 'rgba(139,92,246,0.2)' : 'var(--bg-elevated)',
              border: '1px solid rgba(139,92,246,0.3)',
              cursor: isStreaming || !inputValue.trim() || !allLoaded ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isStreaming
              ? <Loader2 size={16} style={{ color: '#A78BFA', animation: 'spin 1s linear infinite' }} />
              : <Send size={16} style={{ color: inputValue.trim() ? '#A78BFA' : 'var(--text-muted)' }} />
            }
          </button>
        </div>
      </motion.div>

      {/* ══ DECISION ENGINE ═════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Zap size={14} style={{ color: '#F59E0B' }} />
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Decision Engine
          </p>
          <span style={{ fontSize: '0.52rem', color: '#60A5FA', background: 'rgba(96,165,250,0.12)', padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>
            Trend-aware
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {decisions.map((d, i) => <DecisionCard key={i} d={d} />)}
        </div>
      </motion.div>

      {/* ══ RISK DASHBOARD ══════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} style={{ color: '#60A5FA' }} />
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Risk Dashboard
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['critical', 'warning', 'good'] as const).map((level) => {
              const count = risks.filter((r) => r.level === level).length;
              if (!count) return null;
              return (
                <span key={level} style={{ fontSize: '0.52rem', fontWeight: 800, color: RISK_COLORS[level], background: `${RISK_COLORS[level]}15`, padding: '2px 8px', borderRadius: 20 }}>
                  {count} {RISK_LABELS[level]}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {risks.map((r, i) => <RiskRow key={i} risk={r} />)}
        </div>
      </motion.div>

      {/* ══ SCENARIO PLANNER ════════════════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Activity size={14} style={{ color: '#34D399' }} />
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Scenario Planner
          </p>
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 20 }}>
            What-if analysis
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Business Revenue</p>
              <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: revPct >= 100 ? '#10B981' : '#EF4444', margin: 0 }}>
                {revPct}% of current = {n(scenarioBizRevenue)}/mo
              </p>
            </div>
            <input type="range" min={50} max={300} step={5} value={revPct} onChange={(e) => setRevPct(Number(e.target.value))} style={{ width: '100%', accentColor: '#10B981' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>−50%</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Current</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>+200%</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Personal Expense Reduction</p>
              <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: expCutPct > 0 ? '#A78BFA' : 'var(--text-muted)', margin: 0 }}>
                −{expCutPct}% = {n(scenarioPersonalExp)}/mo
              </p>
            </div>
            <input type="range" min={0} max={50} step={5} value={expCutPct} onChange={(e) => setExpCutPct(Number(e.target.value))} style={{ width: '100%', accentColor: '#A78BFA' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>No cut</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>50% cut</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>Extra Monthly Savings Committed</p>
              <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F59E0B', margin: 0 }}>
                {n(extraSaveNaira)}/mo
              </p>
            </div>
            <input type="range" min={0} max={200} step={5} value={extraSave} onChange={(e) => setExtraSave(Number(e.target.value))} style={{ width: '100%', accentColor: '#F59E0B' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>₦0</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>₦200K</span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 var(--space-3)' }}>
          Projected Outcomes
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)' }}>
          {[
            { label: 'Monthly Biz Profit',    before: n(profitMtd),              after: n(scenarioBizProfit),   better: scenarioBizProfit > profitMtd,              color: scenarioBizProfit >= 0 ? '#10B981' : '#EF4444' },
            { label: 'Personal Savings Rate', before: `${savingsRate.toFixed(1)}%`, after: `${scenarioSavingsRate.toFixed(1)}%`, better: scenarioSavingsRate > savingsRate, color: '#A78BFA' },
            { label: 'Emergency Fund',        before: `${emergencyMonths.toFixed(1)} mo`, after: `${scenarioEmgMonths.toFixed(1)} mo`, better: scenarioEmgMonths > emergencyMonths, color: '#34D399' },
            { label: 'Net Worth (12 mo)',      before: n(netWorth?.net_worth ?? 0), after: n(scenarioNetWorth12), better: scenarioNetWorth12 > (netWorth?.net_worth ?? 0), color: '#F59E0B' },
          ].map(({ label, before, after, better, color }) => (
            <div key={label} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <p style={{ fontSize: '0.56rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' as const }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'line-through', margin: 0 }}>{before}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 800, color, margin: 0 }}>{after}</p>
                <span style={{ fontSize: '0.55rem', color: better ? '#10B981' : '#EF4444', fontWeight: 800 }}>{better ? '▲' : '▼'}</span>
              </div>
            </div>
          ))}
        </div>

        {scenarioDebtMonths > 0 && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(167,139,250,0.08)', borderRadius: 12, border: '1px solid rgba(167,139,250,0.2)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: '#A78BFA', fontWeight: 700, margin: 0 }}>
              Debt-free in{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{scenarioDebtMonths}</span> months with this scenario
              {debtPlan?.months_to_clear_all != null && scenarioDebtMonths < debtPlan.months_to_clear_all
                ? ` — ${debtPlan.months_to_clear_all - scenarioDebtMonths} months faster than current pace`
                : ''}
            </p>
          </div>
        )}
      </motion.div>

      {/* ══ FINANCIAL SYSTEMS BLUEPRINT ═════════════════════════════ */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <Award size={14} style={{ color: '#F59E0B' }} />
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Financial Systems Blueprint
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            {
              title: 'Per-Job Revenue Reserve',
              scope: 'Business', scopeColor: '#8B0018',
              description: 'Set aside 10% of every completed job payment into a dedicated tax, tithe, and emergency buffer.',
              target: `${n(avgJobRevenue * 0.1)}/job · est. ${n(avgJobRevenue * 0.1 * recentJobs)}/mo based on recent job rate`,
              progress: isLoss ? 0 : 55,
              color: '#8B0018',
              action: isLoss ? 'Restore profitability first, then activate this system' : `Open a separate account and set aside ${n(avgJobRevenue * 0.1)} on every completed job`,
            },
            {
              title: 'Emergency Fund Builder',
              scope: 'Personal', scopeColor: '#D4A535',
              description: 'Automatically move a fixed amount to savings on the 1st of each month until you reach 6 months of expenses.',
              target: `Target: ${n(avgBurn * 6)} · Current: ${n(personalCash)} · ${(Math.min(100, (emergencyMonths / 6) * 100)).toFixed(0)}% complete`,
              progress: Math.min(100, (emergencyMonths / 6) * 100),
              color: '#D4A535',
              action: emergencyMonths >= 6
                ? 'Target reached — redirect contributions to investments'
                : `Save ${n(Math.max(0, (avgBurn * 6 - personalCash) / 12))}/mo to reach goal in 12 months`,
            },
            {
              title: 'Debt Avalanche System',
              scope: 'Personal', scopeColor: '#D4A535',
              description: 'Every month, apply your full disposable income to the highest-interest debt first.',
              target: totalDebt > 0
                ? `${n(totalDebt)} total · ${debtPlan?.months_to_clear_all ?? '?'} months at ${n(Math.abs(disposable))}/mo disposable`
                : 'No debt — system complete',
              progress: totalDebt > 0 ? Math.max(5, Math.min(95, 100 - (totalDebt / (avgIncome * 18)) * 100)) : 100,
              color: totalDebt > 0 ? '#EF4444' : '#10B981',
              action: totalDebt > 0
                ? `Apply ${n(Math.abs(disposable))}/mo to earliest-due debt — do this the same day income arrives`
                : 'Debt-free — invest surplus systematically',
            },
            {
              title: 'Business Profit Reinvestment',
              scope: 'Business', scopeColor: '#8B0018',
              description: 'Reinvest 20% of monthly profit back into inventory and tools to drive more repairs.',
              target: !isLoss
                ? `20% of ${n(profitMtd)} = ${n(profitMtd * 0.2)} available this month · Revenue trend: ${bizRevTrend.direction}`
                : `Profit trend: ${bizProfitTrend.direction} — activate once business returns to consistent profit`,
              progress: !isLoss ? 45 : 0,
              color: !isLoss ? '#8B0018' : '#6B7280',
              action: !isLoss
                ? `Allocate ${n(profitMtd * 0.2)} to fast-moving parts or repair tools this month`
                : `Focus on increasing job volume — business revenue ${bizRevTrend.direction.toLowerCase()}`,
            },
          ].map(({ title, scope, scopeColor, description, target, progress, color, action }) => (
            <div key={title} style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</p>
                <span style={{ fontSize: '0.52rem', fontWeight: 800, color: scopeColor, background: `${scopeColor}15`, padding: '1px 7px', borderRadius: 20, flexShrink: 0 }}>
                  {scope}
                </span>
              </div>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 8px' }}>{description}</p>
              <p style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color, margin: '0 0 8px', fontWeight: 600 }}>{target}</p>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, progress))}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ChevronRight size={11} style={{ color, flexShrink: 0 }} />
                <p style={{ fontSize: '0.6rem', color, fontWeight: 700, margin: 0 }}>{action}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
