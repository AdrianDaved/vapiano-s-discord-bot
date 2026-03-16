import {
  Client,
  TextChannel,
  EmbedBuilder,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
} from 'discord.js';
import prisma from '../../../database/client';
import { getGuildConfig } from '../../utils';
import logger from '../../../shared/logger';

/**
 * Helper: get the star tier emoji based on count.
 */
function starTierEmoji(count: number): string {
  return count >= 10 ? '🌟' : count >= 5 ? '⭐' : '✨';
}

/**
 * Handle a reaction add for the starboard system.
 * Called from the messageReactionAdd event.
 */
export async function handleStarboardReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  client: Client
) {
  try {
    // Fetch partial reaction if needed
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }

    const message = reaction.message;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const config = await getGuildConfig(guildId);

    if (!config.starboardEnabled) return;
    if (!config.starboardChannelId) return;

    const starEmoji = config.starboardEmoji || '⭐';
    const threshold = config.starboardThreshold || 3;

    // Check if the reaction is the star emoji
    const reactionEmoji = reaction.emoji.name || reaction.emoji.toString();
    if (reactionEmoji !== starEmoji) return;

    // Don't let users star their own messages
    if (message.author?.id === user.id) return;

    // Don't star messages from the starboard channel itself
    if (message.channelId === config.starboardChannelId) return;

    const starCount = reaction.count || 0;

    // Check if we already have an entry
    const existing = await prisma.starboardEntry.findUnique({
      where: { guildId_originalMsgId: { guildId, originalMsgId: message.id } },
    });

    if (starCount >= threshold) {
      const starboardChannel = message.guild.channels.cache.get(
        config.starboardChannelId
      ) as TextChannel;
      if (!starboardChannel) return;

      const content = message.content || '';
      const attachment = message.attachments.first()?.url || null;
      const jumpUrl = `https://discord.com/channels/${guildId}/${message.channelId}/${message.id}`;

      const starText = starTierEmoji(starCount);

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setAuthor({
          name: message.author?.username || 'Desconocido',
          iconURL: message.author?.displayAvatarURL(),
        })
        .setDescription(content ? `${content}\n\n[Ir al mensaje](${jumpUrl})` : `[Ir al mensaje](${jumpUrl})`)
        .addFields(
          { name: 'Canal', value: `<#${message.channelId}>`, inline: true },
        )
        .setFooter({ text: `${starText} ${starCount}` })
        .setTimestamp(message.createdAt);

      if (attachment) {
        embed.setImage(attachment);
      }

      // If there are other image embeds from the original message, show the first one
      if (!attachment && message.embeds.length > 0) {
        const imgEmbed = message.embeds.find((e) => e.image || e.thumbnail);
        if (imgEmbed) {
          embed.setImage((imgEmbed.image?.url || imgEmbed.thumbnail?.url)!);
        }
      }

      if (existing && existing.starboardMsgId) {
        // Update existing starboard message
        try {
          const starMsg = await starboardChannel.messages.fetch(existing.starboardMsgId);
          await starMsg.edit({
            content: `${starText} **${starCount}** | <#${message.channelId}>`,
            embeds: [embed],
          });
        } catch {
          // Message was deleted, create a new one
          const newMsg = await starboardChannel.send({
            content: `${starText} **${starCount}** | <#${message.channelId}>`,
            embeds: [embed],
          });
          await prisma.starboardEntry.update({
            where: { id: existing.id },
            data: { starboardMsgId: newMsg.id, stars: starCount },
          });
        }

        await prisma.starboardEntry.update({
          where: { id: existing.id },
          data: { stars: starCount },
        });
      } else {
        // Create new starboard entry
        const starMsg = await starboardChannel.send({
          content: `${starText} **${starCount}** | <#${message.channelId}>`,
          embeds: [embed],
        });

        if (existing) {
          await prisma.starboardEntry.update({
            where: { id: existing.id },
            data: { starboardMsgId: starMsg.id, stars: starCount },
          });
        } else {
          await prisma.starboardEntry.create({
            data: {
              guildId,
              originalMsgId: message.id,
              originalChId: message.channelId,
              starboardMsgId: starMsg.id,
              authorId: message.author?.id || 'unknown',
              stars: starCount,
              content: content.slice(0, 2000) || null,
              attachmentUrl: attachment,
            },
          });
        }
      }
    } else if (existing) {
      // Update star count even if below threshold
      await prisma.starboardEntry.update({
        where: { id: existing.id },
        data: { stars: starCount },
      });
    }
  } catch (err) {
    logger.error(`[Starboard] Error handling reaction: ${err}`);
  }
}

