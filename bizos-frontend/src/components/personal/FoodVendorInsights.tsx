'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FoodVendorAnalytics, FoodTrendPoint, VendorSpendingSummary } from '@/lib/api/food-vendor';
import { FoodVendorPayment } from '@/types/api';
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp,
  TrendingUp, Lightbulb, Users, Target, Zap,
} from 'lucide-react';

// ── Section parser (same pattern as AIAnalyticsPanel) ─────────────
function parseSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const parts = raw.split(/^## /m);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    if (nl === -1) continue;
    sections[part.slice(0, nl).trim().toLowerCase()] = part.slice(nl + 1).trim();
  }
  return sections;
}

function BulletList({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n').map((l) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
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

function NumberedList({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
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
            background: `${color}08`,
            border: `1px solid ${color}20`,
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
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6 }}>{line}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Tab config ─────────────────────────────────────────────────────
type FoodTab = 'overview' | 'patterns' | 'vendors' | 'budget' | 'tips';

const TABS: { key: FoodTab; label: string; icon: React.ReactNode; section: string; color: string }[] = [
  { key: 'overview',  label: 'Overview',  icon: <TrendingUp size={12} />, section: 'overview',  color: '#3B82F6' },
  { key: 'patterns',  label: 'Patterns',  icon: <Lightbulb size={12} />, section: 'patterns',  color: '#F59E0B' },
  { key: 'vendors',   label: 'Vendors',   icon: <Users size={12} />,     section: 'vendors',   color: '#8B5CF6' },
  { key: 'budget',    label: 'Budget',    icon: <Target size={12} />,    section: 'budget',    color: '#10B981' },
  { key: 'tips',      label: 'Tips',      icon: <Zap size={12} />,       section: 'tips',      color: '#C8102E' },
];

// ── Props ──────────────────────────────────────────────────────────
interface Props {
  analytics: FoodVendorAnalytics | undefined;
  trend: FoodTrendPoint[];
  vendors: VendorSpendingSummary[];
  payments: FoodVendorPayment[];
  budget?: number;
  monthlySpent?: number;
}

export function FoodVendorInsights({ analytics, trend, vendors, payments, budget = 0, monthlySpent = 0 }: Props) {
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<FoodTab>('overview');

  const sections = parseSections(text);

  const fetchInsights = async () => {
    if (!analytics) return;
    setLoading(true);
    setText('');
    setExpanded(true);
    setActiveTab('overview');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch('/api/food-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token ?? 'anonymous'}`,
        },
        body: JSON.stringify({ analytics, trend, vendors, payments, budget, monthlySpent }),
      });

      if (!res.ok || !res.body) throw new Error('Request failed');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
      setHasLoaded(true);
    } catch {
      setText('## Overview\nScore: —/10. Could not generate insights. Check GROQ_API_KEY in .env.local.');
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const activeTabDef = TABS.find((t) => t.key === activeTab)!;
  const activeText   = sections[activeTabDef.section] ?? '';
  const activeColor  = activeTabDef.color;

  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 20,
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)', cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
        }}
        onClick={() => expanded ? setExpanded(false) : (hasLoaded ? setExpanded(true) : fetchInsights())}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #92400e, #F59E0B, #FCD34D)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
          }}>
            <Sparkles size={16} style={{ color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Food Insights
            </p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Powered by Groq · Llama 3.3 70B · last 30 days
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasLoaded && (
            <button
              onClick={(e) => { e.stopPropagation(); fetchInsights(); }}
              title="Refresh"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}

          {!hasLoaded && !loading && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, color: '#F59E0B',
              background: 'rgba(245,158,11,0.1)', padding: '3px 9px',
              borderRadius: 10, border: '1px solid rgba(245,158,11,0.25)',
            }}>
              Generate insights
            </span>
          )}

          {loading
            ? <div style={{ width: 14, height: 14, border: '2px solid var(--border-default)', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
                <div style={{ width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Analysing your food spending data…
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', padding: 'var(--space-3) var(--space-5) 0' }}>
                  {TABS.map((tab) => {
                    const isActive     = activeTab === tab.key;
                    const sectionReady = !!sections[tab.section];
                    return (
                      <button
                        key={tab.key}
                        onClick={(e) => { e.stopPropagation(); setActiveTab(tab.key); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: '10px 10px 0 0',
                          border: 'none', cursor: 'pointer', flexShrink: 0,
                          fontSize: '0.7rem', fontWeight: 600,
                          background: isActive ? tab.color : 'var(--bg-overlay)',
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
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: `2px solid ${activeColor}`, minHeight: 80 }}>
                  {!activeText && loading ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>
                      <div style={{ width: 10, height: 10, border: `2px solid var(--border-default)`, borderTopColor: activeColor, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--text-xs)' }}>Generating {activeTabDef.label.toLowerCase()} insights…</span>
                    </div>
                  ) : !activeText ? (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Waiting for data…</p>
                  ) : activeTab === 'overview' || activeTab === 'budget' ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.7, padding: '12px 16px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--glass-border)' }}
                    >
                      {activeText}
                    </motion.p>
                  ) : activeTab === 'tips' ? (
                    <NumberedList text={activeText} color={activeColor} />
                  ) : (
                    <BulletList text={activeText} color={activeColor} />
                  )}

                  {loading && activeText && (
                    <span style={{ display: 'inline-block', width: 7, height: 14, borderRadius: 2, background: activeColor, marginLeft: 4, animation: 'pulse 0.9s ease-in-out infinite', verticalAlign: 'middle' }} />
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
      `}</style>
    </div>
  );
}
