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
  /** remember=false skips saving refresh_token and bizos_user, disabling biometric on next visit */
  setAuth: (user: User, token: string, refreshToken?: string, remember?: boolean) => void;
  clearAuth: () => void;
  loadFromStorage: () => boolean;
  /**
   * Use the stored refresh token to get a new access token.
   * Returns true on success, false if the token is expired/invalid (user must log in),
   * or null if the server couldn't be reached (cold start / network error — don't force logout).
   */
  refreshSession: () => Promise<boolean | null>;
  /** True if a refresh token is stored — i.e. biometric login is possible. */
  hasSavedSession: () => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setAuth: (user, token, refreshToken?, remember = true) => {
    localStorage.setItem('access_token', token);
    if (remember) {
      // Persist session so biometric re-login works on next visit
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('bizos_user', JSON.stringify(user));
    } else {
      // Session-only: clear any previously remembered credentials
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('bizos_user');
    }
    set({ user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('bizos_user');
    localStorage.removeItem('bizos_credential');
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
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: controller.signal,
      });
    } catch {
      // Network error or timeout — server likely cold-starting; don't force logout.
      clearTimeout(timeout);
      return null;
    }
    clearTimeout(timeout);

    if (!res.ok) return false; // 401 = token expired/invalid — user must log in

    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
    const userJson = localStorage.getItem('bizos_user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        set({ user, isAuthenticated: true });
      } catch {}
    }
    return true;
  },
}));
