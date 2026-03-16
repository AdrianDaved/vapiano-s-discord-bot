/**
 * /rol command — Gestión masiva de roles.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  GuildMember,
  Role,
} from 'discord.js';
import { moduleColor } from '../../utils';
import logger from '../../../shared/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('rol')
    .setDescription('Gestionar roles de los miembros')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('dar')
        .setDescription('Dar un rol a un miembro')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario objetivo').setRequired(true))
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a dar').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('quitar')
        .setDescription('Quitar un rol a un miembro')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario objetivo').setRequired(true))
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a quitar').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('todos')
        .setDescription('Dar o quitar un rol a todos los miembros')
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a dar/quitar').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('accion')
            .setDescription('Dar o quitar')
            .setRequired(true)
            .addChoices(
              { name: 'Dar a todos', value: 'add' },
              { name: 'Quitar a todos', value: 'remove' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Ver información de un rol')
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a inspeccionar').setRequired(true))
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageRoles],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    switch (sub) {
      case 'dar': {
        const user = interaction.options.getUser('usuario', true);
        const role = interaction.options.getRole('rol', true) as Role;
        const member = await guild.members.fetch(user.id).catch(() => null);

        if (!member) {
          await interaction.reply({ content: 'Usuario no encontrado en este servidor.', ephemeral: true });
          return;
        }

        if (!canManageRole(interaction.member as GuildMember, role, guild)) {
          await interaction.reply({ content: 'No puedes gestionar este rol (puede ser superior al tuyo).', ephemeral: true });
          return;
        }

        await member.roles.add(role);
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(moduleColor('moderation'))
              .setDescription(`Se dio ${role} a ${member}.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      case 'quitar': {
        const user = interaction.options.getUser('usuario', true);
        const role = interaction.options.getRole('rol', true) as Role;
        const member = await guild.members.fetch(user.id).catch(() => null);

        if (!member) {
          await interaction.reply({ content: 'Usuario no encontrado en este servidor.', ephemeral: true });
          return;
        }

        if (!canManageRole(interaction.member as GuildMember, role, guild)) {
          await interaction.reply({ content: 'No puedes gestionar este rol.', ephemeral: true });
          return;
        }

        await member.roles.remove(role);
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(moduleColor('moderation'))
              .setDescription(`Se quitó ${role} de ${member}.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      case 'todos': {
        const role = interaction.options.getRole('rol', true) as Role;
        const action = interaction.options.getString('accion', true);

        if (!canManageRole(interaction.member as GuildMember, role, guild)) {
          await interaction.reply({ content: 'No puedes gestionar este rol.', ephemeral: true });
          return;
        }

        await interaction.deferReply();

        const members = await guild.members.fetch();
        let count = 0;

        for (const member of members.values()) {
          try {
            if (action === 'add' && !member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              count++;
            } else if (action === 'remove' && member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
              count++;
            }
          } catch {
            // Omitir miembros que no se pueden modificar
          }
        }

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(moduleColor('moderation'))
              .setDescription(
                action === 'add'
                  ? `Se dio ${role} a **${count}** miembro(s).`
                  : `Se quitó ${role} de **${count}** miembro(s).`
              )
              .setTimestamp(),
          ],
        });
        break;
      }

      case 'info': {
        const role = interaction.options.getRole('rol', true) as Role;

        const embed = new EmbedBuilder()
          .setColor(role.color || 0x99aab5)
          .setTitle(`Rol: ${role.name}`)
          .addFields(
            { name: 'ID', value: role.id, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'Posición', value: role.position.toString(), inline: true },
            { name: 'Miembros', value: role.members.size.toString(), inline: true },
            { name: 'Mencionable', value: role.mentionable ? 'Sí' : 'No', inline: true },
            { name: 'Separado', value: role.hoist ? 'Sí' : 'No', inline: true },
            { name: 'Creado', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Gestionado', value: role.managed ? 'Sí (bot/integración)' : 'No', inline: true },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
};

function canManageRole(member: GuildMember, role: Role, guild: any): boolean {
  // Verificar que el bot puede gestionar este rol
  const botMember = guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) return false;
  // Verificar que el rol más alto del usuario está por encima del rol objetivo
  if (role.position >= member.roles.highest.position) return false;
  return true;
}
