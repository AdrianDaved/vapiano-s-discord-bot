import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { BotClient } from '../../../shared/types';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all commands and bot information')
    .addStringOption((opt) =>
      opt
        .setName('command')
        .setDescription('Get detailed help for a specific command')
        .setRequired(false)
    ),
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as BotClient;
    const specificCommand = interaction.options.getString('command');

    if (specificCommand) {
      // Show help for a specific command
      const command = client.commands.get(specificCommand);
      if (!command) {
        await interaction.reply({ content: `Command \`/${specificCommand}\` not found.`, ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(moduleColor(command.module || 'default'))
        .setTitle(`/${command.data.name}`)
        .setDescription(command.data.description)
        .addFields(
          { name: 'Module', value: command.module || 'General', inline: true },
          { name: 'Cooldown', value: `${command.cooldown || 3}s`, inline: true },
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Organize commands by module
    const modules: Record<string, { name: string; description: string }[]> = {};

    for (const [, cmd] of client.commands) {
      const mod = cmd.module || 'utility';
      if (!modules[mod]) modules[mod] = [];
      modules[mod].push({
        name: `/${cmd.data.name}`,
        description: cmd.data.description,
      });
    }

    const moduleEmojis: Record<string, string> = {
      invites: '📨',
      leveling: '🏆',
      moderation: '🛡️',
      automod: '🤖',
      tickets: '🎫',
      automation: '⚡',
      reputation: '⭐',
      giveaway: '🎉',
      suggestions: '💡',
      config: '⚙️',
      utility: '🔧',
      backup: '💾',
    };

    const fields = Object.entries(modules).map(([mod, cmds]) => {
      const emoji = moduleEmojis[mod] || '📦';
      const cmdList = cmds.map((c) => `\`${c.name}\``).join(' ');
      return { name: `${emoji} ${mod.charAt(0).toUpperCase() + mod.slice(1)}`, value: cmdList, inline: false };
    });

    const embed = new EmbedBuilder()
      .setColor(moduleColor('default'))
      .setAuthor({
        name: `${client.user?.username || 'Vapiano Bot'} — Help`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setDescription(
        `Welcome to **Vapiano Bot**! Here are all available commands.\n` +
        `Use \`/help <command>\` for detailed info on a specific command.\n\n` +
        `**Dashboard:** [Open Dashboard](${process.env.DASHBOARD_URL || 'http://localhost:5173'})`
      )
      .addFields(fields)
      .setFooter({ text: `${client.commands.size} commands | ${client.guilds.cache.size} servers` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
