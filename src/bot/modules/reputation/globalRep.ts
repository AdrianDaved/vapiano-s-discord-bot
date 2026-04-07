/**
 * globalRep.ts — Helpers para el sistema de reputación sincronizada.
 * Las reps de Vapiano y HubStore cuentan como una sola.
 */
import prisma from '../../../database/client';

// Ambos servidores vinculados
export const LINKED_GUILD_IDS = [
  '1420045220325625898', // Vapiano
  '1107335281620820079', // HubStore
];

/** Total de rep global de un usuario (suma de ambos servidores) */
export async function getGlobalRep(userId: string): Promise<number> {
  return prisma.reputation.count({
    where: { userId, guildId: { in: LINKED_GUILD_IDS } },
  });
}

/** Rep dada globalmente por un usuario */
export async function getGlobalGiven(giverId: string): Promise<number> {
  return prisma.reputation.count({
    where: { giverId, guildId: { in: LINKED_GUILD_IDS } },
  });
}

/** Ranking global — agrupa por userId sumando ambos servidores */
export async function getGlobalRanking(take = 15): Promise<{ userId: string; total: number }[]> {
  const rows = await prisma.reputation.groupBy({
    by: ['userId'],
    where: { guildId: { in: LINKED_GUILD_IDS } },
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take,
  });
  return rows.map(r => ({ userId: r.userId, total: r._count.userId }));
}

/** Posición global de un usuario en el ranking */
export async function getGlobalRank(userId: string): Promise<number> {
  const all = await prisma.reputation.groupBy({
    by: ['userId'],
    where: { guildId: { in: LINKED_GUILD_IDS } },
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
  });
  const idx = all.findIndex(u => u.userId === userId);
  return idx === -1 ? 0 : idx + 1;
}

/** Historial global de un usuario (recibida + dada, ambos servidores) */
export async function getGlobalHistory(userId: string, take = 10) {
  return prisma.reputation.findMany({
    where: {
      guildId: { in: LINKED_GUILD_IDS },
      OR: [{ userId }, { giverId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
