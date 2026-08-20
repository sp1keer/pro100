import type { Client, Lesson, LessonsReport, SalaryReportItem, TokenPair, Tutor, User } from './types';

const API_BASE = '/api';
const ACCESS_KEY = 'pro100_access';
const REFRESH_KEY = 'pro100_refresh';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: TokenPair) {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (tokenStore.access) headers.set('Authorization', `Bearer ${tokenStore.access}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401 && retry && tokenStore.refresh) {
    const tokens = await authApi.refresh(tokenStore.refresh);
    tokenStore.set(tokens);
    return request<T>(path, init, false);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Request failed' }));
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map((item: { msg?: string }) => item.msg || 'Validation error').join(', ')
      : payload.detail;
    throw new Error(detail || 'Request failed');
  }
  return response.json();
}

export const authApi = {
  login: (login: string, password: string) =>
    request<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }, false),
  refresh: (refresh_token: string) =>
    request<TokenPair>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) }, false),
};

export const usersApi = {
  list: () => request<User[]>('/users'),
  create: (payload: { login: string; password: string; role: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: { login: string; role: string; password?: string }) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' }),
};

export const tutorsApi = {
  list: () => request<Tutor[]>('/tutors'),
  create: (payload: Omit<Tutor, 'id'>) => request<Tutor>('/tutors', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: Omit<Tutor, 'id'>) =>
    request<Tutor>(`/tutors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: number) => request<void>(`/tutors/${id}`, { method: 'DELETE' }),
  stats: (id: number) => request<SalaryReportItem>(`/tutors/${id}/stats`),
};

export const clientsApi = {
  list: (search = '') => request<Client[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  create: (payload: Omit<Client, 'id'>) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: Omit<Client, 'id'>) =>
    request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: number) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
};

export const lessonsApi = {
  list: (params: Record<string, string> = {}) => {
    const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
    return request<Lesson[]>(`/lessons${search.size ? `?${search}` : ''}`);
  },
  create: (payload: Omit<Lesson, 'id'>) =>
    request<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: Omit<Lesson, 'id'>) =>
    request<Lesson>(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: number) => request<void>(`/lessons/${id}`, { method: 'DELETE' }),
};


export const reportsApi = {
  salary: () => request<SalaryReportItem[]>('/reports/salary'),
  lessons: () => request<LessonsReport>('/reports/lessons'),
};
