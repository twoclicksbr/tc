import { getAuth } from '@/auth/lib/helpers';
import { isSandbox } from '@/lib/tenant';

function getApiUrl(): string {
  const base = import.meta.env.VITE_API_URL as string;
  return isSandbox()
    ? base.replace('://api.', '://api.sandbox.')
    : base;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const auth = getAuth();
  const token = auth?.access_token;

  return fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const err = Object.assign(new Error(`API error: ${res.status}`), { status: res.status, data: json });
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const err = Object.assign(new Error(`API error: ${res.status}`), { status: res.status, data: json });
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const err = Object.assign(new Error(`API error: ${res.status}`), { status: res.status, data: json });
    throw err;
  }
  return res.json() as Promise<T>;
}
