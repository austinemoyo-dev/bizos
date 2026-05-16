import { useEffect, useRef } from 'react';
import { useBottomUIStore } from '../stores/bottomUIStore';

interface Opts {
  placeholder?: string;
  onSearch?: (v: string) => void;
  onAdd?: (() => void) | null;
}

export function useBottomBar(opts: Opts) {
  const showBar = useBottomUIStore(s => s.showBar);
  const hideBar = useBottomUIStore(s => s.hideBar);
  // Keep callbacks fresh without re-running the effect
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    showBar({
      placeholder: ref.current.placeholder,
      onSearch: (v) => ref.current.onSearch?.(v),
      onAdd: ref.current.onAdd !== undefined
        ? (ref.current.onAdd ? () => ref.current.onAdd?.() : null)
        : null,
    });
    return () => hideBar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
