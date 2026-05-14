import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  clearAuth: () => void;
  loadFromStorage: () => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setAuth: (user, token, _refreshToken?) => {
    // Access token: short-lived (15 min), kept in localStorage for page-refresh survival
    localStorage.setItem('access_token', token);
    // Refresh token: long-lived, stored ONLY in HttpOnly cookie set by the server —
    // never stored in localStorage where JavaScript can read it
    localStorage.setItem('bizos_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token'); // clean up any legacy value
    localStorage.removeItem('bizos_user');
    set({ user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    try {
      const userJson = localStorage.getItem('bizos_user');
      if (userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, isAuthenticated: true });
        return true;
      }
    } catch {}
    return false;
  },
}));
