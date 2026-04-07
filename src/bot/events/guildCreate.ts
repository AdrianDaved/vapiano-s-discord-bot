import { Events, Guild, REST, Routes } from "discord.js";
import { BotClient, InviteData } from "../../shared/types";
import { inviteCache } from "./ready";
import { getGuildConfig } from "../utils";
import prisma from "../../database/client";
import logger from "../../shared/logger";

export default {
  name: Events.GuildCreate,
  async execute(guild: Guild, client: BotClient) {
    logger.info(`Joined new guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);

    // Create default config (safe upsert)
    try {
      await prisma.guildConfig.upsert({
        where: { id: guild.id },
        create: { id: guild.id },
        update: {},
      });
    } catch (err: any) {
      if (err?.code !== "P2002") logger.error(`Failed to create guild config: ${err}`);
    }

    // Deploy slash commands to new guild immediately
    try {
      const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN!);
      const commands = client.commands.map((cmd) => cmd.data.toJSON());
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, guild.id),
        { body: commands },
      );
      logger.info(`Deployed ${commands.length} commands to new guild ${guild.name}`);
    } catch (err) {
      logger.error(`Failed to deploy commands to new guild ${guild.name}: ${err}`);
    }

    // Cache invites
    try {
      const invites = await guild.invites.fetch();
      const guildInvites = new Map<string, InviteData>();
      invites.forEach((inv) => {
        guildInvites.set(inv.code, {
          code: inv.code,
          uses: inv.uses ?? 0,
          inviterId: inv.inviter?.id ?? null,
        });
      });
      inviteCache.set(guild.id, guildInvites);
    } catch {
      logger.warn(`Could not fetch invites for new guild ${guild.name}`);
    }
  },
};
