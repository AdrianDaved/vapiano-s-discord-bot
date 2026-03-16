import { Guild, ChannelType, TextChannel, Role, GuildChannel } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

/**
 * Serialize a guild's configuration into a JSON-storable backup object.
 * Captures: roles, channels, categories, basic permissions, guild settings.
 */
export async function createBackupData(guild: Guild): Promise<Record<string, any>> {
  const data: Record<string, any> = {
    name: guild.name,
    icon: guild.iconURL({ size: 1024 }),
    verificationLevel: guild.verificationLevel,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    explicitContentFilter: guild.explicitContentFilter,
    afkChannelId: guild.afkChannelId,
    afkTimeout: guild.afkTimeout,
    systemChannelId: guild.systemChannelId,
    roles: [] as any[],
    categories: [] as any[],
    textChannels: [] as any[],
    voiceChannels: [] as any[],
  };

  // Backup roles (excluding @everyone and managed/bot roles)
  const roles = guild.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map((role) => ({
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      permissions: role.permissions.bitfield.toString(),
      mentionable: role.mentionable,
      position: role.position,
    }));
  data.roles = roles;

  // Backup categories
  const categories = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position)
    .map((cat) => ({
      name: cat.name,
      position: cat.position,
      permissionOverwrites: serializePermissionOverwrites(cat as GuildChannel, guild),
    }));
  data.categories = categories;

  // Backup text channels
  const textChannels = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
    .sort((a, b) => a.position - b.position)
    .map((ch) => {
      const tc = ch as TextChannel;
      const parent = tc.parent;
      return {
        name: tc.name,
        topic: tc.topic,
        nsfw: tc.nsfw,
        rateLimitPerUser: tc.rateLimitPerUser,
        position: tc.position,
        parentName: parent?.name || null,
        type: ch.type,
        permissionOverwrites: serializePermissionOverwrites(tc, guild),
      };
    });
  data.textChannels = textChannels;

  // Backup voice channels
  const voiceChannels = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice)
    .sort((a, b) => a.position - b.position)
    .map((ch) => {
      const parent = (ch as GuildChannel).parent;
      return {
        name: ch.name,
        bitrate: (ch as any).bitrate,
        userLimit: (ch as any).userLimit,
        position: ch.position,
        parentName: parent?.name || null,
        type: ch.type,
        permissionOverwrites: serializePermissionOverwrites(ch as GuildChannel, guild),
      };
    });
  data.voiceChannels = voiceChannels;

  return data;
}

/**
 * Restore a backup to a guild. Creates roles and channels from the backup data.
 * WARNING: This is a destructive operation - it clears existing channels/roles first.
 */
export async function restoreBackupData(
  guild: Guild,
  data: Record<string, any>,
  options: { clearExisting: boolean } = { clearExisting: false }
): Promise<{ success: boolean; details: string[] }> {
  const details: string[] = [];

  try {
    // Optionally clear existing channels and roles
    if (options.clearExisting) {
      // Delete all channels except the default ones
      for (const [, channel] of guild.channels.cache) {
        try {
          await channel.delete('Backup restore: clearing channels');
        } catch {
          details.push(`No se pudo eliminar el canal: ${channel.name}`);
        }
      }

      // Delete non-managed, non-everyone roles
      for (const [, role] of guild.roles.cache) {
        if (role.id !== guild.id && !role.managed) {
          try {
            await role.delete('Backup restore: clearing roles');
          } catch {
            details.push(`No se pudo eliminar el rol: ${role.name}`);
          }
        }
      }
      details.push('Se limpiaron los canales y roles existentes');
    }

    // Restore roles (from bottom to top)
    const roleMap = new Map<string, Role>();
    const sortedRoles = [...(data.roles || [])].reverse();

    for (const roleData of sortedRoles) {
      try {
        const role = await guild.roles.create({
          name: roleData.name,
          color: roleData.color === '#000000' ? undefined : roleData.color,
          hoist: roleData.hoist,
          permissions: BigInt(roleData.permissions),
          mentionable: roleData.mentionable,
          reason: 'Backup restore',
        });
        roleMap.set(roleData.name, role);
        details.push(`Rol creado: ${roleData.name}`);
      } catch (err) {
        details.push(`Error al crear el rol ${roleData.name}: ${err}`);
      }
    }

    // Restore categories
    const categoryMap = new Map<string, GuildChannel>();
    for (const catData of data.categories || []) {
      try {
        const cat = await guild.channels.create({
          name: catData.name,
          type: ChannelType.GuildCategory,
          reason: 'Backup restore',
        });
        categoryMap.set(catData.name, cat as GuildChannel);
        details.push(`Categoria creada: ${catData.name}`);
      } catch (err) {
        details.push(`Error al crear la categoria ${catData.name}: ${err}`);
      }
    }

    // Restore text channels
    for (const chData of data.textChannels || []) {
      try {
        const parent = chData.parentName ? categoryMap.get(chData.parentName) : undefined;
        await guild.channels.create({
          name: chData.name,
          type: chData.type || ChannelType.GuildText,
          topic: chData.topic || undefined,
          nsfw: chData.nsfw || false,
          rateLimitPerUser: chData.rateLimitPerUser || 0,
          parent: parent?.id,
          reason: 'Backup restore',
        });
        details.push(`Canal de texto creado: #${chData.name}`);
      } catch (err) {
        details.push(`Error al crear el canal #${chData.name}: ${err}`);
      }
    }

    // Restore voice channels
    for (const chData of data.voiceChannels || []) {
      try {
        const parent = chData.parentName ? categoryMap.get(chData.parentName) : undefined;
        await guild.channels.create({
          name: chData.name,
          type: chData.type || ChannelType.GuildVoice,
          bitrate: chData.bitrate || 64000,
          userLimit: chData.userLimit || 0,
          parent: parent?.id,
          reason: 'Backup restore',
        });
        details.push(`Canal de voz creado: ${chData.name}`);
      } catch (err) {
        details.push(`Error al crear el canal de voz ${chData.name}: ${err}`);
      }
    }

    return { success: true, details };
  } catch (err) {
    logger.error(`[Backup] Error restoring backup: ${err}`);
    return { success: false, details: [...details, `Error fatal: ${err}`] };
  }
}

/**
 * Serialize permission overwrites for a channel (role-based only, not user-specific).
 */
function serializePermissionOverwrites(channel: GuildChannel, guild: Guild): any[] {
  return channel.permissionOverwrites.cache
    .filter((po) => po.id !== guild.id) // skip @everyone overrides for simplicity
    .map((po) => {
      const role = guild.roles.cache.get(po.id);
      return {
        type: po.type,
        roleName: role?.name || null,
        allow: po.allow.bitfield.toString(),
        deny: po.deny.bitfield.toString(),
      };
    });
}
