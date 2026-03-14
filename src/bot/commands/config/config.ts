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
    .setName('config')
    .setDescription('Bot configuration commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName('module')
        .setDescription('Enable or disable modules')
        .addSubcommand((sub) =>
          sub
            .setName('enable')
            .setDescription('Enable a module')
            .addStringOption((opt) =>
              opt
                .setName('name')
                .setDescription('Module to enable')
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
            .setName('disable')
            .setDescription('Disable a module')
            .addStringOption((opt) =>
              opt
                .setName('name')
                .setDescription('Module to disable')
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
          sub.setName('status').setDescription('View which modules are enabled/disabled')
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('set')
        .setDescription('Set configuration values')
        .addSubcommand((sub) =>
          sub
            .setName('welcome')
            .setDescription('Configure welcome messages')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
            .addStringOption((opt) => opt.setName('message').setDescription('Welcome message (use {user}, {server}, {inviter}, {memberCount})'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('farewell')
            .setDescription('Configure farewell messages')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Farewell channel').setRequired(true))
            .addStringOption((opt) => opt.setName('message').setDescription('Farewell message (use {user}, {server}, {memberCount})'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('modlog')
            .setDescription('Set the moderation log channel')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Mod log channel').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('messagelog')
            .setDescription('Set the message edit/delete log channel')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Message log channel').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('joinleavelog')
            .setDescription('Set the join/leave log channel')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Join/leave log channel').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('levelup')
            .setDescription('Configure level-up settings')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Level-up announcement channel'))
            .addIntegerOption((opt) => opt.setName('xp_per_message').setDescription('XP per message (default 15)').setMinValue(1).setMaxValue(500))
            .addIntegerOption((opt) => opt.setName('cooldown').setDescription('XP cooldown in seconds (default 60)').setMinValue(0).setMaxValue(600))
        )
        .addSubcommand((sub) =>
          sub
            .setName('joinrole')
            .setDescription('Add or remove an auto-role on join')
            .addRoleOption((opt) => opt.setName('role').setDescription('Role to auto-assign on join').setRequired(true))
            .addBooleanOption((opt) => opt.setName('remove').setDescription('Remove this role from join roles'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('muterole')
            .setDescription('Set the mute role')
            .addRoleOption((opt) => opt.setName('role').setDescription('Mute role').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('starboard')
            .setDescription('Configure starboard settings')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Starboard channel').setRequired(true))
            .addIntegerOption((opt) => opt.setName('threshold').setDescription('Stars needed (default: 3)').setMinValue(1).setMaxValue(25))
            .addStringOption((opt) => opt.setName('emoji').setDescription('Star emoji (default: star)'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('suggestions')
            .setDescription('Configure suggestions channel')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Suggestions channel').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('reputation')
            .setDescription('Configure reputation settings')
            .addIntegerOption((opt) => opt.setName('cooldown').setDescription('Cooldown between giving rep in seconds (default: 86400 = 24h)').setMinValue(60).setMaxValue(604800))
            .addChannelOption((opt) => opt.setName('channel').setDescription('Restrict rep to this channel (optional)'))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('automod')
        .setDescription('AutoMod configuration')
        .addSubcommand((sub) =>
          sub
            .setName('antispam')
            .setDescription('Configure anti-spam')
            .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable/disable').setRequired(true))
            .addIntegerOption((opt) => opt.setName('threshold').setDescription('Messages before trigger (default 5)').setMinValue(2).setMaxValue(20))
            .addIntegerOption((opt) => opt.setName('interval').setDescription('Time window in seconds (default 5)').setMinValue(1).setMaxValue(30))
        )
        .addSubcommand((sub) =>
          sub
            .setName('anticaps')
            .setDescription('Configure anti-caps')
            .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable/disable').setRequired(true))
            .addIntegerOption((opt) => opt.setName('threshold').setDescription('Caps percentage threshold (default 70)').setMinValue(30).setMaxValue(100))
        )
        .addSubcommand((sub) =>
          sub
            .setName('antilinks')
            .setDescription('Configure anti-links')
            .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable/disable').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('blacklist')
            .setDescription('Add or remove a blacklisted word')
            .addStringOption((opt) => opt.setName('word').setDescription('Word to add/remove').setRequired(true))
            .addBooleanOption((opt) => opt.setName('remove').setDescription('Remove instead of add'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('exempt')
            .setDescription('Exempt a role or channel from automod')
            .addRoleOption((opt) => opt.setName('role').setDescription('Role to exempt'))
            .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to exempt'))
            .addBooleanOption((opt) => opt.setName('remove').setDescription('Remove exemption'))
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
    if (group === 'module') {
      if (sub === 'status') {
        const config = await getGuildConfig(guildId);
        const modules: ModuleName[] = ['invites', 'leveling', 'moderation', 'automod', 'tickets', 'automation', 'welcome', 'farewell', 'reputation', 'giveaway', 'suggestions', 'starboard'];
        const lines = modules.map((m) => {
          const field = MODULE_TOGGLE_MAP[m];
          const enabled = (config as any)[field];
          return `${enabled ? '✅' : '❌'} **${m.charAt(0).toUpperCase() + m.slice(1)}**`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('config'))
          .setTitle('Module Status')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Use /config module enable/disable <name> to toggle' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const moduleName = interaction.options.getString('name', true) as ModuleName;
      const field = MODULE_TOGGLE_MAP[moduleName];
      const enable = sub === 'enable';

      await updateGuildConfig(guildId, { [field]: enable });

      await interaction.reply({
        content: `${enable ? '✅' : '❌'} Module **${moduleName}** has been **${enable ? 'enabled' : 'disabled'}**.`,
        ephemeral: true,
      });
      return;
    }

    // ─── Set Configuration ───────────────────────────────
    if (group === 'set') {
      switch (sub) {
        case 'welcome': {
          const channel = interaction.options.getChannel('channel', true);
          const message = interaction.options.getString('message');

          const data: Record<string, any> = { welcomeChannelId: channel.id };
          if (message) data.welcomeMessage = message;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Welcome channel set to <#${channel.id}>.${message ? ' Message updated.' : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'farewell': {
          const channel = interaction.options.getChannel('channel', true);
          const message = interaction.options.getString('message');

          const data: Record<string, any> = { farewellChannelId: channel.id };
          if (message) data.farewellMessage = message;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Farewell channel set to <#${channel.id}>.${message ? ' Message updated.' : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'modlog': {
          const channel = interaction.options.getChannel('channel', true);
          await updateGuildConfig(guildId, { modLogChannelId: channel.id });
          await interaction.reply({ content: `Mod log channel set to <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'messagelog': {
          const channel = interaction.options.getChannel('channel', true);
          await updateGuildConfig(guildId, { messageLogChannelId: channel.id });
          await interaction.reply({ content: `Message log channel set to <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'joinleavelog': {
          const channel = interaction.options.getChannel('channel', true);
          await updateGuildConfig(guildId, { joinLeaveLogChannelId: channel.id });
          await interaction.reply({ content: `Join/leave log channel set to <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'levelup': {
          const channel = interaction.options.getChannel('channel');
          const xpPerMsg = interaction.options.getInteger('xp_per_message');
          const cooldown = interaction.options.getInteger('cooldown');

          const data: Record<string, any> = {};
          if (channel) data.levelUpChannelId = channel.id;
          if (xpPerMsg !== null) data.xpPerMessage = xpPerMsg;
          if (cooldown !== null) data.xpCooldown = cooldown;

          if (Object.keys(data).length === 0) {
            await interaction.reply({ content: 'No settings provided.', ephemeral: true });
            return;
          }

          await updateGuildConfig(guildId, data);

          const parts: string[] = [];
          if (channel) parts.push(`Level-up channel: <#${channel.id}>`);
          if (xpPerMsg !== null) parts.push(`XP per message: ${xpPerMsg}`);
          if (cooldown !== null) parts.push(`XP cooldown: ${cooldown}s`);

          await interaction.reply({ content: parts.join('\n'), ephemeral: true });
          break;
        }

        case 'joinrole': {
          const role = interaction.options.getRole('role', true);
          const remove = interaction.options.getBoolean('remove') ?? false;

          const config = await getGuildConfig(guildId);
          let joinRoleIds: string[] = config.joinRoleIds || [];

          if (remove) {
            joinRoleIds = joinRoleIds.filter((id: string) => id !== role.id);
            await updateGuildConfig(guildId, { joinRoleIds });
            await interaction.reply({ content: `Removed **${role.name}** from join roles.`, ephemeral: true });
          } else {
            if (!joinRoleIds.includes(role.id)) {
              joinRoleIds.push(role.id);
            }
            await updateGuildConfig(guildId, { joinRoleIds });
            await interaction.reply({ content: `Added **${role.name}** as a join role.`, ephemeral: true });
          }
          break;
        }

        case 'muterole': {
          const role = interaction.options.getRole('role', true);
          await updateGuildConfig(guildId, { muteRoleId: role.id });
          await interaction.reply({ content: `Mute role set to **${role.name}**.`, ephemeral: true });
          break;
        }

        case 'starboard': {
          const channel = interaction.options.getChannel('channel', true);
          const threshold = interaction.options.getInteger('threshold');
          const emoji = interaction.options.getString('emoji');

          const data: Record<string, any> = { starboardChannelId: channel.id };
          if (threshold !== null) data.starboardThreshold = threshold;
          if (emoji) data.starboardEmoji = emoji;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Starboard channel set to <#${channel.id}>.${threshold ? ` Threshold: ${threshold} stars.` : ''}${emoji ? ` Emoji: ${emoji}` : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'suggestions': {
          const channel = interaction.options.getChannel('channel', true);
          await updateGuildConfig(guildId, { suggestionsChannelId: channel.id });
          await interaction.reply({ content: `Suggestions channel set to <#${channel.id}>.`, ephemeral: true });
          break;
        }

        case 'reputation': {
          const cooldown = interaction.options.getInteger('cooldown');
          const channel = interaction.options.getChannel('channel');

          const data: Record<string, any> = {};
          if (cooldown !== null) data.repCooldown = cooldown;
          if (channel) data.repChannelId = channel.id;

          if (Object.keys(data).length === 0) {
            await interaction.reply({ content: 'No settings provided.', ephemeral: true });
            return;
          }

          await updateGuildConfig(guildId, data);

          const parts: string[] = [];
          if (cooldown !== null) {
            const hours = Math.floor(cooldown / 3600);
            const mins = Math.floor((cooldown % 3600) / 60);
            parts.push(`Rep cooldown: ${hours > 0 ? `${hours}h ` : ''}${mins}m`);
          }
          if (channel) parts.push(`Rep channel: <#${channel.id}>`);

          await interaction.reply({ content: parts.join('\n'), ephemeral: true });
          break;
        }
      }
      return;
    }

    // ─── AutoMod Configuration ───────────────────────────
    if (group === 'automod') {
      switch (sub) {
        case 'antispam': {
          const enabled = interaction.options.getBoolean('enabled', true);
          const threshold = interaction.options.getInteger('threshold');
          const interval = interaction.options.getInteger('interval');

          const data: Record<string, any> = { antiSpamEnabled: enabled };
          if (threshold !== null) data.antiSpamThreshold = threshold;
          if (interval !== null) data.antiSpamInterval = interval;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Anti-spam ${enabled ? 'enabled' : 'disabled'}.${threshold ? ` Threshold: ${threshold} msgs.` : ''}${interval ? ` Interval: ${interval}s.` : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'anticaps': {
          const enabled = interaction.options.getBoolean('enabled', true);
          const threshold = interaction.options.getInteger('threshold');

          const data: Record<string, any> = { antiCapsEnabled: enabled };
          if (threshold !== null) data.antiCapsThreshold = threshold;

          await updateGuildConfig(guildId, data);
          await interaction.reply({
            content: `Anti-caps ${enabled ? 'enabled' : 'disabled'}.${threshold ? ` Threshold: ${threshold}%.` : ''}`,
            ephemeral: true,
          });
          break;
        }

        case 'antilinks': {
          const enabled = interaction.options.getBoolean('enabled', true);
          await updateGuildConfig(guildId, { antiLinksEnabled: enabled });
          await interaction.reply({ content: `Anti-links ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
          break;
        }

        case 'blacklist': {
          const word = interaction.options.getString('word', true).toLowerCase();
          const remove = interaction.options.getBoolean('remove') ?? false;

          const config = await getGuildConfig(guildId);
          let blacklist: string[] = config.blacklistedWords || [];

          if (remove) {
            blacklist = blacklist.filter((w: string) => w !== word);
            await updateGuildConfig(guildId, { blacklistedWords: blacklist });
            await interaction.reply({ content: `Removed \`${word}\` from the blacklist.`, ephemeral: true });
          } else {
            if (!blacklist.includes(word)) blacklist.push(word);
            await updateGuildConfig(guildId, { blacklistedWords: blacklist });
            await interaction.reply({ content: `Added \`${word}\` to the blacklist.`, ephemeral: true });
          }
          break;
        }

        case 'exempt': {
          const role = interaction.options.getRole('role');
          const channel = interaction.options.getChannel('channel');
          const remove = interaction.options.getBoolean('remove') ?? false;

          if (!role && !channel) {
            await interaction.reply({ content: 'Provide a role or channel to exempt.', ephemeral: true });
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
            content: `AutoMod exemption updated.${role ? ` Role: ${role.name} (${remove ? 'removed' : 'added'})` : ''}${channel ? ` Channel: <#${channel.id}> (${remove ? 'removed' : 'added'})` : ''}`,
            ephemeral: true,
          });
          break;
        }
      }
    }
  },
};
