const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _retry?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    if (skipAuth || endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh') || options._retry) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new Error('Unauthorized');
    }
    
    const refreshed = await attemptRefresh();
    if (refreshed) {
      options._retry = true;
      return request<T>(endpoint, options);
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    let errorMessage = 'Request failed';
    if (error.detail) {
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        errorMessage = error.detail.map((e: any) => `${e.loc?.[e.loc.length - 1] ?? 'Field'}: ${e.msg}`).join(', ');
      } else {
        errorMessage = JSON.stringify(error.detail);
      }
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) return false;
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    return true;
  } catch { return false; }
}

/** Backend returns plain arrays — normalise to the PaginatedResponse shape the frontend expects. */
export function toPage<T>(data: T[] | { items: T[]; total: number; page: number; size: number; pages: number }): { items: T[]; total: number; page: number; size: number; pages: number } {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, size: data.length, pages: 1 };
  }
  return data;
}

export const api = {
  get: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { method: 'GET', ...opts }),
  post: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { method: 'DELETE', ...opts }),
};
