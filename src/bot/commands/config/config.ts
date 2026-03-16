import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { updateGuildConfig, getGuildConfig, moduleColor } from '../../utils';
import { MODULE_TOGGLE_MAP, ModuleName } from '../../../shared/types';

export default {
  data: new SlashCommandBuilder()
    .setName('configuracion')
    .setDescription('Comandos de configuracion del bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName('modulo')
        .setDescription('Activar o desactivar modulos')
        .addSubcommand((sub) =>
          sub
            .setName('activar')
            .setDescription('Activar un modulo')
            .addStringOption((opt) =>
              opt
                .setName('name')
                .setDescription('Modulo a activar')
                .setRequired(true)
                .addChoices(
                  { name: 'Invites', value: 'invites' },
                  { name: 'Leveling', value: 'leveling' },
                  { name: 'Moderation', value: 'moderation' },
                  { name: 'AutoMod', value: 'automod' },
                  { name: 'Tickets', value: 'tickets' },
                  { name: 'Automation', value: 'automation' },
                  { name: 'Welcome', value: 'welcome' },
                  { name: 'Farewell', value: 'farewell' },
                  { name: 'Reputation', value: 'reputation' },
                  { name: 'Giveaway', value: 'giveaway' },
                  { name: 'Suggestions', value: 'suggestions' },
                  { name: 'Starboard', value: 'starboard' }
                )
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('desactivar')
            .setDescription('Desactivar un modulo')
            .addStringOption((opt) =>
              opt
                .setName('name')
                .setDescription('Modulo a desactivar')
                .setRequired(true)
                .addChoices(
                  { name: 'Invites', value: 'invites' },
                  { name: 'Leveling', value: 'leveling' },
                  { name: 'Moderation', value: 'moderation' },
                  { name: 'AutoMod', value: 'automod' },
                  { name: 'Tickets', value: 'tickets' },
                  { name: 'Automation', value: 'automation' },
                  { name: 'Welcome', value: 'welcome' },
                  { name: 'Farewell', value: 'farewell' },
                  { name: 'Reputation', value: 'reputation' },
                  { name: 'Giveaway', value: 'giveaway' },
                  { name: 'Suggestions', value: 'suggestions' },
                  { name: 'Starboard', value: 'starboard' }
                )
            )
        )
        .addSubcommand((sub) =>
          sub.setName('estado').setDescription('Ver que modulos estan activados/desactivados')
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('establecer')
        .setDescription('Establecer valores de configuracion')
        .addSubcommand((sub) =>
          sub
            .setName('bienvenida')
            .setDescription('Configurar mensajes de bienvenida')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de bienvenida').setRequired(true))
            .addStringOption((opt) => opt.setName('mensaje').setDescription('Mensaje de bienvenida (usa {user}, {server}, {inviter}, {memberCount})'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('despedida')
            .setDescription('Configurar mensajes de despedida')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de despedida').setRequired(true))
            .addStringOption((opt) => opt.setName('mensaje').setDescription('Mensaje de despedida (usa {user}, {server}, {memberCount})'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('modlog')
            .setDescription('Establecer el canal de logs de moderacion')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de logs de moderacion').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('messagelog')
            .setDescription('Establecer el canal de logs de edicion/eliminacion')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de logs de mensajes').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('joinleavelog')
            .setDescription('Establecer el canal de logs de entradas/salidas')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de logs de entradas/salidas').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('levelup')
            .setDescription('Configurar ajustes de subida de nivel')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de anuncios de subida de nivel'))
            .addIntegerOption((opt) => opt.setName('xp_por_mensaje').setDescription('XP por mensaje (por defecto 15)').setMinValue(1).setMaxValue(500))
            .addIntegerOption((opt) => opt.setName('enfriamiento').setDescription('Enfriamiento de XP en segundos (por defecto 60)').setMinValue(0).setMaxValue(600))
        )
        .addSubcommand((sub) =>
          sub
            .setName('joinrole')
            .setDescription('Agregar o quitar un autorol al entrar')
            .addRoleOption((opt) => opt.setName('rol').setDescription('Rol para autoasignar al entrar').setRequired(true))
            .addBooleanOption((opt) => opt.setName('quitar').setDescription('Quitar este rol de los roles de entrada'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('muterole')
            .setDescription('Establecer el rol de silencio')
            .addRoleOption((opt) => opt.setName('rol').setDescription('Rol de silencio').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('starboard')
            .setDescription('Configurar ajustes de starboard')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de starboard').setRequired(true))
            .addIntegerOption((opt) => opt.setName('umbral').setDescription('Estrellas necesarias (por defecto: 3)').setMinValue(1).setMaxValue(25))
            .addStringOption((opt) => opt.setName('emoji').setDescription('Emoji de estrella (por defecto: estrella)'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('suggestions')
            .setDescription('Configurar canal de sugerencias')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de sugerencias').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('reputation')
            .setDescription('Configurar ajustes de reputación')
            .addChannelOption((opt) => opt.setName('canal').setDescription('Restringir /rep a este canal (opcional)'))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('automod')
        .setDescription('Configuracion de AutoMod')
        .addSubcommand((sub) =>
          sub
            .setName('antispam')
            .setDescription('Configurar anti-spam')
            .addBooleanOption((opt) => opt.setName('activado').setDescription('Activar/desactivar').setRequired(true))
            .addIntegerOption((opt) => opt.setName('umbral').setDescription('Mensajes antes de activar (por defecto 5)').setMinValue(2).setMaxValue(20))
            .addIntegerOption((opt) => opt.setName('intervalo').setDescription('Ventana de tiempo en segundos (por defecto 5)').setMinValue(1).setMaxValue(30))
        )
        .addSubcommand((sub) =>
          sub
            .setName('anticaps')
            .setDescription('Configurar anti-mayusculas')
            .addBooleanOption((opt) => opt.setName('activado').setDescription('Activar/desactivar').setRequired(true))
            .addIntegerOption((opt) => opt.setName('umbral').setDescription('Umbral de mayusculas en porcentaje (por defecto 70)').setMinValue(30).setMaxValue(100))
        )
        .addSubcommand((sub) =>
          sub
            .setName('antilinks')
            .setDescription('Configurar anti-enlaces')
            .addBooleanOption((opt) => opt.setName('activado').setDescription('Activar/desactivar').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('blacklist')
            .setDescription('Agregar o quitar una palabra bloqueada')
            .addStringOption((opt) => opt.setName('palabra').setDescription('Palabra a agregar/quitar').setRequired(true))
            .addBooleanOption((opt) => opt.setName('quitar').setDescription('Quitar en lugar de agregar'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('exempt')
            .setDescription('Excluir un rol o canal de automod')
            .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a excluir'))
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal a excluir'))
            .addBooleanOption((opt) => opt.setName('quitar').setDescription('Quitar exclusion'))
        )
    ),
  module: 'config',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    // ─── Module Enable/Disable ───────────────────────────
    if (group === 'modulo') {
      if (sub === 'estado') {
        const config = await getGuildConfig(guildId);
        const modules: ModuleName[] = ['invites', 'leveling', 'moderation', 'automod', 'tickets', 'automation', 'welcome', 'farewell', 'reputation', 'giveaway', 'suggestions', 'starboard'];
        const lines = modules.map((m) => {
          const field = MODULE_TOGGLE_MAP[m];
          const enabled = (config as any)[field];
          return `${enabled ? '✅' : '❌'} **${m.charAt(0).toUpperCase() + m.slice(1)}**`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('config'))
          .setTitle('Estado de Módulos')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Usa /configuracion modulo activar/desactivar <name> para cambiarlo' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const moduleName = interaction.options.getString('name', true) as ModuleName;
      const field = MODULE_TOGGLE_MAP[moduleName];
      const enable = sub === 'activar';

      await updateGuildConfig(guildId, { [field]: enable });

      await interaction.reply({
        content: `${enable ? '✅' : '❌'} El módulo **${moduleName}** ha sido **${enable ? 'activado' : 'desactivado'}**.`,
        ephemeral: true,
      });
      return;
    }

    // ─── Set Configuration ───────────────────────────────
    if (group === 'establecer') {
      switch (sub) {
        case 'bienvenida': {
          const channel = interaction.options.getChannel('canal', true);
          const message = interaction.options.getString('mensaje');

          const data: Record<string, any> = { welcomeChannelId: channel.id };
          if (message) data.welcomeMessage = message;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Canal de bienvenida establecido en <#${channel.id}>.${message ? ' Mensaje actualizado.' : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'despedida': {
          const channel = interaction.options.getChannel('canal', true);
          const message = interaction.options.getString('mensaje');

          const data: Record<string, any> = { farewellChannelId: channel.id };
          if (message) data.farewellMessage = message;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Canal de despedida establecido en <#${channel.id}>.${message ? ' Mensaje actualizado.' : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'modlog': {
          const channel = interaction.options.getChannel('canal', true);
          await updateGuildConfig(guildId, { modLogChannelId: channel.id });
          await interaction.reply({ content: `Canal de logs de moderacion establecido en <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'messagelog': {
          const channel = interaction.options.getChannel('canal', true);
          await updateGuildConfig(guildId, { messageLogChannelId: channel.id });
          await interaction.reply({ content: `Canal de logs de mensajes establecido en <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'joinleavelog': {
          const channel = interaction.options.getChannel('canal', true);
          await updateGuildConfig(guildId, { joinLeaveLogChannelId: channel.id });
          await interaction.reply({ content: `Canal de logs de entradas/salidas establecido en <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'levelup': {
          const channel = interaction.options.getChannel('canal');
          const xpPerMsg = interaction.options.getInteger('xp_por_mensaje');
          const cooldown = interaction.options.getInteger('enfriamiento');

          const data: Record<string, any> = {};
          if (channel) data.levelUpChannelId = channel.id;
          if (xpPerMsg !== null) data.xpPerMessage = xpPerMsg;
          if (cooldown !== null) data.xpCooldown = cooldown;

          if (Object.keys(data).length === 0) {
            await interaction.reply({ content: 'No se proporcionaron ajustes.', ephemeral: true });
            return;
          }

          await updateGuildConfig(guildId, data);

          const parts: string[] = [];
          if (channel) parts.push(`Canal de subida de nivel: <#${channel.id}>`);
          if (xpPerMsg !== null) parts.push(`XP por mensaje: ${xpPerMsg}`);
          if (cooldown !== null) parts.push(`Enfriamiento de XP: ${cooldown}s`);

          await interaction.reply({ content: parts.join('\n'), ephemeral: true });
          break;
        }

        case 'joinrole': {
          const role = interaction.options.getRole('rol', true);
          const remove = interaction.options.getBoolean('quitar') ?? false;

          const config = await getGuildConfig(guildId);
          let joinRoleIds: string[] = config.joinRoleIds || [];

          if (remove) {
            joinRoleIds = joinRoleIds.filter((id: string) => id !== role.id);
            await updateGuildConfig(guildId, { joinRoleIds });
            await interaction.reply({ content: `Se quitó **${role.name}** de los roles de entrada.`, ephemeral: true });
          } else {
            if (!joinRoleIds.includes(role.id)) {
              joinRoleIds.push(role.id);
            }
            await updateGuildConfig(guildId, { joinRoleIds });
            await interaction.reply({ content: `Se agregó **${role.name}** como rol de entrada.`, ephemeral: true });
          }
          break;
        }

        case 'muterole': {
          const role = interaction.options.getRole('rol', true);
          await updateGuildConfig(guildId, { muteRoleId: role.id });
          await interaction.reply({ content: `Rol de silencio establecido en **${role.name}**.`, ephemeral: true });
          break;
        }

        case 'starboard': {
          const channel = interaction.options.getChannel('canal', true);
          const threshold = interaction.options.getInteger('umbral');
          const emoji = interaction.options.getString('emoji');

          const data: Record<string, any> = { starboardChannelId: channel.id };
          if (threshold !== null) data.starboardThreshold = threshold;
          if (emoji) data.starboardEmoji = emoji;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Canal de starboard establecido en <#${channel.id}>.${threshold ? ` Umbral: ${threshold} estrellas.` : ''}${emoji ? ` Emoji: ${emoji}` : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'suggestions': {
          const channel = interaction.options.getChannel('canal', true);
          await updateGuildConfig(guildId, { suggestionsChannelId: channel.id });
          await interaction.reply({ content: `Canal de sugerencias establecido en <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'reputation': {
          const channel = interaction.options.getChannel('canal');

          if (!channel) {
            await interaction.reply({ content: 'No se proporcionaron ajustes.', ephemeral: true });
            return;
          }

          await updateGuildConfig(guildId, { repChannelId: channel.id });
          await interaction.reply({ content: `Canal de reputación establecido en <#${channel.id}>.`, ephemeral: true });
          break;
        }
      }
      return;
    }

    // ─── AutoMod Configuration ───────────────────────────
    if (group === 'automod') {
      switch (sub) {
        case 'antispam': {
          const enabled = interaction.options.getBoolean('activado', true);
          const threshold = interaction.options.getInteger('umbral');
          const interval = interaction.options.getInteger('intervalo');

          const data: Record<string, any> = { antiSpamEnabled: enabled };
          if (threshold !== null) data.antiSpamThreshold = threshold;
          if (interval !== null) data.antiSpamInterval = interval;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Anti-spam ${enabled ? 'activado' : 'desactivado'}.${threshold ? ` Umbral: ${threshold} mensajes.` : ''}${interval ? ` Intervalo: ${interval}s.` : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'anticaps': {
          const enabled = interaction.options.getBoolean('activado', true);
          const threshold = interaction.options.getInteger('umbral');

          const data: Record<string, any> = { antiCapsEnabled: enabled };
          if (threshold !== null) data.antiCapsThreshold = threshold;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Anti-mayusculas ${enabled ? 'activado' : 'desactivado'}.${threshold ? ` Umbral: ${threshold}%.` : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'antilinks': {
          const enabled = interaction.options.getBoolean('activado', true);
          await updateGuildConfig(guildId, { antiLinksEnabled: enabled });
          await interaction.reply({ content: `Anti-enlaces ${enabled ? 'activado' : 'desactivado'}.`, ephemeral: true });
          break;
        }

        case 'blacklist': {
          const word = interaction.options.getString('palabra', true).toLowerCase();
          const remove = interaction.options.getBoolean('quitar') ?? false;

          const config = await getGuildConfig(guildId);
          let blacklist: string[] = config.blacklistedWords || [];

          if (remove) {
            blacklist = blacklist.filter((w: string) => w !== word);
            await updateGuildConfig(guildId, { blacklistedWords: blacklist });
            await interaction.reply({ content: `Se quitó \`${word}\` de la lista negra.`, ephemeral: true });
          } else {
            if (!blacklist.includes(word)) blacklist.push(word);
            await updateGuildConfig(guildId, { blacklistedWords: blacklist });
            await interaction.reply({ content: `Se agregó \`${word}\` a la lista negra.`, ephemeral: true });
          }
          break;
        }

        case 'exempt': {
          const role = interaction.options.getRole('rol');
          const channel = interaction.options.getChannel('canal');
          const remove = interaction.options.getBoolean('quitar') ?? false;

          if (!role && !channel) {
            await interaction.reply({ content: 'Proporciona un rol o canal para excluir.', ephemeral: true });
            return;
          }

          const config = await getGuildConfig(guildId);
          const data: Record<string, any> = {};

          if (role) {
            let exemptRoles: string[] = config.automodExemptRoleIds || [];
            if (remove) {
              exemptRoles = exemptRoles.filter((id: string) => id !== role.id);
            } else if (!exemptRoles.includes(role.id)) {
              exemptRoles.push(role.id);
            }
            data.automodExemptRoleIds = exemptRoles;
          }

          if (channel) {
            let exemptChannels: string[] = config.automodExemptChannelIds || [];
            if (remove) {
              exemptChannels = exemptChannels.filter((id: string) => id !== channel.id);
            } else if (!exemptChannels.includes(channel.id)) {
              exemptChannels.push(channel.id);
            }
            data.automodExemptChannelIds = exemptChannels;
          }

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Exclusión de AutoMod actualizada.${role ? ` Rol: ${role.name} (${remove ? 'quitado' : 'agregado'})` : ''}${channel ? ` Canal: <#${channel.id}> (${remove ? 'quitado' : 'agregado'})` : ''}`,
            ephemeral: true,
          });
          break;
        }
      }
    }
  },
};
