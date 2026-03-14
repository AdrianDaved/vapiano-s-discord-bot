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
import { moduleColor, parseDuration, formatDuration } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway system commands')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption((opt) => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
        .addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 1h, 1d, 7d)').setRequired(true))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Number of winners (default: 1)').setRequired(false).setMinValue(1).setMaxValue(20))
        .addStringOption((opt) => opt.setName('description').setDescription('Additional description').setRequired(false))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post in (default: current)').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((opt) => opt.setName('id').setDescription('Giveaway message ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for an ended giveaway')
        .addStringOption((opt) => opt.setName('id').setDescription('Giveaway message ID').setRequired(true))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Number of new winners').setRequired(false).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List active giveaways')
    ),
  module: 'giveaway',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'start': {
        const prize = interaction.options.getString('prize', true);
        const durationStr = interaction.options.getString('duration', true);
        const winnersCount = interaction.options.getInteger('winners') || 1;
        const description = interaction.options.getString('description');
        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

        const durationSec = parseDuration(durationStr);
        if (!durationSec) {
          await interaction.reply({ content: 'Invalid duration. Use format like `1h`, `1d`, `7d`.', ephemeral: true });
          return;
        }

        const endsAt = new Date(Date.now() + durationSec * 1000);

        const embed = new EmbedBuilder()
          .setColor(moduleColor('giveaway'))
          .setTitle('🎉 GIVEAWAY 🎉')
          .setDescription(
            `**${prize}**\n\n` +
            (description ? `${description}\n\n` : '') +
            `React with the button below to enter!\n\n` +
            `**Winners:** ${winnersCount}\n` +
            `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R> (<t:${Math.floor(endsAt.getTime() / 1000)}:F>)\n` +
            `**Hosted by:** ${interaction.user}`
          )
          .setFooter({ text: `${winnersCount} winner(s)` })
          .setTimestamp(endsAt);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Enter Giveaway')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('giveaway_count')
            .setLabel('0 entries')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        await prisma.giveaway.create({
          data: {
            guildId,
            channelId: channel.id,
            messageId: msg.id,
            hostId: interaction.user.id,
            prize,
            description,
            winners: winnersCount,
            endsAt,
          },
        });

        if (channel.id !== interaction.channelId) {
          await interaction.reply({ content: `Giveaway started in ${channel}!`, ephemeral: true });
        } else {
          await interaction.reply({ content: 'Giveaway started!', ephemeral: true });
        }
        break;
      }

      case 'end': {
        const messageId = interaction.options.getString('id', true);

        const giveaway = await prisma.giveaway.findFirst({
          where: { guildId, messageId, ended: false },
        });

        if (!giveaway) {
          await interaction.reply({ content: 'Giveaway not found or already ended.', ephemeral: true });
          return;
        }

        // Pick winners
        const winners = pickWinners(giveaway.entries, giveaway.winners);

        await prisma.giveaway.update({
          where: { id: giveaway.id },
          data: { ended: true, winnerIds: winners },
        });

        // Update the giveaway message
        try {
          const channel = await interaction.guild!.channels.fetch(giveaway.channelId) as TextChannel;
          const msg = await channel.messages.fetch(giveaway.messageId!);

          const winnersText = winners.length > 0
            ? winners.map((w) => `<@${w}>`).join(', ')
            : 'No valid entries.';

          const embed = EmbedBuilder.from(msg.embeds[0])
            .setTitle('🎉 GIVEAWAY ENDED 🎉')
            .setDescription(
              `**${giveaway.prize}**\n\n` +
              `**Winner(s):** ${winnersText}\n` +
              `**Hosted by:** <@${giveaway.hostId}>`
            )
            .setColor(0x99aab5);

          await msg.edit({ embeds: [embed], components: [] });

          if (winners.length > 0) {
            await channel.send(`🎉 Congratulations ${winnersText}! You won **${giveaway.prize}**!`);
          }
        } catch { /* message may have been deleted */ }

        await interaction.reply({ content: 'Giveaway ended!', ephemeral: true });
        break;
      }

      case 'reroll': {
        const messageId = interaction.options.getString('id', true);
        const newWinnerCount = interaction.options.getInteger('winners') || 1;

        const giveaway = await prisma.giveaway.findFirst({
          where: { guildId, messageId, ended: true },
        });

        if (!giveaway) {
          await interaction.reply({ content: 'Ended giveaway not found.', ephemeral: true });
          return;
        }

        const winners = pickWinners(giveaway.entries, newWinnerCount);

        await prisma.giveaway.update({
          where: { id: giveaway.id },
          data: { winnerIds: winners },
        });

        if (winners.length === 0) {
          await interaction.reply({ content: 'No valid entries to reroll.', ephemeral: true });
          return;
        }

        const winnersText = winners.map((w) => `<@${w}>`).join(', ');

        try {
          const channel = await interaction.guild!.channels.fetch(giveaway.channelId) as TextChannel;
          await channel.send(`🎉 New winner(s) for **${giveaway.prize}**: ${winnersText}! Congratulations!`);
        } catch { /* ignore */ }

        await interaction.reply({ content: `Rerolled! New winner(s): ${winnersText}`, ephemeral: true });
        break;
      }

      case 'list': {
        const active = await prisma.giveaway.findMany({
          where: { guildId, ended: false },
          orderBy: { endsAt: 'asc' },
        });

        if (active.length === 0) {
          await interaction.reply({ content: 'No active giveaways.', ephemeral: true });
          return;
        }

        const lines = active.map((g) => {
          const endsTimestamp = Math.floor(g.endsAt.getTime() / 1000);
          return `**${g.prize}** — ${g.entries.length} entries — Ends <t:${endsTimestamp}:R> — [Jump](https://discord.com/channels/${guildId}/${g.channelId}/${g.messageId})`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('giveaway'))
          .setTitle('Active Giveaways')
          .setDescription(lines.join('\n\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
};

/** Pick random winners from an array of user IDs */
function pickWinners(entries: string[], count: number): string[] {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
