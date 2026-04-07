import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ComponentType,
} from 'discord.js';
import { BotClient } from '../../../shared/types';
import prisma from '../../../database/client';
import { moduleColor } from '../../utils';

const moduleEmojis: Record<string, string> = {
  invites: '📨', moderation: '🛡️', automod: '🤖', tickets: '🎫',
  automation: '⚡', reputation: '⭐', giveaway: '🎉', suggestions: '💡',
  config: '⚙️', utility: '🔧', backup: '💾', social: '👥',
  sticky: '📌', afk: '💤', starboard: '✨', logging: '📝',
};

const moduleNames: Record<string, string> = {
  invites: 'Invitaciones', moderation: 'Moderación', automod: 'AutoMod',
  tickets: 'Tickets', automation: 'Automatización', reputation: 'Reputación',
  giveaway: 'Sorteos', suggestions: 'Sugerencias', config: 'Configuración',
  utility: 'Utilidades', backup: 'Respaldos', social: 'Social',
  sticky: 'Mensajes Fijos', afk: 'AFK', starboard: 'Starboard', logging: 'Registros',
};

const commandDetails: Record<string, { desc: string; subs?: Record<string, string> }> = {
  // ─── Moderación ─────────────────────────────────────────────────────────
  ban: {
    desc: 'Banear permanentemente a un usuario. El log se envía automáticamente al canal de bans con el moderador correcto.',
  },
  limpiar: {
    desc: 'Eliminar entre 1 y 100 mensajes de un canal.',
  },
  mod: {
    desc: 'Comandos de moderación avanzada',
    subs: {
      advertir: 'Advertir a un usuario (se registra y puede enviarse al canal de advertencias)',
      advertencias: 'Ver el historial de advertencias de un usuario',
      'quitar-advertencia': 'Eliminar una advertencia específica por ID',
      mute: 'Silenciar a un usuario temporalmente (timeout)',
      unmute: 'Quitar el silencio/timeout a un usuario',
      kick: 'Expulsar a un usuario del servidor',
      historial: 'Ver el historial de acciones de moderación de un usuario',
    },
  },
  purgar: {
    desc: 'Eliminar mensajes masivamente con filtros: por usuario, solo bots, solo embeds, solo archivos, etc.',
  },
  rolreaccion: {
    desc: 'Gestionar paneles de roles por botón de reacción',
    subs: {
      crear: 'Crear un nuevo panel de roles por reacción',
      agregar: 'Agregar un botón de rol a un panel existente',
      quitar: 'Quitar un botón de rol de un panel',
      lista: 'Listar todos los paneles del servidor',
    },
  },
  rol: {
    desc: 'Gestionar roles de los miembros del servidor',
    subs: {
      dar: 'Dar un rol a un miembro',
      quitar: 'Quitar un rol a un miembro',
      todos: 'Dar o quitar un rol a todos los miembros',
      info: 'Ver información detallada sobre un rol',
    },
  },
  modolento: {
    desc: 'Establecer o quitar el modo lento de un canal (0 = desactivar).',
  },
  verificacion: {
    desc: 'Verificar un usuario: asigna rol de verificado, anuncia y puede guardar transcripción.',
  },

  // ─── Utilidades ─────────────────────────────────────────────────────────
  perfil: {
    desc: 'Ver el perfil completo de un miembro: rep global, posición en ranking, invitaciones, rol más alto y últimas reps recibidas. Botones para ver el historial completo paginado de reps recibidas y dadas.',
  },
  ayuda: {
    desc: 'Centro de ayuda interactivo con todos los módulos y comandos del bot.',
  },
  anunciar: {
    desc: 'Enviar un anuncio con embed personalizado. Soporta mención de rol, @everyone, imagen y auto-publicación en canales de anuncios.',
  },
  embed: {
    desc: 'Crear y gestionar embeds personalizados',
    subs: {
      enviar: 'Enviar un embed personalizado. Opción `mencionar` para @everyone/@here fuera del embed.',
      editar: 'Editar un embed existente enviado por el bot (por ID de mensaje)',
    },
  },
  hablar: {
    desc: 'Hacer que el bot envíe un mensaje de texto e imágenes en cualquier canal.',
  },
  snipe: {
    desc: 'Ver el último mensaje eliminado en el canal actual.',
  },
  recordatorio: {
    desc: 'Gestionar recordatorios personales con tiempo relativo',
    subs: {
      crear: 'Crear un nuevo recordatorio (ej. 30m, 2h, 1d)',
      lista: 'Ver tus recordatorios activos',
      eliminar: 'Eliminar un recordatorio por ID',
    },
  },
  servidor: {
    desc: 'Ver información detallada sobre el servidor: miembros, roles, canales, boost, etc.',
  },
  usuario: {
    desc: 'Ver información de un usuario: roles, fecha de entrada, creación de cuenta, etc.',
  },

  // ─── Mensajes Fijos ──────────────────────────────────────────────────────
  fijo: {
    desc: 'Mensajes fijos que se reenvían al final del canal cada vez que alguien escribe.',
    subs: {
      establecer: 'Establecer un mensaje fijo en un canal',
      quitar: 'Quitar el mensaje fijo de un canal',
      lista: 'Listar todos los mensajes fijos del servidor',
    },
  },

  // ─── Social / AFK ────────────────────────────────────────────────────────
  afk: {
    desc: 'Gestionar tu estado AFK. El bot notifica a quienes te mencionen y te retira el AFK al escribir.',
    subs: {
      establecer: 'Ponerte como AFK con una razón opcional',
      quitar: 'Quitar tu estado AFK manualmente',
    },
  },
  sorteo: {
    desc: 'Sistema completo de sorteos con botón de participación',
    subs: {
      iniciar: 'Iniciar un sorteo. Opción `mencionar` para @everyone/@here antes del sorteo.',
      finalizar: 'Finalizar un sorteo antes de tiempo y anunciar ganadores',
      resortear: 'Elegir nuevos ganadores de un sorteo ya finalizado',
      lista: 'Ver todos los sorteos activos del servidor',
    },
  },
  sugerencia: {
    desc: 'Sistema de sugerencias de la comunidad',
    subs: {
      crear: 'Enviar una nueva sugerencia al canal de sugerencias',
      aprobar: 'Aprobar una sugerencia (solo moderadores)',
      rechazar: 'Rechazar una sugerencia (solo moderadores)',
      estado: 'Ver el estado actual de una sugerencia',
    },
  },

  // ─── Automatización ──────────────────────────────────────────────────────
  autorespuesta: {
    desc: 'Respuestas automáticas del bot ante ciertos mensajes',
    subs: {
      agregar: 'Agregar una autorespuesta (exacta, contiene, inicia con, regex)',
      lista: 'Listar todas las autorespuestas activas',
      eliminar: 'Eliminar una autorespuesta',
    },
  },
  encuesta: {
    desc: 'Sistema de encuestas con barras de progreso en tiempo real',
    subs: {
      crear: 'Crear encuesta. Opciones: `mencionar` (@everyone/@here), `rol1`-`rol5` para restringir quién vota.',
      finalizar: 'Finalizar una encuesta activa por ID',
    },
  },
  programar: {
    desc: 'Mensajes programados con expresiones cron',
    subs: {
      agregar: 'Programar un mensaje recurrente (ej. "0 9 * * 1" = cada lunes a las 9h)',
      lista: 'Listar todos los mensajes programados',
      eliminar: 'Eliminar un mensaje programado',
    },
  },

  // ─── Configuración ───────────────────────────────────────────────────────
  configuracion: {
    desc: 'Configuración general del bot para el servidor',
    subs: {
      'modulo activar': 'Activar un módulo del bot',
      'modulo desactivar': 'Desactivar un módulo del bot',
      'modulo estado': 'Ver el estado de todos los módulos',
    },
  },

  // ─── Invitaciones ────────────────────────────────────────────────────────
  invitaciones: {
    desc: 'Sistema de seguimiento de invitaciones',
    subs: {
      info: 'Ver estadísticas de invitaciones de un usuario',
      ranking: 'Ver el ranking de invitaciones del servidor',
      quien: 'Ver quién invitó a un usuario específico',
      reiniciar: 'Reiniciar el contador de invitaciones de un usuario',
    },
  },

  // ─── Respaldos ───────────────────────────────────────────────────────────
  respaldo: {
    desc: 'Respaldos completos de la estructura del servidor',
    subs: {
      crear: 'Crear un respaldo de canales, roles y configuración',
      lista: 'Listar todos los respaldos disponibles',
      restaurar: 'Restaurar un respaldo (elimina y recrea canales/roles)',
      eliminar: 'Eliminar un respaldo por ID',
    },
  },

  // ─── Reputación ──────────────────────────────────────────────────────────
  rep: {
    desc: 'Atajo rápido: dar +1 rep a un usuario mencionado. También funciona con `+rep @usuario` en el chat.',
  },
  reputacion: {
    desc: 'Sistema de reputación entre miembros',
    subs: {
      ver: 'Ver la reputación total de un usuario',
      ranking: 'Ver el ranking de reputación del servidor',
      historial: 'Ver historial de rep dada y recibida',
    },
  },

  // ─── Tickets ─────────────────────────────────────────────────────────────
  ticket: {
    desc: 'Sistema completo de tickets con paneles configurables desde el dashboard',
    subs: {
      panel: 'Gestionar paneles de tickets (crear, editar, eliminar, desplegar)',
      cerrar: 'Cerrar el ticket actual',
      añadir: 'Añadir un usuario al ticket',
      quitar: 'Quitar un usuario del ticket',
      prioridad: 'Cambiar la prioridad (baja/media/alta/urgente)',
      renombrar: 'Renombrar el canal del ticket',
      reclamar: 'Reclamar el ticket como staff',
      transferir: 'Transferir el ticket a otro miembro del staff',
    },
  },
};

