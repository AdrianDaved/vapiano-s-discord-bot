import type {
  MeResponse,
  Guild,
  GuildChannel,
  GuildRole,
  GuildConfig,
  TicketPanel,
  Ticket,
  TicketListResponse,
  TicketStatsResponse,
  InviteEntry,
  SuccessResponse,
} from './types';

const API_BASE = '/api';
const AUTH_BASE = '/auth';

/** Stored JWT token */
let token: string | null = localStorage.getItem('token');

export function setToken(t: string | null): void {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export function getToken(): string | null {
  return token;
}

/**
 * Generic JSON fetch helper. Authenticates via Authorization header (or
 * the same JWT cookie set during the OAuth callback). Throws an Error
 * with the API's `error` message on non-2xx, redirects to /login on 401.
 */
async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
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
    const detail = err.details
      ? ` [${err.details.map((d: { path: string; message: string }) => `${d.path}: ${d.message}`).join(', ')}]`
      : '';
    throw new Error((err.error || `HTTP ${res.status}`) + detail);
  }

  // 204 No Content (common for DELETE)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null as T;
  }

  return res.json() as Promise<T>;
}

/** Build a query string from an optional params object, skipping undefined. */
function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

const guildBase = (guildId: string) => `${API_BASE}/guilds/${guildId}`;

/** Inputs that are sent to the backend stay loose — Zod validates server-side. */
type Body = Record<string, unknown>;

// ─── Auth ────────────────────────────────────────────────
export const auth = {
  getLoginUrl: (): string => `${AUTH_BASE}/login`,
  getUser: (): Promise<MeResponse> => apiFetch<MeResponse>(`${AUTH_BASE}/me`),
  logout: (): Promise<SuccessResponse> => apiFetch<SuccessResponse>(`${AUTH_BASE}/logout`, { method: 'POST' }),
};

// ─── Guilds ──────────────────────────────────────────────
export const guilds = {
  list: (): Promise<Guild[]> => apiFetch<Guild[]>(`${API_BASE}/guilds`),
  channels: (guildId: string): Promise<GuildChannel[]> => apiFetch<GuildChannel[]>(`${guildBase(guildId)}/channels`),
  roles: (guildId: string): Promise<GuildRole[]> => apiFetch<GuildRole[]>(`${guildBase(guildId)}/roles`),
};

// ─── Guild Config ────────────────────────────────────────
export const config = {
  get: (guildId: string): Promise<GuildConfig> => apiFetch<GuildConfig>(`${guildBase(guildId)}/config`),
  update: (guildId: string, data: Body): Promise<GuildConfig> =>
    apiFetch<GuildConfig>(`${guildBase(guildId)}/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  clone: (guildId: string, targetGuildId: string, sections: string[]): Promise<{ success: true; cloned: number; targetGuildId: string }> =>
    apiFetch(`${guildBase(guildId)}/config/clone`, {
      method: 'POST',
      body: JSON.stringify({ targetGuildId, sections }),
    }),
};

// ─── Stats ───────────────────────────────────────────────
export const stats = {
  get: (guildId: string): Promise<any> => apiFetch(`${guildBase(guildId)}/stats`),
};

// ─── Invites ─────────────────────────────────────────────
export const invites = {
  list: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/invites`),
  // Backend returns `{ leaderboard: InviteEntry[], ... }` — kept loose so the
  // page can pull additional fields (total/fakes) without casts.
  leaderboard: (guildId: string): Promise<any> => apiFetch(`${guildBase(guildId)}/invites/leaderboard`),
};

// ─── Moderation ──────────────────────────────────────────
export const moderation = {
  actions: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/moderation/actions`),
  warnings: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/moderation/warnings`),
  deleteWarning: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/moderation/warnings/${id}`, { method: 'DELETE' }),
};

// ─── Tickets ─────────────────────────────────────────────
export interface TicketListParams extends Record<string, unknown> {
  status?: string;
  panelId?: string;
  userId?: string;
  priority?: string;
  page?: number;
  limit?: number;
}
export interface TicketTranscriptListParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  userId?: string;
}
export interface TicketDeployBody {
  channelId: string;
  embedTitle: string;
  embedDescription: string;
  embedColor: string;
  panelIds: string[];
}

// Tickets endpoints deliberately return `any`: Tickets.tsx maintains its own
// richer TicketPanel/TicketEntry/TranscriptEntry interfaces with fields that
// aren't in the shared lib/types.ts yet. Tightening these returns would
// conflict with the page's local state types.
export const tickets = {
  list: (guildId: string, params?: TicketListParams): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets${qs(params)}`),
  stats: (guildId: string): Promise<any> => apiFetch(`${guildBase(guildId)}/tickets/stats`),
  get: (guildId: string, id: string): Promise<any> => apiFetch(`${guildBase(guildId)}/tickets/${id}`),
  update: (guildId: string, id: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Panels
  panels: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/tickets/panels`),
  getPanel: (guildId: string, id: string): Promise<any> => apiFetch(`${guildBase(guildId)}/tickets/panels/${id}`),
  createPanel: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets/panels`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePanel: (guildId: string, id: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets/panels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deletePanel: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/tickets/panels/${id}`, { method: 'DELETE' }),
  crossDeploy: (guildId: string, body: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets/panels/cross-deploy`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  syncPanel: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/tickets/panels/${id}/sync`, { method: 'POST' }),
  deployPanels: (guildId: string, data: TicketDeployBody): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets/panels/deploy`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Transcripts
  transcripts: (guildId: string, params?: TicketTranscriptListParams): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets/transcripts${qs(params)}`),
  getTranscript: (guildId: string, id: string): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/tickets/transcripts/${id}`),
  getTranscriptHtmlUrl: (guildId: string, id: string): string =>
    `${guildBase(guildId)}/tickets/transcripts/${id}/html`,
};

