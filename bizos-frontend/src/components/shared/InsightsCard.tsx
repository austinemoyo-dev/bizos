'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface InsightsCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: any | null;
  period?: string;
}

export function InsightsCard({ summary, period }: InsightsCardProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchInsights = async () => {
    if (!summary) return;
    setLoading(true);
    setText('');
    setExpanded(true);

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, period }),
      });

      if (!res.ok || !res.body) throw new Error('Failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }
      setHasLoaded(true);
    } catch {
      setText('Could not generate insights. Check your GROQ_API_KEY in .env.local.');
    } finally {
      setLoading(false);
    }
  };

  const lines = text.split('\n').filter(Boolean);

  return (
    <div className="insights-card">
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
        }}
        onClick={() => expanded ? setExpanded(false) : (hasLoaded ? setExpanded(true) : fetchInsights())}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: 'linear-gradient(135deg, #8B0018, #C8102E, #D4A535)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(200,16,46,0.45), 0 0 0 1px rgba(212,165,53,0.2)',
          }}>
            <Sparkles size={15} style={{ color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Business Insights
            </p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              Powered by Groq · {period ?? 'This month'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasLoaded && (
            <button
              onClick={(e) => { e.stopPropagation(); fetchInsights(); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              title="Refresh insights"
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}

          {!hasLoaded && !loading && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, color: '#C8102E',
              background: 'rgba(200,16,46,0.08)', padding: '3px 8px',
              borderRadius: 10, border: '1px solid rgba(200,16,46,0.2)',
            }}>
              Tap to analyze
            </span>
          )}

          {loading ? (
            <div style={{ width: 14, height: 14, border: '2px solid var(--border-default)', borderTopColor: '#C8102E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            expanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              {loading && lines.length === 0 ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ width: 12, height: 12, border: '2px solid var(--border-default)', borderTopColor: '#C8102E', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-xs)' }}>Analyzing your business data…</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {lines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: 'var(--space-3) var(--space-4)', borderRadius: 12,
                        background: 'var(--glass-bg-light)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid var(--glass-border)',
                        fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
                        lineHeight: 1.6,
                      }}
                    >
                      <span style={{ flexShrink: 0, fontSize: '1rem' }}>{line.slice(0, 2).trim() || '•'}</span>
                      <span>{line.slice(2).trim() || line}</span>
                    </motion.div>
                  ))}
                  {loading && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8102E', animation: 'pulse 1s infinite', alignSelf: 'center' }} />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
