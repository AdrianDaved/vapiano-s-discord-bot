const API_BASE = '/api';
const AUTH_BASE = '/auth';

/** Stored JWT token */
let token: string | null = localStorage.getItem('token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export function getToken(): string | null {
  return token;
}

/** Make an authenticated API request */
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('No autorizado');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Solicitud fallida' }));
    const detail = err.details ? ` [${err.details.map((d: any) => `${d.path}: ${d.message}`).join(', ')}]` : '';
    throw new Error((err.error || `HTTP ${res.status}`) + detail);
  }

  // Handle 204 No Content (common for DELETE endpoints)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null;
  }

  return res.json();
}


// ─── Messages ────────────────────────────────────────
export const messages = {
  send: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/messages/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
