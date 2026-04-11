/**
 * Zod schemas for API request validation.
 */
import { z } from 'zod';

// Snowflake (Discord ID): 17-20 digit string
const snowflake = z.string().regex(/^\d{17,20}$/, 'Must be a valid Discord ID').nullable().optional();
const snowflakeRequired = z.string().regex(/^\d{17,20}$/, 'Must be a valid Discord ID');
const snowflakeArray = z.array(z.string().regex(/^\d{17,20}$/)).optional();

// ─── Config ──────────────────────────────────────────────
export const configUpdateSchema = z.object({
  prefix: z.string().min(1).max(5).optional(),
  language: z.enum(['en', 'es', 'fr', 'de', 'pt']).optional(),

  // Module toggles
  invitesEnabled: z.boolean().optional(),
  moderationEnabled: z.boolean().optional(),
  automodEnabled: z.boolean().optional(),
  ticketsEnabled: z.boolean().optional(),
  automationEnabled: z.boolean().optional(),
  welcomeEnabled: z.boolean().optional(),
  farewellEnabled: z.boolean().optional(),
  reputationEnabled: z.boolean().optional(),
  giveawayEnabled: z.boolean().optional(),
  suggestionsEnabled: z.boolean().optional(),
  starboardEnabled: z.boolean().optional(),
  afkEnabled: z.boolean().optional(),
  backupEnabled: z.boolean().optional(),
  stickyEnabled: z.boolean().optional(),
  loggingEnabled: z.boolean().optional(),

  // Channel IDs
  welcomeChannelId: snowflake,
  farewellChannelId: snowflake,
  modLogChannelId: snowflake,
  messageLogChannelId: snowflake,
  joinLeaveLogChannelId: snowflake,
  auditLogChannelId: snowflake,
  voiceLogChannelId: snowflake,
  ticketCategoryId: snowflake,
  ticketLogChannelId: snowflake,
  ticketTranscriptChannelId: snowflake,
  suggestionsChannelId: snowflake,
  suggestionsLogChannelId: snowflake,
  starboardChannelId: snowflake,
  repChannelId: snowflake,
  muteRoleId: snowflake,

  // Strings
  welcomeMessage: z.string().max(2000).optional(),
  farewellMessage: z.string().max(2000).optional(),
  welcomeImageEnabled: z.boolean().optional(),

  // Numbers
  antiSpamThreshold: z.number().int().min(1).max(50).optional(),
  antiSpamInterval: z.number().int().min(1).max(60).optional(),
  antiCapsThreshold: z.number().int().min(30).max(100).optional(),
  antiCapsMinLength: z.number().int().min(5).max(500).optional(),
  repCooldown: z.number().int().min(0).max(604800).optional(),
  starboardThreshold: z.number().int().min(1).max(100).optional(),
  starboardEmoji: z.string().max(50).optional(),

  // Booleans
  antiSpamEnabled: z.boolean().optional(),
  antiFloodEnabled: z.boolean().optional(),
  antiCapsEnabled: z.boolean().optional(),
  antiLinksEnabled: z.boolean().optional(),
  blacklistEnabled: z.boolean().optional(),
  ticketCloseConfirmation: z.boolean().optional(),
  ticketDMTranscript: z.boolean().optional(),

  // Arrays
  joinRoleIds: snowflakeArray,
  darRangoAccessMessage: z.string().max(1000).optional().nullable(),
  darRangoVipMessage: z.string().max(1000).optional().nullable(),
  darRangoDefaultMessage: z.string().max(1000).optional().nullable(),
  darRangoRoles: z.array(z.object({
    id: z.string(),
    pattern: z.string().max(100),
    emoji: z.string().max(10).optional(),
    message: z.string().max(1000).optional(),
  })).optional().nullable(),
  statsChannels: z.array(z.object({
    id: z.string(),
    channelId: z.string(),
    type: z.string(),
    format: z.string().max(200),
  })).optional().nullable(),
  ticketStaffRoleIds: snowflakeArray,
  antiLinksWhitelist: z.array(z.string().max(200)).optional(),
  blacklistedWords: z.array(z.string().max(100)).optional(),
  automodExemptRoleIds: snowflakeArray,
  automodExemptChannelIds: snowflakeArray,
  moduleAllowedRoles: z.record(z.string(), z.array(z.string().regex(/^\d{17,20}$/))).optional(),
}).strict();

// ─── Welcome ─────────────────────────────────────────────
export const welcomeUpdateSchema = z.object({
  welcomeEnabled: z.boolean().optional(),
  welcomeChannelId: snowflake,
  welcomeMessage: z.string().max(2000).nullable().optional(),
  welcomeImageEnabled: z.boolean().optional(),
  farewellEnabled: z.boolean().optional(),
  farewellChannelId: snowflake,
  farewellMessage: z.string().max(2000).nullable().optional(),
  joinRoleIds: z.array(z.string().regex(/^\d{17,20}$/)).optional(),
}).strict();

// ─── Starboard Settings ─────────────────────────────────
export const starboardSettingsSchema = z.object({
  starboardEnabled: z.boolean().optional(),
  starboardChannelId: snowflake,
  starboardEmoji: z.string().max(50).optional(),
  starboardThreshold: z.number().int().min(1).max(100).optional(),
}).strict();

// ─── Reaction Roles ──────────────────────────────────────
export const reactionRoleCreateSchema = z.object({
  channelId: snowflakeRequired,
  messageId: snowflakeRequired,
  emoji: z.string().min(1).max(100),
  roleId: snowflakeRequired,
  type: z.enum(['toggle', 'give', 'remove']).default('toggle'),
}).strict();

