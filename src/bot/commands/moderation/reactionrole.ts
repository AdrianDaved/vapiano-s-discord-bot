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
    .setName('reactionrole')
    .setDescription('Manage button-based reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a reaction role panel')
        .addStringOption((opt) => opt.setName('title').setDescription('Panel title').setRequired(true))
        .addStringOption((opt) => opt.setName('description').setDescription('Panel description').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a role button to a panel message')
        .addStringOption((opt) => opt.setName('message_id').setDescription('Message ID of the panel').setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to assign').setRequired(true))
        .addStringOption((opt) => opt.setName('label').setDescription('Button label').setRequired(false))
        .addStringOption((opt) => opt.setName('emoji').setDescription('Button emoji').setRequired(false))
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Behavior type')
            .addChoices(
              { name: 'Toggle (give/remove)', value: 'toggle' },
              { name: 'Give only', value: 'give' },
              { name: 'Remove only', value: 'remove' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a role button from a panel')
        .addStringOption((opt) => opt.setName('id').setDescription('Reaction role ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all reaction role panels')
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageRoles],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'create': {
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description') || 'Click a button below to get a role.';

        const embed = new EmbedBuilder()
          .setColor(moduleColor('moderation'))
          .setTitle(title)
          .setDescription(description)
          .setFooter({ text: 'Use /reactionrole add to attach role buttons to this message' });

        const channel = interaction.channel;
        if (!channel || !('send' in channel)) {
          await interaction.reply({ content: 'Cannot send messages in this channel.', ephemeral: true });
          return;
        }
        const msg = await channel.send({ embeds: [embed] });

        await interaction.reply({
          content: `Reaction role panel created. Message ID: \`${msg.id}\`\nUse \`/reactionrole add message_id:${msg.id} role:@role\` to add buttons.`,
          ephemeral: true,
        });
        break;
      }

      case 'add': {
        const messageId = interaction.options.getString('message_id', true);
        const role = interaction.options.getRole('role', true);
        const label = interaction.options.getString('label') || role.name;
        const emoji = interaction.options.getString('emoji');
        const type = interaction.options.getString('type') || 'toggle';

        const channel = interaction.channel as TextChannel;
        let message;
        try {
          message = await channel.messages.fetch(messageId);
        } catch {
          await interaction.reply({ content: 'Message not found in this channel.', ephemeral: true });
          return;
        }

        // Ensure the message is from the bot
        if (message.author.id !== interaction.client.user!.id) {
          await interaction.reply({ content: 'I can only add buttons to my own messages.', ephemeral: true });
          return;
        }

        // Create the reaction role record
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

        // Fetch all reaction roles for this message to rebuild buttons
        const allRoles = await prisma.reactionRole.findMany({
          where: { messageId, guildId },
        });

        // Build button rows (max 5 buttons per row, max 5 rows)
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
            .setLabel(rrRole?.name || 'Role')
            .setStyle(ButtonStyle.Secondary);

          if (rrItem.emoji) {
            try { btn.setEmoji(rrItem.emoji); } catch { /* invalid emoji */ }
          }

          currentRow.addComponents(btn);
        }
        rows.push(currentRow);

        // Update the message with new buttons
        await message.edit({ components: rows.slice(0, 5) });

        await interaction.reply({
          content: `Added **${role.name}** button to the panel. ID: \`${rr.id.slice(0, 8)}\``,
          ephemeral: true,
        });
        break;
      }

      case 'remove': {
        const id = interaction.options.getString('id', true);

        const rr = await prisma.reactionRole.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!rr) {
          await interaction.reply({ content: 'Reaction role not found.', ephemeral: true });
          return;
        }

        await prisma.reactionRole.delete({ where: { id: rr.id } });

        // Rebuild buttons on the message
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
                .setLabel(role?.name || 'Role')
                .setStyle(ButtonStyle.Secondary);
              if (rrItem.emoji) {
                try { btn.setEmoji(rrItem.emoji); } catch { /* invalid */ }
              }
              currentRow.addComponents(btn);
            }
            rows.push(currentRow);
            await message.edit({ components: rows.slice(0, 5) });
          }
        } catch { /* message may have been deleted */ }

        await interaction.reply({ content: 'Reaction role removed.', ephemeral: true });
        break;
      }

      case 'list': {
        const reactionRoles = await prisma.reactionRole.findMany({
          where: { guildId },
        });

        if (reactionRoles.length === 0) {
          await interaction.reply({ content: 'No reaction roles configured.', ephemeral: true });
          return;
        }

        // Group by messageId
        const grouped = new Map<string, typeof reactionRoles>();
        for (const rr of reactionRoles) {
          if (!grouped.has(rr.messageId)) grouped.set(rr.messageId, []);
          grouped.get(rr.messageId)!.push(rr);
        }

        const lines: string[] = [];
        for (const [msgId, roles] of grouped) {
          lines.push(`**Message:** \`${msgId}\` in <#${roles[0].channelId}>`);
          for (const rr of roles) {
            lines.push(`  ${rr.emoji} <@&${rr.roleId}> (${rr.type}) — \`${rr.id.slice(0, 8)}\``);
          }
          lines.push('');
        }

        const embed = new EmbedBuilder()
          .setColor(moduleColor('moderation'))
          .setTitle('Reaction Roles')
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
};
