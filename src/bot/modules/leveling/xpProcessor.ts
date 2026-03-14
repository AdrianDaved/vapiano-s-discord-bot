import { Message, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../../shared/types';
import { xpForLevel, levelFromXp, replaceTemplateVars } from '../../utils';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

/**
 * Process XP gain for a message. Respects cooldown to prevent spam-farming.
 */
export async function processXp(message: Message, config: any, client: BotClient): Promise<void> {
  const { guild, author } = message;
  if (!guild) return;

  try {
    // Find or create user level record
    let userLevel = await prisma.userLevel.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: author.id } },
    });

    if (!userLevel) {
      userLevel = await prisma.userLevel.create({
        data: { guildId: guild.id, userId: author.id },
      });
    }

    // Check cooldown
    const now = new Date();
    const cooldownMs = (config.xpCooldown || 60) * 1000;
    if (now.getTime() - userLevel.lastXpAt.getTime() < cooldownMs) {
      // Still on cooldown, only increment message count
      await prisma.userLevel.update({
        where: { id: userLevel.id },
        data: { messages: { increment: 1 } },
      });
      return;
    }

    // Calculate XP to award (with some randomness)
    const baseXp = config.xpPerMessage || 15;
    const multiplier = config.xpMultiplier || 1.0;
    const xpGain = Math.floor((Math.random() * baseXp + baseXp * 0.5) * multiplier);

    const oldLevel = levelFromXp(userLevel.xp);
    const newXp = userLevel.xp + xpGain;
    const newLevel = levelFromXp(newXp);

    // Update database
    await prisma.userLevel.update({
      where: { id: userLevel.id },
      data: {
        xp: newXp,
        level: newLevel,
        messages: { increment: 1 },
        lastXpAt: now,
      },
    });

    // Check for level up
    if (newLevel > oldLevel) {
      await handleLevelUp(message, config, client, newLevel);
    }
  } catch (err) {
    logger.error(`[Leveling] Error processing XP for ${author.username}: ${err}`);
  }
}

/**
 * Handle level up: send message and assign role rewards.
 */
async function handleLevelUp(
  message: Message,
  config: any,
  client: BotClient,
  newLevel: number
): Promise<void> {
  const { guild, author, member } = message;
  if (!guild || !member) return;

  // Send level-up message
  const levelUpMsg = replaceTemplateVars(config.levelUpMessage || 'Congratulations {user}! You reached level {level}!', {
    user: `<@${author.id}>`,
    username: author.username,
    level: newLevel.toString(),
    server: guild.name,
  });

  try {
    const channelId = config.levelUpChannelId || message.channelId;
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription(levelUpMsg)
        .setThumbnail(author.displayAvatarURL({ size: 64 }));
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.error(`[Leveling] Error sending level-up message: ${err}`);
  }

  // Check for level rewards
  try {
    const rewards = await prisma.levelReward.findMany({
      where: { guildId: guild.id },
      orderBy: { level: 'asc' },
    });

    // Find the highest reward level the user qualifies for
    const qualifiedRewards = rewards.filter((r) => r.level <= newLevel);
    const nonQualifiedRewards = rewards.filter((r) => r.level > newLevel);

    // Add roles for the current and lower levels
    for (const reward of qualifiedRewards) {
      const role = guild.roles.cache.get(reward.roleId);
      if (role && !member.roles.cache.has(role.id)) {
        if (guild.members.me && role.position < guild.members.me.roles.highest.position) {
          await member.roles.add(role).catch(() => {});
        }
      }
    }

    // Remove roles from higher tiers the user shouldn't have
    // (in case of level reset or XP reduction)
    for (const reward of nonQualifiedRewards) {
      if (member.roles.cache.has(reward.roleId)) {
        const role = guild.roles.cache.get(reward.roleId);
        if (role && guild.members.me && role.position < guild.members.me.roles.highest.position) {
          await member.roles.remove(role).catch(() => {});
        }
      }
    }

    // Optional: Remove lower-tier roles to keep only the highest
    // This is a common "stacking" vs "replace" pattern.
    // We keep all earned roles by default (stacking).
    // To replace instead, uncomment this:
    // if (qualifiedRewards.length > 1) {
    //   const highestReward = qualifiedRewards[qualifiedRewards.length - 1];
    //   for (const reward of qualifiedRewards.slice(0, -1)) {
    //     if (member.roles.cache.has(reward.roleId)) {
    //       await member.roles.remove(reward.roleId).catch(() => {});
    //     }
    //   }
    // }
  } catch (err) {
    logger.error(`[Leveling] Error assigning level rewards: ${err}`);
  }
}
