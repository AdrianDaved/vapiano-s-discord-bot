import { Router, Response } from "express";
import { requireAuth, requireGuildAccess, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/validate";
import prisma from "../../database/client";

export const levelsRouter = Router({ mergeParams: true });

levelsRouter.use(requireAuth as any);
levelsRouter.use(requireGuildAccess as any);

// GET /api/guilds/:guildId/levels/leaderboard
levelsRouter.get("/leaderboard", asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const members = await prisma.memberLevel.findMany({
    where: { guildId },
    orderBy: { xp: "desc" },
    take: limit,
  });

  res.json(members);
}));

// GET /api/guilds/:guildId/levels/member/:userId
levelsRouter.get("/member/:userId", asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const userId = req.params.userId as string;

  const member = await prisma.memberLevel.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });

  res.json(member ?? { userId, guildId, xp: 0, level: 0, messages: 0 });
}));

// DELETE /api/guilds/:guildId/levels/member/:userId
levelsRouter.delete("/member/:userId", asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const userId = req.params.userId as string;

  await prisma.memberLevel.deleteMany({ where: { userId, guildId } });
  res.json({ success: true });
}));

// DELETE /api/guilds/:guildId/levels/reset-all
levelsRouter.delete("/reset-all", asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  await prisma.memberLevel.deleteMany({ where: { guildId } });
  res.json({ success: true });
}));

export default levelsRouter;
