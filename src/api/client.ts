// ========================================
// API Client — centralized fetch wrapper
// All API calls go through Vite proxy to backend (:3000)
// ========================================

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('smartstyle_token');
}

export function setToken(token: string): void {
  localStorage.setItem('smartstyle_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('smartstyle_token');
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  // Don't set Content-Type for FormData (browser sets with boundary)
  if (options.body instanceof FormData) {
    delete (headers as any)['Content-Type'];
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

// ---- Auth API ----
export const authAPI = {
  register: (username: string, email: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; username: string; email: string } }>('/auth/register', {
      method: 'POST',
      body: { username, email, password },
    }),

  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; username: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  me: () =>
    apiFetch<{ user: { id: string; username: string; email: string }; profile: any }>('/auth/me'),
};

// ---- Wardrobe API ----
export const wardrobeAPI = {
  list: (params?: { category?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiFetch<any[]>(`/wardrobe${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    apiFetch<any>(`/wardrobe/${id}`),

  create: (item: {
    imageUrl: string;
    category: string;
    tags: string[];
    color: string;
    brand?: string;
    season?: string;
    status?: string;
  }) =>
    apiFetch<any>('/wardrobe', { method: 'POST', body: item }),

  update: (id: string, updates: Record<string, any>) =>
    apiFetch<any>(`/wardrobe/${id}`, { method: 'PUT', body: updates }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/wardrobe/${id}`, { method: 'DELETE' }),
};

// ---- Upload API ----
export const uploadAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiFetch<{ url: string; filename: string }>('/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

// ---- Profile API ----
export const profileAPI = {
  get: () =>
    apiFetch<any>('/profile'),

  update: (data: Record<string, any>) =>
    apiFetch<any>('/profile', { method: 'PUT', body: data }),
};
