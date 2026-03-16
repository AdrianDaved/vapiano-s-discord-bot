import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, getGuildConfig } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('sugerencia')
    .setDescription('Sistema de sugerencias')
    .addSubcommand((sub) =>
      sub
        .setName('crear')
        .setDescription('Enviar una nueva sugerencia')
        .addStringOption((opt) => opt.setName('contenido').setDescription('Tu sugerencia').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('aprobar')
        .setDescription('Aprobar una sugerencia (solo mods)')
        .addStringOption((opt) => opt.setName('id').setDescription('ID de la sugerencia').setRequired(true))
        .addStringOption((opt) => opt.setName('nota').setDescription('Nota del staff').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('rechazar')
        .setDescription('Rechazar una sugerencia (solo mods)')
        .addStringOption((opt) => opt.setName('id').setDescription('ID de la sugerencia').setRequired(true))
        .addStringOption((opt) => opt.setName('nota').setDescription('Razón del rechazo').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('implementar')
        .setDescription('Marcar una sugerencia como implementada (solo mods)')
        .addStringOption((opt) => opt.setName('id').setDescription('ID de la sugerencia').setRequired(true))
        .addStringOption((opt) => opt.setName('nota').setDescription('Notas de implementación').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('lista').setDescription('Listar sugerencias recientes')
    ),
  module: 'suggestions',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'crear': {
        const content = interaction.options.getString('contenido', true);
        const config = await getGuildConfig(guildId);

        const channelId = config.suggestionsChannelId || interaction.channelId;
        const channel = interaction.guild!.channels.cache.get(channelId) as TextChannel;

        if (!channel) {
          await interaction.reply({ content: 'Canal de sugerencias no configurado. Pide a un admin que lo configure con `/config`.', ephemeral: true });
          return;
        }

        // Crear la sugerencia en BD primero para obtener el ID
        const suggestion = await prisma.suggestion.create({
          data: {
            guildId,
            channelId,
            userId: interaction.user.id,
            content,
          },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('suggestions'))
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .setTitle('Nueva Sugerencia')
          .setDescription(content)
          .addFields(
            { name: 'Estado', value: '⏳ Pendiente', inline: true },
            { name: 'Votos', value: '👍 0 | 👎 0', inline: true },
          )
          .setFooter({ text: `ID: ${suggestion.id.slice(0, 8)}` })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`suggest_up_${suggestion.id}`)
            .setLabel('👍 A favor')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`suggest_down_${suggestion.id}`)
            .setLabel('👎 En contra')
            .setStyle(ButtonStyle.Danger),
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        await prisma.suggestion.update({
          where: { id: suggestion.id },
          data: { messageId: msg.id },
        });

        if (channelId !== interaction.channelId) {
          await interaction.reply({ content: `¡Tu sugerencia ha sido enviada en ${channel}!`, ephemeral: true });
        } else {
          await interaction.reply({ content: '¡Sugerencia enviada!', ephemeral: true });
        }
        break;
      }

      case 'aprobar':
      case 'rechazar':
      case 'implementar': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Necesitas el permiso **Gestionar Servidor**.', ephemeral: true });
          return;
        }

        const id = interaction.options.getString('id', true);
        const note = interaction.options.getString('nota');

        // Buscar sugerencia por coincidencia parcial de ID
        const suggestion = await prisma.suggestion.findFirst({
          where: {
            guildId,
            id: { startsWith: id },
          },
        });

        if (!suggestion) {
          await interaction.reply({ content: 'Sugerencia no encontrada.', ephemeral: true });
          return;
        }

        const statusMap: Record<string, string> = {
          aprobar: 'approved',
          rechazar: 'denied',
          implementar: 'implemented',
        };

        const statusEmojiMap: Record<string, string> = {
          approved: '✅ Aprobada',
          denied: '❌ Rechazada',
          implemented: '🚀 Implementada',
        };

        const colorMap: Record<string, number> = {
          approved: 0x57f287,
          denied: 0xed4245,
          implemented: 0x5865f2,
        };

        const newStatus = statusMap[sub];

        await prisma.suggestion.update({
          where: { id: suggestion.id },
          data: {
            status: newStatus,
            staffNote: note || undefined,
            reviewedBy: interaction.user.id,
          },
        });

        // Actualizar el mensaje original
        try {
          const channel = interaction.guild!.channels.cache.get(suggestion.channelId) as TextChannel;
          if (channel && suggestion.messageId) {
            const msg = await channel.messages.fetch(suggestion.messageId);
            const embed = EmbedBuilder.from(msg.embeds[0])
              .setColor(colorMap[newStatus])
              .setFields(
                { name: 'Estado', value: statusEmojiMap[newStatus], inline: true },
                { name: 'Votos', value: `👍 ${suggestion.upvotes.length} | 👎 ${suggestion.downvotes.length}`, inline: true },
                ...(note ? [{ name: 'Nota del Staff', value: note }] : []),
              );

            await msg.edit({ embeds: [embed] });
          }
        } catch { /* el mensaje puede no existir */ }

        const statusNames: Record<string, string> = {
          approved: 'aprobada',
          denied: 'rechazada',
          implemented: 'implementada',
        };

        await interaction.reply({
          content: `La sugerencia \`${suggestion.id.slice(0, 8)}\` ha sido **${statusNames[newStatus]}**.`,
          ephemeral: true,
        });
        break;
      }

      case 'lista': {
        const suggestions = await prisma.suggestion.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        if (suggestions.length === 0) {
          await interaction.reply({ content: 'Aún no hay sugerencias.', ephemeral: true });
          return;
        }

        const statusEmoji: Record<string, string> = {
          pending: '⏳',
          approved: '✅',
          denied: '❌',
          implemented: '🚀',
        };

        const lines = suggestions.map((s) => {
          const emoji = statusEmoji[s.status] || '❓';
          const votes = `👍${s.upvotes.length} 👎${s.downvotes.length}`;
          return `${emoji} \`${s.id.slice(0, 8)}\` ${s.content.slice(0, 60)}${s.content.length > 60 ? '...' : ''} (${votes})`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('suggestions'))
          .setTitle('Sugerencias Recientes')
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
};
