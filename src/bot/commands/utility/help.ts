import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from 'discord.js';
import { BotClient } from '../../../shared/types';
import { moduleColor } from '../../utils';

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
  social: '👥',
  sticky: '📌',
};

const moduleNames: Record<string, string> = {
  invites: 'Invitaciones',
  leveling: 'Niveles',
  moderation: 'Moderación',
  automod: 'AutoMod',
  tickets: 'Tickets',
  automation: 'Automatización',
  reputation: 'Reputación',
  giveaway: 'Sorteos',
  suggestions: 'Sugerencias',
  config: 'Configuración',
  utility: 'Utilidades',
  backup: 'Respaldos',
  social: 'Social',
  sticky: 'Mensajes Fijos',
};

export default {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Ver todos los comandos e información del bot')
    .addStringOption((opt) =>
      opt
        .setName('comando')
        .setDescription('Obtener ayuda detallada de un comando específico')
        .setRequired(false)
    ),
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as BotClient;
    const specificCommand = interaction.options.getString('comando');

    if (specificCommand) {
      const command = client.commands.get(specificCommand);
      if (!command) {
        await interaction.reply({ content: `Comando \`/${specificCommand}\` no encontrado.`, ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(moduleColor(command.module || 'default'))
        .setTitle(`/${command.data.name}`)
        .setDescription(command.data.description)
        .addFields(
          { name: 'Módulo', value: moduleNames[command.module || ''] || command.module || 'General', inline: true },
          { name: 'Cooldown', value: `${command.cooldown || 3}s`, inline: true },
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Organizar comandos por módulo
    const modules: Record<string, { name: string; description: string }[]> = {};

    for (const [, cmd] of client.commands) {
      const mod = cmd.module || 'utility';
      if (!modules[mod]) modules[mod] = [];
      modules[mod].push({ name: `/${cmd.data.name}`, description: cmd.data.description });
    }

    // Embed principal con resumen de módulos
    const fields = Object.entries(modules).map(([mod, cmds]) => {
      const emoji = moduleEmojis[mod] || '📦';
      const cmdList = cmds.map((c) => `\`${c.name}\``).join(' ');
      return {
        name: `${emoji} ${moduleNames[mod] || mod.charAt(0).toUpperCase() + mod.slice(1)}`,
        value: cmdList,
        inline: false,
      };
    });

    const mainEmbed = new EmbedBuilder()
      .setColor(moduleColor('default'))
      .setAuthor({
        name: `${client.user?.username || 'Vapiano Bot'} — Ayuda`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setDescription(
        `¡Bienvenido a **Vapiano Bot**! Aquí tienes todos los comandos disponibles.\n` +
        `Usa el menú de abajo para ver los detalles de cada módulo.`
      )
      .addFields(fields)
      .setFooter({ text: `${client.commands.size} comandos | Selecciona un módulo para más detalles` })
      .setTimestamp();

    // Select menu con los módulos disponibles
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ayuda_modulo')
      .setPlaceholder('Selecciona un módulo para ver sus comandos en detalle...')
      .addOptions(
        Object.entries(modules).map(([mod, cmds]) => ({
          label: moduleNames[mod] || mod.charAt(0).toUpperCase() + mod.slice(1),
          description: `${cmds.length} comando${cmds.length !== 1 ? 's' : ''}`,
          value: mod,
          emoji: moduleEmojis[mod] || '📦',
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const reply = await interaction.reply({ embeds: [mainEmbed], components: [row] });

    // Collector para manejar selección de módulo (2 minutos)
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (menuInteraction: StringSelectMenuInteraction) => {
      const selectedMod = menuInteraction.values[0];
      const cmds = modules[selectedMod];
      if (!cmds) return;

      const emoji = moduleEmojis[selectedMod] || '📦';
      const modName = moduleNames[selectedMod] || selectedMod.charAt(0).toUpperCase() + selectedMod.slice(1);

      const moduleEmbed = new EmbedBuilder()
        .setColor(moduleColor(selectedMod))
        .setTitle(`${emoji} Módulo: ${modName}`)
        .setDescription(
          cmds.map((c) => `**${c.name}**\n╰ ${c.description}`).join('\n\n')
        )
        .setFooter({ text: `Usa /ayuda <comando> para más detalles de un comando` })
        .setTimestamp();

      await menuInteraction.update({ embeds: [moduleEmbed], components: [row] });
    });

    collector.on('end', () => {
      // Deshabilitar el menú al expirar
      selectMenu.setDisabled(true);
      reply.edit({ components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)] }).catch(() => {});
    });
  },
};
