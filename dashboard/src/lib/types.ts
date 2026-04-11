/**
 * Response types for the dashboard API client.
 *
 * These mirror the Prisma models that the API returns. They are kept here
 * (rather than imported from the backend's @prisma/client) so the dashboard
 * stays a self-contained Vite project — no cross-package tsconfig paths,
 * no `external` rules in vite config. The trade-off is that adding a new
 * field to the schema requires updating this file too; in exchange,
 * dashboard build / type-check stays fast.
 *
 * For request bodies we deliberately keep `Record<string, unknown>` /
 * loose objects: the API validates everything with Zod, so the boundary
 * check happens on the server.
 */

// ── Auth ────────────────────────────────────────────────────
export interface MeResponse {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  avatarUrl: string;
}

// ── Guilds ──────────────────────────────────────────────────
export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  owner: boolean;
  /** Whether the bot is a member of this guild. */
  botPresent: boolean;
}

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  position: number;
}

export interface GuildRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

// ── Guild config (subset of fields used by the dashboard) ───
export interface GuildConfig {
  id: string;
  prefix: string | null;
  language: string | null;
  // Welcome / farewell
  welcomeEnabled: boolean;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  welcomeImageEnabled: boolean;
  farewellEnabled: boolean;
  farewellChannelId: string | null;
  farewellMessage: string | null;
  joinRoleIds: string[];
  // Logging
  loggingEnabled: boolean;
  modLogChannelId: string | null;
  warnLogChannelId: string | null;
  messageLogChannelId: string | null;
  joinLeaveLogChannelId: string | null;
  auditLogChannelId: string | null;
  voiceLogChannelId: string | null;
  // AutoMod
  automodEnabled: boolean;
  antiSpamEnabled: boolean;
  antiSpamThreshold: number | null;
  antiSpamInterval: number | null;
  antiCapsEnabled: boolean;
  antiCapsThreshold: number | null;
  antiCapsMinLength: number | null;
  antiLinksEnabled: boolean;
  antiLinksWhitelist: string[];
  blacklistedWords: string[];
  automodExemptRoleIds: string[];
  automodExemptChannelIds: string[];
  // Moderation
  muteRoleId: string | null;
  // Tickets
  ticketsEnabled: boolean;
  ticketCategoryId: string | null;
  ticketLogChannelId: string | null;
  ticketStaffRoleIds: string[];
  ticketTranscriptChannelId: string | null;
  ticketCloseConfirmation: boolean;
  ticketDMTranscript: boolean;
  // Misc — keep an open shape for the rest of the columns the dashboard
  // doesn't yet read by name. The backend always returns the full row,
  // and Zod-strict validation happens on PATCH.
  // Use `any` rather than `unknown` so existing pages can still read
  // arbitrary fields (`config.darRangoRoles`, etc.) without explicit casts.
  [key: string]: any;
}

// ── Tickets ─────────────────────────────────────────────────
export interface TicketPanel {
  id: string;
  guildId: string;
  name: string;
  channelId: string | null;
  messageId: string | null;
  title: string | null;
  description: string | null;
  embedColor: string | null;
  footerText: string | null;
  buttonLabel: string | null;
  buttonEmoji: string | null;
  buttonColor: string;
  groupEmbedTitle: string | null;
  groupEmbedDescription: string | null;
  groupEmbedColor: string | null;
  panelAutoRepost: boolean;
  panelAutoRepostCooldown: number;
  panelAutoRepostIgnoreBots: boolean;
  [key: string]: any;
}

export interface Ticket {
  id: string;
  guildId: string;
  panelId: string | null;
  channelId: string;
  userId: string;
  status: string;
  priority: string | null;
  topic: string | null;
  claimedBy: string | null;
  rating: number | null;
  createdAt: string;
  closedAt: string | null;
  lastActivityAt: string | null;
  panel?: { id: string; name: string; title: string | null };
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pages: number;
}

export interface TicketStatsResponse {
  open: number;
  closed: number;
  total: number;
  panels: number;
  transcripts: number;
  thisWeek: number;
  avgRating: number | null;
}

// ── Stats / leaderboards ────────────────────────────────────
export interface InviteEntry {
  userId: string;
  username: string | null;
  invites: number;
  fakes: number;
  left: number;
  total: number;
}

// ── Generic response shapes ─────────────────────────────────
export interface SuccessResponse {
  success: true;
}

export interface ApiError {
  error: string;
  details?: Array<{ path: string; message: string }>;
}
