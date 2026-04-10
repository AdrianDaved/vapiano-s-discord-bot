import prisma from '../../../database/client';

// XP required to reach a given level: 5n² + 50n + 100
export function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }
  return level;
}

// In-memory cooldown: userId:guildId -> timestamp
const cooldowns = new Map<string, number>();

export async function addXp(
  userId: string,
  guildId: string,
  amount: number,
  cooldownSeconds: number,
): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number } | null> {
  const key = `${userId}:${guildId}`;
  const now = Date.now();
  const lastTime = cooldowns.get(key) ?? 0;

  if (now - lastTime < cooldownSeconds * 1000) return null;
  cooldowns.set(key, now);

  const member = await prisma.memberLevel.upsert({
    where: { userId_guildId: { userId, guildId } },
    create: { userId, guildId, xp: amount, level: 0, messages: 1 },
    update: { xp: { increment: amount }, messages: { increment: 1 } },
  });

  const oldLevel = member.level;
  const newLevel = levelFromXp(member.xp + amount);

  if (newLevel > oldLevel) {
    await prisma.memberLevel.update({
      where: { userId_guildId: { userId, guildId } },
      data: { level: newLevel },
    });
    return { leveledUp: true, oldLevel, newLevel };
  }

  return { leveledUp: false, oldLevel, newLevel };
}

export async function getLeaderboard(guildId: string, limit = 10) {
  return prisma.memberLevel.findMany({
    where: { guildId },
    orderBy: { xp: 'desc' },
    take: limit,
  });
}

export async function getMember(userId: string, guildId: string) {
  return prisma.memberLevel.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });
}

export async function getMemberRank(userId: string, guildId: string): Promise<number> {
  const count = await prisma.memberLevel.count({
    where: { guildId, xp: { gt: (await getMember(userId, guildId))?.xp ?? 0 } },
  });
  return count + 1;
}
