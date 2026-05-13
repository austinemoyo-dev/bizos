import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface UIState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  pendingSyncCount: number;
  setPendingSyncCount: (n: number) => void;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
  activeScope: 'business' | 'personal';
  setActiveScope: (scope: 'business' | 'personal') => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    return id;
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pendingSyncCount: 0,
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),
  isOnline: true,
  setIsOnline: (v) => set({ isOnline: v }),
  activeScope: 'business',
  setActiveScope: (scope) => set({ activeScope: scope }),
}));