// ─── Automation ──────────────────────────────────────────
export const automation = {
  responses: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/automation/responses`),
  createResponse: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/automation/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateResponse: (guildId: string, id: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/automation/responses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteResponse: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/automation/responses/${id}`, { method: 'DELETE' }),
  scheduled: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/automation/scheduled`),
  createScheduled: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/automation/scheduled`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateScheduled: (guildId: string, id: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/automation/scheduled/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteScheduled: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/automation/scheduled/${id}`, { method: 'DELETE' }),
  polls: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/automation/polls`),
};

// ─── Backups ─────────────────────────────────────────────
export const backups = {
  list: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/backups`),
  get: (guildId: string, id: string): Promise<any> => apiFetch(`${guildBase(guildId)}/backups/${id}`),
  delete: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/backups/${id}`, { method: 'DELETE' }),
};

// ─── Reputation ──────────────────────────────────────────
export const reputation = {
  leaderboard: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/reputation`),
  recent: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/reputation/recent`),
};

// ─── Giveaways ───────────────────────────────────────────
export const giveaways = {
  list: (guildId: string, status?: string): Promise<any[]> =>
    apiFetch(`${guildBase(guildId)}/giveaways${qs({ status })}`),
};

// ─── Suggestions ─────────────────────────────────────────
export const suggestions = {
  list: (guildId: string, status?: string): Promise<any[]> =>
    apiFetch(`${guildBase(guildId)}/suggestions${qs({ status })}`),
};

// ─── Starboard ───────────────────────────────────────────
export const starboard = {
  // Backend returns `{ entries, total, page, pages }` — kept loose so the
  // page can read both the array and the pagination envelope.
  list: (guildId: string, page?: number): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/starboard${qs({ page })}`),
  settings: (guildId: string): Promise<any> => apiFetch(`${guildBase(guildId)}/starboard/settings`),
  updateSettings: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/starboard/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteEntry: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/starboard/${id}`, { method: 'DELETE' }),
};

// ─── Welcome / Farewell ──────────────────────────────────
export const welcome = {
  get: (guildId: string): Promise<GuildConfig> => apiFetch<GuildConfig>(`${guildBase(guildId)}/welcome`),
  update: (guildId: string, data: Body): Promise<GuildConfig> =>
    apiFetch<GuildConfig>(`${guildBase(guildId)}/welcome`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  test: (guildId: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/welcome/test`, { method: 'POST' }),
};

// ─── Reaction Roles ──────────────────────────────────────
export const reactionRoles = {
  list: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/reactionroles`),
  create: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/reactionroles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (guildId: string, id: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/reactionroles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/reactionroles/${id}`, { method: 'DELETE' }),
};

// ─── Sticky Messages ────────────────────────────────────
export const sticky = {
  list: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/sticky`),
  get: (guildId: string, channelId: string): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/sticky/${channelId}`),
  create: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/sticky`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (guildId: string, channelId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/sticky/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (guildId: string, channelId: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/sticky/${channelId}`, { method: 'DELETE' }),
};

// ─── Logging ─────────────────────────────────────────────
export const logging = {
  get: (guildId: string): Promise<GuildConfig> => apiFetch<GuildConfig>(`${guildBase(guildId)}/logging`),
  update: (guildId: string, data: Body): Promise<GuildConfig> =>
    apiFetch<GuildConfig>(`${guildBase(guildId)}/logging`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Rifas: Rifas.tsx has its own RifaConfig interface which diverges from
// GuildConfig; keep these responses loose so the page's local types win.
export const rifas = {
  list: (guildId: string, status?: string): Promise<any[]> =>
    apiFetch(`${guildBase(guildId)}/rifas${qs({ status })}`),
  getConfig: (guildId: string): Promise<any> => apiFetch(`${guildBase(guildId)}/rifas/config`),
  updateConfig: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/rifas/config`, { method: 'PATCH', body: JSON.stringify(data) }),
  deployPanel: (guildId: string, data: Body): Promise<any> =>
    apiFetch(`${guildBase(guildId)}/rifas/deploy-panel`, { method: 'POST', body: JSON.stringify(data) }),
  draw: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/rifas/${id}/sortear`, { method: 'POST' }),
  cancel: (guildId: string, id: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/rifas/${id}`, { method: 'DELETE' }),
};

// ─── Messages ────────────────────────────────────
export const messages = {
  send: (guildId: string, data: Body): Promise<{ success: true; messageId: string }> =>
    apiFetch(`${guildBase(guildId)}/messages/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Commands ────────────────────────────────────
export interface CommandUpdateBody {
  disabled?: boolean;
  roleIds?: string[];
}
export const commandsApi = {
  list: (guildId: string): Promise<any[]> => apiFetch(`${guildBase(guildId)}/commands`),
  update: (guildId: string, command: string, data: CommandUpdateBody): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/commands/${encodeURIComponent(command)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  sync: (guildId: string): Promise<SuccessResponse> =>
    apiFetch<SuccessResponse>(`${guildBase(guildId)}/commands/sync`, { method: 'POST' }),
};
