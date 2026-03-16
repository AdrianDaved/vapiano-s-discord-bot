import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';
import { getGuildConfig } from '../../utils';

/**
 * Periodically check for expired temp mutes/bans and reverse them.
 */
export function initTempActions(client: Client): void {
  // Check every 30 seconds
  setInterval(async () => {
    try {
      const expired = await prisma.modAction.findMany({
        where: {
          active: true,
          expiresAt: { not: null, lte: new Date() },
          action: { in: ['tempmute', 'tempban'] },
        },
      });

      for (const action of expired) {
        const guild = client.guilds.cache.get(action.guildId);
        if (!guild) continue;

        const config = await getGuildConfig(guild.id);

        try {
          if (action.action === 'tempmute') {
            const member = await guild.members.fetch(action.userId).catch(() => null);
            if (member) {
              // Remove timeout
              await member.timeout(null, 'Temp mute expired');
              // Also remove mute role if configured
              if (config.muteRoleId) {
                await member.roles.remove(config.muteRoleId).catch(() => {});
              }
              logger.info(`[TempActions] Unmuted ${member.user.username} in ${guild.name}`);
            }
          } else if (action.action === 'tempban') {
            await guild.bans.remove(action.userId, 'Temp ban expired').catch(() => {});
            logger.info(`[TempActions] Unbanned ${action.userId} in ${guild.name}`);
          }

          // Mark as inactive
          await prisma.modAction.update({
            where: { id: action.id },
            data: { active: false },
          });

          // Log the expiry
          if (config.modLogChannelId) {
            const logChannel = guild.channels.cache.get(config.modLogChannelId) as TextChannel;
            if (logChannel) {
              const embed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle(action.action === 'tempmute' ? 'Mute expirado' : 'Ban expirado')
                .addFields(
                  { name: 'Usuario', value: `<@${action.userId}>`, inline: true },
                  { name: 'Motivo original', value: action.reason, inline: true }
                )
                .setTimestamp();
              await logChannel.send({ embeds: [embed] });
            }
          }
        } catch (err) {
          logger.error(`[TempActions] Error processing expired action ${action.id}: ${err}`);
        }
      }
    } catch (err) {
      logger.error(`[TempActions] Error checking expired actions: ${err}`);
    }
  }, 30_000);

  logger.info('[TempActions] Temp action expiry checker started');
}
