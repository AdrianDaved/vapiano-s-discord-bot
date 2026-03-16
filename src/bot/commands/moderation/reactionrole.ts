import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('rolreaccion')
    .setDescription('Gestionar roles por botones de reacción')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('crear')
        .setDescription('Crear un panel de roles por reacción')
        .addStringOption((opt) => opt.setName('titulo').setDescription('Título del panel').setRequired(true))
        .addStringOption((opt) => opt.setName('descripcion').setDescription('Descripción del panel').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('agregar')
        .setDescription('Agregar un botón de rol a un panel')
        .addStringOption((opt) => opt.setName('id_mensaje').setDescription('ID del mensaje del panel').setRequired(true))
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a asignar').setRequired(true))
        .addStringOption((opt) => opt.setName('etiqueta').setDescription('Etiqueta del botón').setRequired(false))
        .addStringOption((opt) => opt.setName('emoji').setDescription('Emoji del botón').setRequired(false))
        .addStringOption((opt) =>
          opt
            .setName('tipo')
            .setDescription('Tipo de comportamiento')
            .addChoices(
              { name: 'Alternar (dar/quitar)', value: 'toggle' },
              { name: 'Solo dar', value: 'give' },
              { name: 'Solo quitar', value: 'remove' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('eliminar')
        .setDescription('Eliminar un botón de rol de un panel')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del rol de reacción').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('lista').setDescription('Listar todos los paneles de roles por reacción')
    )
    .addSubcommand((sub) =>
      sub
        .setName('emoji')
        .setDescription('Dar un rol cuando alguien reaccione con un emoji en cualquier mensaje')
        .addStringOption((opt) => opt.setName('id_mensaje').setDescription('ID del mensaje').setRequired(true))
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a asignar').setRequired(true))
        .addStringOption((opt) => opt.setName('emoji').setDescription('Emoji de reacción (ej. ✅)').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('tipo')
            .setDescription('Comportamiento')
            .addChoices(
              { name: 'Alternar (dar/quitar)', value: 'toggle' },
              { name: 'Solo dar', value: 'give' },
              { name: 'Solo quitar', value: 'remove' }
            )
        )
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageRoles],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'crear': {
        const title = interaction.options.getString('titulo', true);
        const description = interaction.options.getString('descripcion') || 'Haz clic en un botón para obtener un rol.';

        const embed = new EmbedBuilder()
          .setColor(moduleColor('moderation'))
          .setTitle(title)
          .setDescription(description)
          .setFooter({ text: 'Usa /rolreaccion agregar para añadir botones de rol a este mensaje' });

        const channel = interaction.channel;
        if (!channel || !('send' in channel)) {
          await interaction.reply({ content: 'No se pueden enviar mensajes en este canal.', ephemeral: true });
          return;
        }
        const msg = await channel.send({ embeds: [embed] });

        await interaction.reply({
          content: `Panel de roles por reacción creado. ID del mensaje: \`${msg.id}\`\nUsa \`/rolreaccion agregar id_mensaje:${msg.id} rol:@rol\` para añadir botones.`,
          ephemeral: true,
        });
        break;
      }

      case 'agregar': {
        const messageId = interaction.options.getString('id_mensaje', true);
        const role = interaction.options.getRole('rol', true);
        const label = interaction.options.getString('etiqueta') || role.name;
        const emoji = interaction.options.getString('emoji');
        const type = interaction.options.getString('tipo') || 'toggle';

        const channel = interaction.channel as TextChannel;
        let message;
        try {
          message = await channel.messages.fetch(messageId);
        } catch {
          await interaction.reply({ content: 'Mensaje no encontrado en este canal.', ephemeral: true });
          return;
        }

        // Asegurar que el mensaje es del bot
        if (message.author.id !== interaction.client.user!.id) {
          await interaction.reply({ content: 'Solo puedo añadir botones a mis propios mensajes.', ephemeral: true });
          return;
        }

        // Crear el registro de rol de reacción
        const rr = await prisma.reactionRole.create({
          data: {
            guildId,
            channelId: channel.id,
            messageId,
            emoji: emoji || '🔹',
            roleId: role.id,
            type,
          },
        });

        // Obtener todos los roles de reacción para este mensaje para reconstruir botones
        const allRoles = await prisma.reactionRole.findMany({
          where: { messageId, guildId },
        });

        // Construir filas de botones (máx. 5 botones por fila, máx. 5 filas)
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        let currentRow = new ActionRowBuilder<ButtonBuilder>();

        for (let i = 0; i < allRoles.length; i++) {
          if (i > 0 && i % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>();
          }

          const rrItem = allRoles[i];
          const rrRole = interaction.guild!.roles.cache.get(rrItem.roleId);
          const btn = new ButtonBuilder()
            .setCustomId(`rr_${rrItem.id}`)
            .setLabel(rrRole?.name || 'Rol')
            .setStyle(ButtonStyle.Secondary);

          if (rrItem.emoji) {
            try { btn.setEmoji(rrItem.emoji); } catch { /* emoji inválido */ }
          }

          currentRow.addComponents(btn);
        }
        rows.push(currentRow);

        // Actualizar el mensaje con los nuevos botones
        await message.edit({ components: rows.slice(0, 5) });

        await interaction.reply({
          content: `Se añadió el botón de **${role.name}** al panel. ID: \`${rr.id.slice(0, 8)}\``,
          ephemeral: true,
        });
        break;
      }

      case 'eliminar': {
        const id = interaction.options.getString('id', true);

        const rr = await prisma.reactionRole.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!rr) {
          await interaction.reply({ content: 'Rol de reacción no encontrado.', ephemeral: true });
          return;
        }

        await prisma.reactionRole.delete({ where: { id: rr.id } });

        // Reconstruir botones en el mensaje
        try {
          const channel = interaction.guild!.channels.cache.get(rr.channelId) as TextChannel;
          const message = await channel.messages.fetch(rr.messageId);
          const remaining = await prisma.reactionRole.findMany({
            where: { messageId: rr.messageId, guildId },
          });

          if (remaining.length === 0) {
            await message.edit({ components: [] });
          } else {
            const rows: ActionRowBuilder<ButtonBuilder>[] = [];
            let currentRow = new ActionRowBuilder<ButtonBuilder>();

            for (let i = 0; i < remaining.length; i++) {
              if (i > 0 && i % 5 === 0) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder<ButtonBuilder>();
              }

              const rrItem = remaining[i];
              const role = interaction.guild!.roles.cache.get(rrItem.roleId);
              const btn = new ButtonBuilder()
                .setCustomId(`rr_${rrItem.id}`)
                .setLabel(role?.name || 'Rol')
                .setStyle(ButtonStyle.Secondary);
              if (rrItem.emoji) {
                try { btn.setEmoji(rrItem.emoji); } catch { /* inválido */ }
              }
              currentRow.addComponents(btn);
            }
            rows.push(currentRow);
            await message.edit({ components: rows.slice(0, 5) });
          }
        } catch { /* el mensaje puede haber sido eliminado */ }

        await interaction.reply({ content: 'Rol de reacción eliminado.', ephemeral: true });
        break;
      }

      case 'emoji': {
        const messageId = interaction.options.getString('id_mensaje', true);
        const role = interaction.options.getRole('rol', true);
        const emoji = interaction.options.getString('emoji', true);
        const type = interaction.options.getString('tipo') || 'toggle';

        const channel = interaction.channel as TextChannel;

        // Verify message exists in this channel
        try {
          await channel.messages.fetch(messageId);
        } catch {
          await interaction.reply({ content: 'Mensaje no encontrado en este canal.', ephemeral: true });
          return;
        }

        await prisma.reactionRole.upsert({
          where: { messageId_emoji: { messageId, emoji } },
          update: { roleId: role.id, type, channelId: channel.id },
          create: { guildId, channelId: channel.id, messageId, emoji, roleId: role.id, type },
        });

        const typeNames: Record<string, string> = { toggle: 'alternar (dar/quitar)', give: 'solo dar', remove: 'solo quitar' };
        await interaction.reply({
          content: `Listo. Cuando alguien reaccione con ${emoji} en ese mensaje, se le ${typeNames[type]} el rol **${role.name}**.`,
          ephemeral: true,
        });
        break;
      }

      case 'lista': {
        const reactionRoles = await prisma.reactionRole.findMany({
          where: { guildId },
        });

        if (reactionRoles.length === 0) {
          await interaction.reply({ content: 'No hay roles de reacción configurados.', ephemeral: true });
          return;
        }

        // Agrupar por messageId
        const grouped = new Map<string, typeof reactionRoles>();
        for (const rr of reactionRoles) {
          if (!grouped.has(rr.messageId)) grouped.set(rr.messageId, []);
          grouped.get(rr.messageId)!.push(rr);
        }

        const lines: string[] = [];
        for (const [msgId, roles] of grouped) {
          lines.push(`**Mensaje:** \`${msgId}\` en <#${roles[0].channelId}>`);
          for (const rr of roles) {
            const typeNames: Record<string, string> = { toggle: 'alternar', give: 'dar', remove: 'quitar' };
            lines.push(`  ${rr.emoji} <@&${rr.roleId}> (${typeNames[rr.type] || rr.type}) — \`${rr.id.slice(0, 8)}\``);
          }
          lines.push('');
        }

        const embed = new EmbedBuilder()
          .setColor(moduleColor('moderation'))
          .setTitle('Roles de Reacción')
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
};
