'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, SlidersHorizontal, X } from 'lucide-react';

interface BottomSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  onFilter?: () => void;
  filterActive?: boolean;
}

export function BottomSearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  onAdd,
  onFilter,
  filterActive,
}: BottomSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      className="bottom-search-bar-wrap"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.08, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="bottom-search-bar">
        {/* Optional filter toggle */}
        {onFilter && (
          <button
            className="bsb-filter-btn"
            onClick={onFilter}
            style={{
              background: filterActive ? 'rgba(200,16,46,0.1)' : undefined,
              borderColor: filterActive ? 'rgba(200,16,46,0.3)' : undefined,
            }}
          >
            <SlidersHorizontal
              size={15}
              style={{ color: filterActive ? '#C8102E' : 'var(--text-secondary)' }}
            />
          </button>
        )}

        {/* Search input */}
        <div className="bsb-input-wrap" onClick={() => inputRef.current?.focus()}>
          <Search size={15} className="bsb-icon" />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="bsb-input"
            autoComplete="off"
          />
          {value && (
            <button
              className="bsb-clear"
              onClick={() => { onChange(''); inputRef.current?.focus(); }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* FAB — primary action */}
        {onAdd && (
          <button className="bsb-fab" onClick={onAdd} aria-label="Add new">
            <Plus size={21} color="white" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
