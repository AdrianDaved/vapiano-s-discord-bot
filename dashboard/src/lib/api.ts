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

// ─── Auth ────────────────────────────────────────────────
export const auth = {
  getLoginUrl: () => `${AUTH_BASE}/login`,
  getUser: () => apiFetch(`${AUTH_BASE}/me`),
  logout: () => apiFetch(`${AUTH_BASE}/logout`, { method: 'POST' }),
};

// ─── Guilds ──────────────────────────────────────────────
export const guilds = {
  list: () => apiFetch(`${API_BASE}/guilds`),
  channels: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/channels`),
  roles: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/roles`),
};

// ─── Guild Config ────────────────────────────────────────
export const config = {
  get: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/config`),
  update: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  clone: (guildId: string, targetGuildId: string, sections: string[]) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/config/clone`, {
      method: 'POST',
      body: JSON.stringify({ targetGuildId, sections }),
    }),
};

// ─── Stats ───────────────────────────────────────────────
export const stats = {
  get: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/stats`),
};

// ─── Invites ─────────────────────────────────────────────
export const invites = {
  list: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/invites`),
  leaderboard: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/invites/leaderboard`),
};

// ─── Moderation ──────────────────────────────────────────
export const moderation = {
  actions: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/moderation/actions`),
  warnings: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/moderation/warnings`),
  deleteWarning: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/moderation/warnings/${id}`, { method: 'DELETE' }),
};

// ─── Tickets ─────────────────────────────────────────────
export const tickets = {
  // Tickets list with filters + pagination
  list: (guildId: string, params?: { status?: string; panelId?: string; userId?: string; priority?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.panelId) q.set('panelId', params.panelId);
    if (params?.userId) q.set('userId', params.userId);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch(`${API_BASE}/guilds/${guildId}/tickets${qs ? `?${qs}` : ''}`);
  },

  // Stats overview
  stats: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/tickets/stats`),

  // Single ticket
  get: (guildId: string, id: string) => apiFetch(`${API_BASE}/guilds/${guildId}/tickets/${id}`),
  update: (guildId: string, id: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Panels
  panels: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/tickets/panels`),
  getPanel: (guildId: string, id: string) => apiFetch(`${API_BASE}/guilds/${guildId}/tickets/panels/${id}`),
  createPanel: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/tickets/panels`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePanel: (guildId: string, id: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/tickets/panels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deletePanel: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/tickets/panels/${id}`, { method: 'DELETE' }),
  deployPanels: (guildId: string, data: { channelId: string; embedTitle: string; embedDescription: string; embedColor: string; panelIds: string[] }) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/tickets/panels/deploy`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Transcripts
  transcripts: (guildId: string, params?: { page?: number; limit?: number; userId?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.userId) q.set('userId', params.userId);
    const qs = q.toString();
    return apiFetch(`${API_BASE}/guilds/${guildId}/tickets/transcripts${qs ? `?${qs}` : ''}`);
  },
  getTranscript: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/tickets/transcripts/${id}`),
  getTranscriptHtmlUrl: (guildId: string, id: string) =>
    `${API_BASE}/guilds/${guildId}/tickets/transcripts/${id}/html`,
};

// ─── Automation ──────────────────────────────────────────
export const automation = {
  responses: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/automation/responses`),
  createResponse: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/automation/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateResponse: (guildId: string, id: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/automation/responses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteResponse: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/automation/responses/${id}`, { method: 'DELETE' }),
  scheduled: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/automation/scheduled`),
  createScheduled: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/automation/scheduled`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateScheduled: (guildId: string, id: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/automation/scheduled/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteScheduled: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/automation/scheduled/${id}`, { method: 'DELETE' }),
  polls: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/automation/polls`),
};

// ─── Backups ─────────────────────────────────────────────
export const backups = {
  list: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/backups`),
  get: (guildId: string, id: string) => apiFetch(`${API_BASE}/guilds/${guildId}/backups/${id}`),
  delete: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/backups/${id}`, { method: 'DELETE' }),
};

// ─── Reputation ──────────────────────────────────────────
export const reputation = {
  leaderboard: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/reputation`),
  recent: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/reputation/recent`),
};

// ─── Giveaways ───────────────────────────────────────────
export const giveaways = {
  list: (guildId: string, status?: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/giveaways${status ? `?status=${status}` : ''}`),
};

// ─── Suggestions ─────────────────────────────────────────
export const suggestions = {
  list: (guildId: string, status?: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/suggestions${status ? `?status=${status}` : ''}`),
};

// ─── Starboard ───────────────────────────────────────────
export const starboard = {
  list: (guildId: string, page?: number) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/starboard${page ? `?page=${page}` : ''}`),
  settings: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/starboard/settings`),
  updateSettings: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/starboard/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteEntry: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/starboard/${id}`, { method: 'DELETE' }),
};

// ─── Welcome / Farewell ──────────────────────────────────
export const welcome = {
  get: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/welcome`),
  update: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/welcome`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  test: (guildId: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/welcome/test`, { method: 'POST' }),
};

// ─── Reaction Roles ──────────────────────────────────────
export const reactionRoles = {
  list: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/reactionroles`),
  create: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/reactionroles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (guildId: string, id: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/reactionroles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (guildId: string, id: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/reactionroles/${id}`, { method: 'DELETE' }),
};

// ─── Sticky Messages ────────────────────────────────────
export const sticky = {
  list: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/sticky`),
  get: (guildId: string, channelId: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/sticky/${channelId}`),
  create: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/sticky`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (guildId: string, channelId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/sticky/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (guildId: string, channelId: string) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/sticky/${channelId}`, { method: 'DELETE' }),
};

// ─── Logging ─────────────────────────────────────────────
export const logging = {
  get: (guildId: string) => apiFetch(`${API_BASE}/guilds/${guildId}/logging`),
  update: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/logging`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};


// ─── Messages ────────────────────────────────────────
export const messages = {
  send: (guildId: string, data: any) =>
    apiFetch(`${API_BASE}/guilds/${guildId}/messages/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
