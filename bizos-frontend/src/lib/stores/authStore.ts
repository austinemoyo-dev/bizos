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
  setAuth: (user: User, token: string, refreshToken: string) => void;
  clearAuth: () => void;
  loadFromStorage: () => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
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
      const token = localStorage.getItem('access_token');
      const userJson = localStorage.getItem('bizos_user');
      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ user, isAuthenticated: true });
        return true;
      }
    } catch {}
    return false;
  },
}));
