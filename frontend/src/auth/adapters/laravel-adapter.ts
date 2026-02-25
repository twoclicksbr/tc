import { AuthModel, UserModel } from '@/auth/lib/models';

const API_URL = import.meta.env.VITE_API_URL as string;
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG as string;

interface LaravelUser {
  id: number;
  email: string;
  active: boolean;
  person: {
    id: number;
    name: string;
  };
}

function mapUser(raw: LaravelUser): UserModel {
  const parts = raw.person.name.trim().split(' ');
  return {
    username: raw.person.name,
    email: raw.email,
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
    fullname: raw.person.name,
    is_admin: false,
  };
}

async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });
}

export const LaravelAdapter = {
  async login(email: string, password: string): Promise<{ auth: AuthModel; user: UserModel }> {
    const res = await apiFetch(`/v1/${TENANT_SLUG}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Credenciais inválidas.');
    }

    const data: { token: string; user: LaravelUser } = await res.json();

    const auth: AuthModel = { access_token: data.token };
    return { auth, user: mapUser(data.user) };
  },

  async logout(token: string): Promise<void> {
    await apiFetch(`/v1/${TENANT_SLUG}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async me(token: string): Promise<UserModel | null> {
    const res = await apiFetch(`/v1/${TENANT_SLUG}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const raw: LaravelUser = await res.json();
    return mapUser(raw);
  },
};
