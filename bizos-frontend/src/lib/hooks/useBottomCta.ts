import { useEffect, useRef } from 'react';
import { useBottomUIStore } from '../stores/bottomUIStore';

interface Opts {
  label: string;
  loading?: boolean;
  onClick: () => void;
  enabled?: boolean; // set false to hide the CTA
}

export function useBottomCta(opts: Opts) {
  const showCta     = useBottomUIStore(s => s.showCta);
  const hideCta     = useBottomUIStore(s => s.hideCta);
  const setCtaLoading = useBottomUIStore(s => s.setCtaLoading);
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    if (ref.current.enabled === false) return;
    showCta({
      label: ref.current.label,
      loading: ref.current.loading ?? false,
      onClick: () => ref.current.onClick(),
    });
    return () => hideCta();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled]);

  // Sync loading state without re-mounting
  useEffect(() => {
    if (opts.enabled !== false) setCtaLoading(opts.loading ?? false);
  }, [opts.loading, opts.enabled, setCtaLoading]);
}
