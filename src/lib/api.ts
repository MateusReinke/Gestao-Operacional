import type { BootstrapData, User } from '@/types/sgo';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro ao processar a requisição.' }));
    throw new Error(error.message || 'Erro inesperado na API.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  bootstrap: () => request<BootstrapData>('/api/bootstrap'),
  login: (email: string, password: string) => request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  list: <T>(resource: string) => request<T[]>(`/api/${resource}`),
  create: <T>(resource: string, payload: unknown) => request<T>(`/api/${resource}`, { method: 'POST', body: JSON.stringify(payload) }),
  update: <T>(resource: string, id: string, payload: unknown) => request<T>(`/api/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (resource: string, id: string) => request<void>(`/api/${resource}/${id}`, { method: 'DELETE' }),
};
