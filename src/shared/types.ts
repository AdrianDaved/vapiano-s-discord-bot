import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  PermissionResolvable,
  Collection,
  Client,
  GatewayIntentBits,
} from 'discord.js';

/** Slash command definition */
export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  cooldown?: number; // seconds
  module?: string;   // which module this belongs to
  permissions?: PermissionResolvable[];
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/** Extended Discord client with command collection */
export interface BotClient extends Client {
  commands: Collection<string, SlashCommand>;
  cooldowns: Collection<string, Collection<string, number>>;
}

/** Guild config cache entry */
export interface CachedGuildConfig {
  data: any;
  fetchedAt: number;
}

/** Invite cache for tracking */
export interface InviteData {
  code: string;
  uses: number;
  inviterId: string | null;
}

/** Module names for enable/disable */
export type ModuleName =
  | 'invites'
  | 'moderation'
  | 'automod'
  | 'tickets'
  | 'automation'
  | 'welcome'
  | 'farewell'
  | 'reputation'
  | 'giveaway'
  | 'suggestions'
  | 'starboard'
  | 'afk'
  | 'backup'
  | 'sticky'
  | 'logging';

/** Map module name to GuildConfig toggle field */
export const MODULE_TOGGLE_MAP: Record<ModuleName, string> = {
  invites: 'invitesEnabled',
  moderation: 'moderationEnabled',
  automod: 'automodEnabled',
  tickets: 'ticketsEnabled',
  automation: 'automationEnabled',
  welcome: 'welcomeEnabled',
  farewell: 'farewellEnabled',
  reputation: 'reputationEnabled',
  giveaway: 'giveawayEnabled',
  suggestions: 'suggestionsEnabled',
  starboard: 'starboardEnabled',
  afk: 'afkEnabled',
  backup: 'backupEnabled',
  sticky: 'stickyEnabled',
  logging: 'loggingEnabled',
};
