import { create } from 'zustand';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export interface User {
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
  /** Use the stored refresh token to get a new access token (for biometric login). */
  refreshSession: () => Promise<boolean>;
  /** True if a refresh token is stored — i.e. biometric login is possible. */
  hasSavedSession: () => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setAuth: (user, token, refreshToken?) => {
    localStorage.setItem('access_token', token);
    // Store refresh token so biometric re-login can call /auth/refresh without a password.
    // In Capacitor the WebView sandbox makes localStorage equivalent to secure storage.
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('bizos_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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

  hasSavedSession: () => {
    return !!(localStorage.getItem('refresh_token') && localStorage.getItem('bizos_user'));
  },

  refreshSession: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${refreshToken}` },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      // Re-hydrate user from storage (already there)
      const userJson = localStorage.getItem('bizos_user');
      if (userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, isAuthenticated: true });
      }
      return true;
    } catch {
      return false;
    }
  },
}));