/**
 * Handle a reaction remove for the starboard system.
 * Decrements star count and removes the starboard entry if below threshold.
 */
export async function handleStarboardReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  client: Client
) {
  try {
    // Fetch partial reaction if needed
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }

    const message = reaction.message;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const config = await getGuildConfig(guildId);

    if (!config.starboardEnabled) return;
    if (!config.starboardChannelId) return;

    const starEmoji = config.starboardEmoji || '⭐';
    const threshold = config.starboardThreshold || 3;

    // Check if the reaction is the star emoji
    const reactionEmoji = reaction.emoji.name || reaction.emoji.toString();
    if (reactionEmoji !== starEmoji) return;

    // Don't process from starboard channel
    if (message.channelId === config.starboardChannelId) return;

    const starCount = reaction.count || 0;

    // Check if we have an existing entry
    const existing = await prisma.starboardEntry.findUnique({
      where: { guildId_originalMsgId: { guildId, originalMsgId: message.id } },
    });

    if (!existing) return;

    const starboardChannel = message.guild.channels.cache.get(
      config.starboardChannelId
    ) as TextChannel;

    if (starCount < threshold) {
      // Below threshold — remove the starboard message
      if (existing.starboardMsgId && starboardChannel) {
        try {
          const starMsg = await starboardChannel.messages.fetch(existing.starboardMsgId);
          await starMsg.delete();
        } catch {
          // Message already deleted
        }
      }

      if (starCount === 0) {
        // No stars left — delete the DB entry entirely
        await prisma.starboardEntry.delete({ where: { id: existing.id } });
      } else {
        // Update count but clear the starboard message ref
        await prisma.starboardEntry.update({
          where: { id: existing.id },
          data: { stars: starCount, starboardMsgId: null },
        });
      }
    } else {
      // Still above threshold — just update the count and edit the message
      await prisma.starboardEntry.update({
        where: { id: existing.id },
        data: { stars: starCount },
      });

      if (existing.starboardMsgId && starboardChannel) {
        try {
          const starMsg = await starboardChannel.messages.fetch(existing.starboardMsgId);
          const starText = starTierEmoji(starCount);
          const jumpUrl = `https://discord.com/channels/${guildId}/${message.channelId}/${message.id}`;
          const content = message.content || '';

          const embed = new EmbedBuilder()
            .setColor(0xfee75c)
            .setAuthor({
              name: message.author?.username || 'Desconocido',
              iconURL: message.author?.displayAvatarURL(),
            })
            .setDescription(content ? `${content}\n\n[Ir al mensaje](${jumpUrl})` : `[Ir al mensaje](${jumpUrl})`)
            .addFields(
              { name: 'Canal', value: `<#${message.channelId}>`, inline: true },
            )
            .setFooter({ text: `${starText} ${starCount}` })
            .setTimestamp(message.createdAt);

          const attachment = message.attachments.first()?.url || null;
          if (attachment) {
            embed.setImage(attachment);
          } else if (message.embeds.length > 0) {
            const imgEmbed = message.embeds.find((e) => e.image || e.thumbnail);
            if (imgEmbed) {
              embed.setImage((imgEmbed.image?.url || imgEmbed.thumbnail?.url)!);
            }
          }

          await starMsg.edit({
            content: `${starText} **${starCount}** | <#${message.channelId}>`,
            embeds: [embed],
          });
        } catch {
          // Starboard message was deleted
        }
      }
    }
  } catch (err) {
    logger.error(`[Starboard] Error handling reaction remove: ${err}`);
  }
}
