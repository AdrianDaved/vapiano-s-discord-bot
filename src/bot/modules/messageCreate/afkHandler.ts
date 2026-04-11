import { MessageHandler } from './pipeline';
import prisma from '../../../database/client';

/**
 * AFK system:
 *  - if the sender is AFK, clear their status and acknowledge briefly
 *  - if any mentioned user is AFK, reply listing their statuses
 */
export const afkHandler: MessageHandler = {
  name: 'afk',
  async handle({ message }) {
    const guildId = message.guild!.id;

    // Sender returns from AFK
    const afkStatus = await prisma.afkStatus.findUnique({
      where: { guildId_userId: { guildId, userId: message.author.id } },
    });
    if (afkStatus) {
      await prisma.afkStatus.delete({ where: { id: afkStatus.id } });

      const elapsed = Date.now() - afkStatus.createdAt.getTime();
      const minutes = Math.floor(elapsed / 60000);
      const hours = Math.floor(minutes / 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

      const reply = await message.reply({
        content: `¡Bienvenido de vuelta! Estuviste AFK por **${timeStr}**.`,
      });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    }

    // Mentions of AFK users
    if (message.mentions.users.size > 0) {
      const afkUsers = await prisma.afkStatus.findMany({
        where: {
          guildId,
          userId: { in: message.mentions.users.map((u) => u.id) },
        },
      });

      if (afkUsers.length > 0) {
        const lines = afkUsers.map((afk) => {
          const ts = Math.floor(afk.createdAt.getTime() / 1000);
          return `<@${afk.userId}> está AFK: **${afk.reason}** (desde <t:${ts}:R>)`;
        });
        await message.reply({ content: lines.join('\n') });
      }
    }
  },
};
