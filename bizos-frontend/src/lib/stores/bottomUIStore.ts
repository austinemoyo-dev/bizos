import { create } from 'zustand';

interface BottomUIStore {
  // ── Search bar (list pages) ──────────────────────────────────
  barVisible: boolean;
  barSearch: string;
  barPlaceholder: string;
  _barOnSearch: ((v: string) => void) | null;
  _barOnAdd: (() => void) | null;

  showBar: (opts: {
    placeholder?: string;
    onSearch?: (v: string) => void;
    onAdd?: (() => void) | null;
  }) => void;
  hideBar: () => void;
  setBarSearch: (v: string) => void;

  // ── Sticky CTA (detail pages) ────────────────────────────────
  ctaVisible: boolean;
  ctaLabel: string;
  ctaLoading: boolean;
  _ctaOnClick: (() => void) | null;

  showCta: (opts: { label: string; loading?: boolean; onClick: () => void }) => void;
  hideCta: () => void;
  setCtaLoading: (v: boolean) => void;
}

export const useBottomUIStore = create<BottomUIStore>((set, get) => ({
  // search bar
  barVisible: false,
  barSearch: '',
  barPlaceholder: 'Search…',
  _barOnSearch: null,
  _barOnAdd: null,

  showBar: (opts) =>
    set({
      barVisible: true,
      barSearch: '',
      barPlaceholder: opts.placeholder ?? 'Search…',
      _barOnSearch: opts.onSearch ?? null,
      _barOnAdd: opts.onAdd ?? null,
    }),

  hideBar: () =>
    set({ barVisible: false, barSearch: '', _barOnSearch: null, _barOnAdd: null }),

  setBarSearch: (v) => {
    set({ barSearch: v });
    get()._barOnSearch?.(v);
  },

  // sticky CTA
  ctaVisible: false,
  ctaLabel: '',
  ctaLoading: false,
  _ctaOnClick: null,

  showCta: (opts) =>
    set({
      ctaVisible: true,
      ctaLabel: opts.label,
      ctaLoading: opts.loading ?? false,
      _ctaOnClick: opts.onClick,
    }),

  hideCta: () =>
    set({ ctaVisible: false, ctaLabel: '', ctaLoading: false, _ctaOnClick: null }),

  setCtaLoading: (v) => set({ ctaLoading: v }),
}));
