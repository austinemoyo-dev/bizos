'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { repairsApi } from '@/lib/api/repairs';
import { inventoryApi } from '@/lib/api/inventory';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wrench, Package, Users, X } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface ResultItem {
  id: string;
  label: string;
  sub: string;
  href: string;
  type: 'repair' | 'inventory' | 'customer';
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 250);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const enabled = open && debouncedQuery.length >= 2;

  const { data: repairData } = useQuery({
    queryKey: ['search-repairs', debouncedQuery],
    queryFn: () => repairsApi.list({ q: debouncedQuery, size: 5 }),
    enabled,
    staleTime: 30_000,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['search-inventory', debouncedQuery],
    queryFn: () => inventoryApi.list({ q: debouncedQuery, size: 5 }),
    enabled,
    staleTime: 30_000,
  });

  const results: ResultItem[] = [
    ...(repairData?.items ?? []).map((r) => ({
      id: r.id,
      label: `#${r.job_number} — ${r.customer_name}`,
      sub: `${r.device_type}${r.device_model ? ' · ' + r.device_model : ''} · ${r.status.replace('_', ' ')} · ${formatNaira(r.total_charge)}`,
      href: `/business/repairs/${r.id}`,
      type: 'repair' as const,
    })),
    ...(inventoryData?.items ?? []).map((i) => ({
      id: i.id,
      label: i.name,
      sub: `${i.category} · ${formatNaira(i.purchase_price)} · ${i.quantity_in_stock} in stock`,
      href: `/business/inventory/${i.id}`,
      type: 'inventory' as const,
    })),
  ];

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && results[cursor]) navigate(results[cursor].href);
  };

  const TYPE_ICONS = {
    repair: <Wrench size={14} style={{ color: 'var(--accent-primary)' }} />,
    inventory: <Package size={14} style={{ color: '#3B82F6' }} />,
    customer: <Users size={14} style={{ color: '#10B981' }} />,
  };

  return (
    <>
      {/* Trigger button — desktop: full label + kbd, mobile: icon only via CSS */}
      <button
        onClick={() => setOpen(true)}
        className="gs-trigger-btn"
        aria-label="Open search"
      >
        <Search size={13} />
        <span className="gs-trigger-text">Search</span>
        <kbd className="gs-trigger-kbd" style={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
          borderRadius: 4, padding: '1px 5px', fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)', lineHeight: 1.6,
        }}>⌘K</kbd>
      </button>

      {/* Palette overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />

            <motion.div
              className="gs-palette"
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
                zIndex: 1001, width: '100%', maxWidth: 560,
                background: 'var(--bg-surface)', borderRadius: 16,
                border: '1px solid var(--border-default)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                overflow: 'hidden',
              }}
            >
              {/* Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
                  onKeyDown={handleKey}
                  placeholder="Search repairs, inventory, customers…"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontSize: 'var(--text-base)', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)',
                  }}
                />
                {query && (
                  <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
                <kbd style={{
                  background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
                  borderRadius: 4, padding: '2px 6px', fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                }}>ESC</kbd>
              </div>

              {/* Results */}
              <div style={{ maxHeight: 'min(380px, 55dvh)', overflowY: 'auto' }}>
                {debouncedQuery.length < 2 ? (
                  <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                    Type at least 2 characters to search
                  </div>
                ) : results.length === 0 ? (
                  <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                    No results for <strong style={{ color: 'var(--text-primary)' }}>"{debouncedQuery}"</strong>
                  </div>
                ) : (
                  <>
                    {repairData?.items && repairData.items.length > 0 && (
                      <GroupLabel label="Repairs" />
                    )}
                    {results.map((item, idx) => {
                      const isFirst = idx === 0;
                      const prevType = idx > 0 ? results[idx - 1].type : null;
                      const showGroupLabel = !isFirst && item.type !== prevType;
                      return (
                        <div key={item.id}>
                          {showGroupLabel && <GroupLabel label={item.type === 'inventory' ? 'Inventory' : 'Customers'} />}
                          <button
                            onClick={() => navigate(item.href)}
                            onMouseEnter={() => setCursor(idx)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                              padding: 'var(--space-3) var(--space-4)', border: 'none', cursor: 'pointer',
                              background: cursor === idx ? 'var(--bg-overlay)' : 'transparent',
                              textAlign: 'left', transition: 'background 0.1s',
                              borderLeft: cursor === idx ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            }}
                          >
                            <div style={{
                              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                              background: 'var(--bg-elevated)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {TYPE_ICONS[item.type]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.label}
                              </p>
                              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.sub}
                              </p>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div style={{
                padding: 'var(--space-2) var(--space-4)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
              }}>
                {[['↑↓', 'navigate'], ['↵', 'open'], ['ESC', 'close']].map(([key, label]) => (
                  <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    <kbd style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '1px 4px', fontFamily: 'var(--font-mono)' }}>
                      {key}
                    </kbd>
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: 'var(--text-muted)',
      padding: 'var(--space-2) var(--space-4) var(--space-1)',
      background: 'var(--bg-elevated)',
    }}>
      {label}
    </p>
  );
}
