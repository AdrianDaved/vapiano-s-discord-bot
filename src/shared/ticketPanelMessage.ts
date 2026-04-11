/**
 * Single source of truth for building a ticket-panel Discord message.
 *
 * Previously the embed + buttons were rebuilt in three places:
 *  - src/api/routes/tickets.ts → syncDiscordMessage()
 *  - src/api/routes/tickets.ts → /panels/deploy and /panels/cross-deploy
 *  - src/bot/events/messageCreate.ts → panel auto-repost
 *
 * Each version drifted slightly from the others (button color casing,
 * default colors, embed fallbacks). This module returns a plain
 * `{ embeds, components }` payload that's compatible with both
 * `discord.js channel.send()` and `@discordjs/rest channelMessages POST`.
 */

export interface TicketPanelLike {
  id: string;
  name: string;
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
}

export interface PanelMessageOverrides {
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
}

const BUTTON_STYLE: Record<string, number> = {
  Primary: 1, primary: 1,
  Secondary: 2, secondary: 2,
  Success: 3, success: 3,
  Danger: 4, danger: 4,
};

const DEFAULT_TITLE = 'Sistema de Tickets';
const DEFAULT_DESCRIPTION = '';
const DEFAULT_COLOR_HEX = '#5865F2';
const DEFAULT_COLOR_INT = 0x5865f2;

function parseColor(hex: string | null | undefined): number {
  if (!hex) return DEFAULT_COLOR_INT;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : DEFAULT_COLOR_INT;
}

function buildButton(panel: TicketPanelLike): Record<string, unknown> {
  const component: Record<string, unknown> = {
    type: 2,
    style: BUTTON_STYLE[panel.buttonColor] ?? BUTTON_STYLE.Primary,
    label: panel.buttonLabel || panel.name,
    custom_id: `ticket_create_${panel.id}`,
  };
  if (panel.buttonEmoji) {
    const customMatch = panel.buttonEmoji.match(/^<a?:(\w+):(\d+)>$/);
    component.emoji = customMatch
      ? { name: customMatch[1], id: customMatch[2] }
      : { name: panel.buttonEmoji };
  }
  return component;
}

/**
 * Build the embed + button-row payload for a group of ticket panels that
 * share a single Discord message. Pass overrides when the caller (deploy
 * endpoint) wants to set new group embed values that haven't been persisted
 * to the panel rows yet.
 */
export function buildPanelMessage(
  panels: readonly TicketPanelLike[],
  overrides: PanelMessageOverrides = {},
): { embeds: Array<Record<string, unknown>>; components: Array<Record<string, unknown>> } {
  if (panels.length === 0) {
    throw new Error('buildPanelMessage requires at least one panel');
  }

  const first = panels[0];
  const title = overrides.embedTitle ?? first.groupEmbedTitle ?? first.title ?? DEFAULT_TITLE;
  const description =
    overrides.embedDescription ?? first.groupEmbedDescription ?? first.description ?? DEFAULT_DESCRIPTION;
  const color = parseColor(overrides.embedColor ?? first.groupEmbedColor ?? first.embedColor ?? DEFAULT_COLOR_HEX);

  const embed: Record<string, unknown> = { title, description, color };
  if (first.footerText) embed.footer = { text: first.footerText };

  return {
    embeds: [embed],
    components: [{ type: 1, components: panels.map(buildButton) }],
  };
}
