import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getLeaderboard, getMember, getMemberRank, xpForLevel, levelFromXp } from '../../modules/levels/xpManager';

export default {
  data: new SlashCommandBuilder()
    .setName('nivel')
    .setDescription('Sistema de niveles y XP')
    .addSubcommand(sub =>
      sub.setName('rango').setDescription('Ver tu rango o el de otro usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('ranking').setDescription('Top 10 usuarios con más XP del servidor')
    )
    .addSubcommand(sub =>
      sub.setName('dar-xp').setDescription('[Admin] Dar XP a un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('XP a dar').setRequired(true).setMinValue(1).setMaxValue(100000))
    )
    .addSubcommand(sub =>
      sub.setName('resetear').setDescription('[Admin] Resetear los niveles de un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    ),
  module: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (sub === 'rango') {
      const target = interaction.options.getUser('usuario') ?? interaction.user;
      const data = await getMember(target.id, guildId);
      const rank = await getMemberRank(target.id, guildId);
      const xp = data?.xp ?? 0;
      const level = data?.level ?? 0;
      const xpNeeded = xpForLevel(level);
      const xpInLevel = xp - (data ? computeTotalXp(level) : 0);
      const progress = Math.min(Math.floor((xpInLevel / xpNeeded) * 20), 20);
      const bar = '▓'.repeat(progress) + '░'.repeat(20 - progress);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
        .setTitle(`🏆 Nivel ${level}`)
        .addFields(
          { name: '📊 XP',       value: `${xpInLevel} / ${xpNeeded} XP`, inline: true },
          { name: '📈 XP Total', value: `${xp.toLocaleString()}`,          inline: true },
          { name: '🥇 Rango',    value: `#${rank}`,                        inline: true },
          { name: '💬 Mensajes', value: `${data?.messages ?? 0}`,          inline: true },
          { name: 'Progreso',    value: `\`${bar}\``,                      inline: false },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'ranking') {
      const top = await getLeaderboard(guildId, 10);
      if (!top.length) {
        await interaction.reply({ content: 'Nadie tiene XP aún en este servidor.', flags: 64 });
        return;
      }

      const lines = await Promise.all(top.map(async (entry, i) => {
        let username = `ID: ${entry.userId}`;
        try {
          const user = await interaction.client.users.fetch(entry.userId);
          username = user.username;
        } catch {}
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} **${username}** — Nivel ${entry.level} (${entry.xp.toLocaleString()} XP)`;
      }));

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`🏆 Ranking de niveles — ${interaction.guild!.name}`)
        .setDescription(lines.join('\n'))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'dar-xp') {
      if (!interaction.memberPermissions?.has('ManageGuild')) {
        await interaction.reply({ content: 'Necesitas el permiso **Gestionar servidor**.', flags: 64 });
        return;
      }
      const target = interaction.options.getUser('usuario', true);
      const amount = interaction.options.getInteger('cantidad', true);
      const prisma = (await import("../../../database/client")).default;
      await (prisma as any).memberLevel.upsert({
        where: { userId_guildId: { userId: target.id, guildId } },
        create: { userId: target.id, guildId, xp: amount, level: 0, messages: 0 },
        update: { xp: { increment: amount } },
      });
      await interaction.reply({ content: `✅ Se dieron **${amount} XP** a ${target}.`, flags: 64 });

    } else if (sub === 'resetear') {
      if (!interaction.memberPermissions?.has('ManageGuild')) {
        await interaction.reply({ content: 'Necesitas el permiso **Gestionar servidor**.', flags: 64 });
        return;
      }
      const target = interaction.options.getUser('usuario', true);
      await (await import('../../../database/client')).default.memberLevel.deleteMany({
        where: { userId: target.id, guildId },
      });
      await interaction.reply({ content: `✅ XP de ${target} reseteado.`, flags: 64 });
    }
  },
};

function computeTotalXp(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += 5 * i * i + 50 * i + 100;
  return total;
}
