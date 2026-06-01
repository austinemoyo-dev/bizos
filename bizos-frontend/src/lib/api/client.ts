const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _retry?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? 'GET').toUpperCase();

  // Let the browser set Content-Type automatically for FormData (multipart + boundary).
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (shouldQueueOffline(method, skipAuth, isFormData)) {
    const queued = await queueOfflineMutation<T>(endpoint, method, options.body);
    if (queued) return queued;
  }

  let response: Response;
  // Abort writes after 45 s (Render.com free tier cold-starts can take 30-50 s)
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const controller  = isMutation ? new AbortController() : undefined;
  const timeoutId   = controller
    ? setTimeout(() => controller.abort(), 45_000)
    : undefined;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller?.signal,
      // credentials: 'include' sends the HttpOnly refresh_token cookie on every request,
      // which is required for the /auth/refresh endpoint to work from the browser
      credentials: 'include',
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Our own 45s AbortController fired — queue rather than discard the mutation.
      const queued = await queueOfflineMutation<T>(endpoint, method, options.body, new TypeError('timeout'));
      if (queued) return queued;
      throw new Error('Request timed out — please check your connection and try again.');
    }
    const queued = await queueOfflineMutation<T>(endpoint, method, options.body, err);
    if (queued) return queued;
    throw err;
  }
  clearTimeout(timeoutId);

  if (response.status === 401) {
    if (skipAuth || endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh') || options._retry) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('bizos_user');
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
      localStorage.removeItem('bizos_user');
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

function shouldQueueOffline(method: string, skipAuth: boolean, isFormData: boolean): boolean {
  return (
    typeof window !== 'undefined' &&
    !skipAuth &&
    !navigator.onLine &&
    method !== 'GET' &&
    !isFormData
  );
}

async function queueOfflineMutation<T>(
  endpoint: string,
  method: string,
  body?: BodyInit | null,
  error?: unknown,
): Promise<T | null> {
  if (typeof window === 'undefined' || method === 'GET' || method === 'HEAD') return null;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;

  const isNetworkFailure = !error || error instanceof TypeError || (error instanceof Error && /fetch|network|abort/i.test(error.message));
  if (!isNetworkFailure) return null;

  let payload: object | undefined;
  if (typeof body === 'string' && body.length > 0) {
    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }
  } else if (body == null) {
    payload = undefined;
  } else {
    return null;
  }

  const { queueMutation } = await import('@/lib/sync/syncQueue');
  await queueMutation(endpoint, method as 'POST' | 'PUT' | 'PATCH' | 'DELETE', payload);

  if (method === 'DELETE') return undefined as T;

  return {
    id: `offline-${Date.now()}`,
    ...(payload ?? {}),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _queued: true,
  } as T;
}

async function attemptRefresh(): Promise<boolean> {
  try {
    // Try cookie-based refresh first (works in browser)
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      return true;
    }

    // Fallback: use localStorage refresh_token (reliable in Capacitor WebView
    // where HttpOnly cookies are not always sent cross-origin)
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!storedToken) return false;
    const res2 = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      // Send in body — backend reads payload.refresh_token, not Authorization header
      body: JSON.stringify({ refresh_token: storedToken }),
    });
    if (!res2.ok) return false;
    const data2 = await res2.json();
    localStorage.setItem('access_token', data2.access_token);
    if (data2.refresh_token) localStorage.setItem('refresh_token', data2.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/** Backend returns plain arrays — normalise to the PaginatedResponse shape the frontend expects. */
export function toPage<T>(data: T[] | { items: T[]; total: number; page: number; size: number; pages: number }): { items: T[]; total: number; page: number; size: number; pages: number } {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, size: data.length, pages: 1 };
  }
  return data;
}

export const api = {
  get:    <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { method: 'GET', ...opts }),
  post:   <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  put:    <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch:  <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { method: 'DELETE', ...opts }),
};
