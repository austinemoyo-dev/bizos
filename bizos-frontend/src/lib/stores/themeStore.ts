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

  // Feature 9: if the user has never explicitly chosen a theme, follow the OS
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme: Theme = saved ?? (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', theme);
  useThemeStore.setState({ theme });

  // Feature 9: react to OS theme changes only when user has no saved preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('bizos-theme')) return;
    const next: Theme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    useThemeStore.setState({ theme: next });
  });
}
