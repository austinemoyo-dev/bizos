import { create } from 'zustand';

interface ProfileState {
  avatarUrl: string | null;
  setAvatar: (dataUrl: string) => void;
  clearAvatar: () => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'bizos_avatar';

export const useProfileStore = create<ProfileState>((set) => ({
  avatarUrl: null,

  setAvatar: (dataUrl) => {
    localStorage.setItem(STORAGE_KEY, dataUrl);
    set({ avatarUrl: dataUrl });
  },

  clearAvatar: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ avatarUrl: null });
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) set({ avatarUrl: stored });
    } catch {}
  },
}));
