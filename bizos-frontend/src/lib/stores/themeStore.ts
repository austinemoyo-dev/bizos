import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('bizos-theme', theme);
    }
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));

export function initTheme() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('bizos-theme') as Theme | null;
  const theme = saved ?? 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  useThemeStore.getState().setTheme(theme);
}