export const reactionRoleUpdateSchema = z.object({
  emoji: z.string().min(1).max(100).optional(),
  roleId: z.string().regex(/^\d{17,20}$/).optional(),
  type: z.enum(['toggle', 'give', 'remove']).optional(),
}).strict();

// ─── Sticky Messages ────────────────────────────────────
export const stickyCreateSchema = z.object({
  channelId: snowflakeRequired,
  title: z.string().max(256).nullable().optional(),
  description: z.string().min(1).max(4000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#5865F2'),
  enabled: z.boolean().optional().default(true),
}).strict();

export const stickyUpdateSchema = z.object({
  title: z.string().max(256).nullable().optional(),
  description: z.string().min(1).max(4000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  enabled: z.boolean().optional(),
}).strict();

// ─── Logging ─────────────────────────────────────────────
export const loggingUpdateSchema = z.object({
  loggingEnabled: z.boolean().optional(),
  modLogChannelId: z.union([snowflakeRequired, z.literal(''), z.null()]).optional(),
  warnLogChannelId: z.union([snowflakeRequired, z.literal(''), z.null()]).optional(),
  messageLogChannelId: z.union([snowflakeRequired, z.literal(''), z.null()]).optional(),
  joinLeaveLogChannelId: z.union([snowflakeRequired, z.literal(''), z.null()]).optional(),
  auditLogChannelId: z.union([snowflakeRequired, z.literal(''), z.null()]).optional(),
  voiceLogChannelId: z.union([snowflakeRequired, z.literal(''), z.null()]).optional(),
  verificationLogChannelId: z.union([snowflakeRequired, z.literal(''), z.null()]).optional(),
}).strict();

// ─── Automation ──────────────────────────────────────────
export const autoResponseCreateSchema = z.object({
  trigger: z.string().min(1).max(200),
  response: z.string().min(1).max(2000),
  matchType: z.enum(['exact', 'contains', 'startsWith', 'regex']).default('contains'),
  enabled: z.boolean().optional().default(true),
}).strict();

export const autoResponseUpdateSchema = z.object({
  trigger: z.string().min(1).max(200).optional(),
  response: z.string().min(1).max(2000).optional(),
  matchType: z.enum(['exact', 'contains', 'startsWith', 'regex']).optional(),
  enabled: z.boolean().optional(),
}).strict();

export const scheduledMessageCreateSchema = z.object({
  channelId: snowflakeRequired,
  message: z.string().min(1).max(2000),
  cron: z.string().min(9).max(100), // Basic cron expression length validation
  enabled: z.boolean().optional().default(true),
}).strict();

export const scheduledMessageUpdateSchema = z.object({
  channelId: z.string().regex(/^\d{17,20}$/).optional(),
  message: z.string().min(1).max(2000).optional(),
  cron: z.string().min(9).max(100).optional(),
  enabled: z.boolean().optional(),
}).strict();

// ─── Tickets ─────────────────────────────────────────────
export const ticketPanelCreateSchema = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
  channelId: snowflakeRequired,
  title: z.string().max(256).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  embedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  footerText: z.string().max(256).nullable().optional(),
  buttonLabel: z.string().max(80).nullable().optional(),
  buttonEmoji: z.string().max(100).nullable().optional(),
  buttonColor: z.string().max(20).nullable().optional(),
  style: z.string().max(50).nullable().optional(),
  categoryId: snowflake,
  closedCategoryId: snowflake,
  namingPattern: z.string().max(100).nullable().optional(),
  staffRoleIds: snowflakeArray,
  adminRoleIds: snowflakeArray,
  ticketLimit: z.number().int().min(1).max(9999).optional(),
  mentionStaff: z.boolean().optional(),
  mentionCreator: z.boolean().optional(),
  welcomeTitle: z.string().max(256).nullable().optional(),
  welcomeMessage: z.string().max(2000).nullable().optional(),
  welcomeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  closeRequestEnabled: z.boolean().optional(),
  closeRequestMessage: z.string().max(1000).nullable().optional(),
  claimEnabled: z.boolean().optional(),
  claimLockOthers: z.boolean().optional(),
  transcriptEnabled: z.boolean().optional(),
  transcriptChannelId: snowflake,
  transcriptDMUser: z.boolean().optional(),
  transcriptDMStaff: z.boolean().optional(),
  logChannelId: snowflake,
  showCloseButton: z.boolean().optional(),
  showClaimButton: z.boolean().optional(),
  showTranscriptButton: z.boolean().optional(),
  formEnabled: z.boolean().optional(),
  formTitle: z.string().max(256).nullable().optional(),
  formQuestions: z.array(z.any()).max(5).nullable().optional(),
  escalatePanelId: snowflake,
  feedbackEnabled: z.boolean().optional(),
  feedbackMessage: z.string().max(1000).nullable().optional(),
  autoCloseHours: z.number().int().min(0).max(720).optional(),
  panelAutoRepost: z.boolean().optional(),
  panelAutoRepostCooldown: z.number().int().min(1).max(300).optional(),
  panelAutoRepostIgnoreBots: z.boolean().optional(),
  groupEmbedTitle: z.string().max(256).nullable().optional(),
  groupEmbedDescription: z.string().max(4000).nullable().optional(),
  groupEmbedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
}).strict();

export const ticketPanelUpdateSchema = ticketPanelCreateSchema.partial().omit({ channelId: true }).extend({
  channelId: z.string().regex(/^\d{17,20}$/).optional(),
}).strict();

export const ticketUpdateSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  topic: z.string().max(256).optional(),
  status: z.enum(['open', 'closed']).optional(),
}).strict();
