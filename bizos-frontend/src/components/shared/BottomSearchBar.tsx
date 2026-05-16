'use client';

import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, ChevronRight, Loader2 } from 'lucide-react';
import { useBottomUIStore } from '@/lib/stores/bottomUIStore';

// ── Bottom search bar ─────────────────────────────────────────────────────────

export function BottomSearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { barVisible, barSearch, barPlaceholder, _barOnAdd, setBarSearch } =
    useBottomUIStore();

  return (
    <AnimatePresence>
      {barVisible && (
        <motion.div
          className="bottom-search-bar-wrap"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="bottom-search-bar">
            {/* Search input */}
            <div className="bsb-input-wrap" onClick={() => inputRef.current?.focus()}>
              <Search size={15} className="bsb-icon" />
              <input
                ref={inputRef}
                type="search"
                value={barSearch}
                onChange={e => setBarSearch(e.target.value)}
                placeholder={barPlaceholder}
                className="bsb-input"
                autoComplete="off"
              />
              {barSearch && (
                <button
                  className="bsb-clear"
                  onClick={() => { setBarSearch(''); inputRef.current?.focus(); }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* FAB */}
            {_barOnAdd && (
              <button className="bsb-fab" onClick={_barOnAdd} aria-label="Add new">
                <Plus size={21} color="white" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sticky bottom CTA (detail pages) ─────────────────────────────────────────

export function BottomCta() {
  const { ctaVisible, ctaLabel, ctaLoading, _ctaOnClick } = useBottomUIStore();

  return (
    <AnimatePresence>
      {ctaVisible && (
        <motion.div
          className="bottom-cta-wrap"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            className="btn-primary"
            style={{
              width: '100%', justifyContent: 'center',
              height: 50, fontSize: 'var(--text-sm)',
              borderRadius: 16, gap: 8,
            }}
            onClick={() => _ctaOnClick?.()}
            disabled={ctaLoading}
          >
            {ctaLoading
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <ChevronRight size={16} />}
            {ctaLabel}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