export default {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Ver todos los comandos e información del bot')
    .addStringOption((opt) =>
      opt.setName('comando').setDescription('Obtener ayuda detallada de un comando específico').setRequired(false)
    ),
  cooldown: 5,
  module: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as BotClient;
    const specificCommand = interaction.options.getString('comando');

    // ── Permission filtering ────────────────────────────────────────────────
    const isAdmin = interaction.memberPermissions?.has('Administrator') ?? false;
    const memberRoles: Set<string> = new Set(
      (interaction.member as any)?.roles?.cache?.keys?.() ?? []
    );

    // Load command permissions from DB (only if in a guild)
    const permMap: Record<string, { disabled: boolean; roleIds: string[] }> = {};
    if (interaction.guildId) {
      const stored = await prisma.commandPermission.findMany({ where: { guildId: interaction.guildId } });
      for (const p of stored) permMap[p.command] = { disabled: p.disabled, roleIds: p.roleIds };
    }

    // Returns true if user can access a given command key (e.g. "ban" or "reputacion ranking")
    function canUse(cmdKey: string): boolean {
      if (isAdmin) return true;
      const perm = permMap[cmdKey];
      if (perm?.disabled) return false;
      // No config or empty roleIds = admin only by default
      if (!perm || perm.roleIds.length === 0) return false;
      return perm.roleIds.some(rid => memberRoles.has(rid));
    }

    // Returns true if user can access the parent command or any of its subcommands
    function canUseCommand(cmdName: string): boolean {
      if (canUse(cmdName)) return true;
      const details = commandDetails[cmdName];
      if (details?.subs) {
        return Object.keys(details.subs).some(sub => canUse(cmdName + ' ' + sub));
      }
      return false;
    }

    if (specificCommand) {
      const cmdName = specificCommand.toLowerCase().replace('/', '');
      const command = client.commands.get(cmdName);
      const details = commandDetails[cmdName];

      if (!command) {
        await interaction.reply({ content: `Comando \`/${cmdName}\` no encontrado.`, flags: 64 });
        return;
      }

      const mod     = command.module || 'utility';
      const emoji   = moduleEmojis[mod] || '📦';
      const modName = moduleNames[mod] || mod;

      const embed = new EmbedBuilder()
        .setColor(moduleColor(mod))
        .setTitle(`${emoji} /${command.data.name}`)
        .setDescription(details?.desc || command.data.description)
        .addFields(
          { name: '📁 Módulo', value: modName, inline: true },
          { name: '⏱️ Cooldown', value: `${command.cooldown || 3}s`, inline: true },
        );

      if (details?.subs) {
        const subsText = Object.entries(details.subs)
          .map(([sub, desc]) => `\`/${cmdName} ${sub}\`\n╰ ${desc}`)
          .join('\n\n');
        embed.addFields({ name: '📋 Subcomandos', value: subsText });
      }

      if (command.permissions?.length) {
        embed.addFields({ name: '🔒 Permisos requeridos', value: 'Requiere permisos de administración/moderación' });
      }

      embed.setFooter({ text: 'Usa /ayuda para ver todos los módulos' }).setTimestamp();
      await interaction.reply({ embeds: [embed], flags: 64 });
      return;
    }

    // Organizar comandos por módulo — filtrar por permisos del usuario
    const modules: Record<string, { name: string; description: string }[]> = {};
    for (const [, cmd] of client.commands) {
      if (!canUseCommand(cmd.data.name)) continue; // skip if user can't access any subcommand
      const mod = cmd.module || 'utility';
      if (!modules[mod]) modules[mod] = [];
      modules[mod].push({ name: `/${cmd.data.name}`, description: cmd.data.description });
    }

    const moduleOrder = [
      'moderation', 'utility', 'sticky', 'social', 'afk',
      'automation', 'config', 'invites', 'tickets',
      'reputation', 'giveaway', 'suggestions', 'starboard',
      'backup', 'logging',
    ];

    const sortedModules = Object.entries(modules).sort(([a], [b]) => {
      const ia = moduleOrder.indexOf(a);
      const ib = moduleOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const fields = sortedModules.map(([mod, cmds]) => ({
      name: `${moduleEmojis[mod] || '📦'} ${moduleNames[mod] || mod} (${cmds.length})`,
      value: cmds.map((c) => `\`${c.name}\``).join(' '),
      inline: false,
    }));

    const mainEmbed = new EmbedBuilder()
      .setColor(moduleColor('default'))
      .setAuthor({
        name: `${client.user?.username || 'Vapiano Bot'} — Centro de Ayuda`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setDescription(
        `Bienvenido al centro de ayuda de **${client.user?.username || 'Vapiano Bot'}**.\n\n` +
        `📌 Selecciona un módulo en el **menú de abajo** para ver sus comandos en detalle.\n` +
        `📌 Usa \`/ayuda comando:<nombre>\` para ver subcomandos y detalles de un comando.\n` +
        `📌 Escribe \`+rep @usuario\` en el chat para dar reputación rápidamente.`
      )
      .addFields(fields)
      .setFooter({ text: `${client.commands.size} comandos en ${sortedModules.length} módulos • Selecciona un módulo ↓` })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ayuda_modulo')
      .setPlaceholder('📂 Selecciona un módulo para ver detalles...')
      .addOptions(
        sortedModules.map(([mod, cmds]) => ({
          label: moduleNames[mod] || mod.charAt(0).toUpperCase() + mod.slice(1),
          description: `${cmds.length} comando${cmds.length !== 1 ? 's' : ''}`,
          value: mod,
          emoji: moduleEmojis[mod] || '📦',
        }))
      );

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const backButton = new ButtonBuilder()
      .setCustomId('ayuda_back')
      .setLabel('← Inicio')
      .setStyle(ButtonStyle.Secondary);
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

    const reply = await interaction.reply({ embeds: [mainEmbed], components: [menuRow] });

    const collector = reply.createMessageComponentCollector({
      time: 180_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i: StringSelectMenuInteraction | ButtonInteraction) => {
      // Back button → show main embed
      if (i.isButton() && i.customId === 'ayuda_back') {
        await (i as ButtonInteraction).update({ embeds: [mainEmbed], components: [menuRow] });
        return;
      }
      if (!i.isStringSelectMenu()) return;

      const menuInteraction = i as StringSelectMenuInteraction;
      const selectedMod = menuInteraction.values[0];
      const cmds = modules[selectedMod];
      if (!cmds) return;

      const emoji   = moduleEmojis[selectedMod] || '📦';
      const modName = moduleNames[selectedMod] || selectedMod.charAt(0).toUpperCase() + selectedMod.slice(1);

      const commandLines: string[] = [];
      for (const cmd of cmds) {
        const cmdName = cmd.name.replace('/', '');
        const details = commandDetails[cmdName];
        commandLines.push(`**${cmd.name}** — ${details?.desc || cmd.description}`);
        if (details?.subs) {
          for (const [sub, subDesc] of Object.entries(details.subs)) {
            // Only show subcommands the user can access
            if (!canUse(cmdName + ' ' + sub) && !isAdmin) continue;
            commandLines.push(`  ╰ \`${cmd.name} ${sub}\` — ${subDesc}`);
          }
        }
        commandLines.push('');
      }

      const moduleEmbed = new EmbedBuilder()
        .setColor(moduleColor(selectedMod))
        .setTitle(`${emoji} Módulo: ${modName}`)
        .setDescription(commandLines.join('\n').trim())
        .setFooter({ text: 'Usa /ayuda comando:<nombre> para más detalles' })
        .setTimestamp();

      await menuInteraction.update({ embeds: [moduleEmbed], components: [menuRow, backRow] });
    });

    collector.on('end', () => {
      selectMenu.setDisabled(true);
      backButton.setDisabled(true);
      reply.edit({ components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)] }).catch(() => {});
    });
  },
};
