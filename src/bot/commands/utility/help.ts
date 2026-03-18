import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from 'discord.js';
import { BotClient } from '../../../shared/types';
import { moduleColor } from '../../utils';

const moduleEmojis: Record<string, string> = {
  invites: '📨',
  moderation: '🛡️',
  automod: '🤖',
  tickets: '🎫',
  automation: '⚡',
  reputation: '⭐',
  giveaway: '🎉',
  suggestions: '💡',
  config: '⚙️',
  utility: '🔧',
  backup: '💾',
  social: '👥',
  sticky: '📌',
  afk: '💤',
  starboard: '⭐',
  logging: '📝',
};

const moduleNames: Record<string, string> = {
  invites: 'Invitaciones',
  moderation: 'Moderación',
  automod: 'AutoMod',
  tickets: 'Tickets',
  automation: 'Automatización',
  reputation: 'Reputación',
  giveaway: 'Sorteos',
  suggestions: 'Sugerencias',
  config: 'Configuración',
  utility: 'Utilidades',
  backup: 'Respaldos',
  social: 'Social',
  sticky: 'Mensajes Fijos',
  afk: 'AFK',
  starboard: 'Starboard',
  logging: 'Registros',
};

/** Static detailed descriptions for each command and its subcommands */
const commandDetails: Record<string, { desc: string; subs?: Record<string, string> }> = {
  // ─── Moderación ─────────────────────────
  ban: {
    desc: 'Banear a un usuario del servidor',
  },
  limpiar: {
    desc: 'Eliminar mensajes de un canal (1-100)',
  },
  mod: {
    desc: 'Comandos de moderación avanzada',
    subs: {
      advertir: 'Advertir a un usuario',
      advertencias: 'Ver advertencias de un usuario',
      'quitar-advertencia': 'Eliminar una advertencia específica',
      mute: 'Silenciar a un usuario temporalmente',
      unmute: 'Quitar el silencio a un usuario',
      kick: 'Expulsar a un usuario del servidor',
      historial: 'Ver el historial de moderación de un usuario',
    },
  },
  purgar: {
    desc: 'Eliminar mensajes masivamente con filtros (usuario, bots, embeds, archivos, etc.)',
  },
  rolreaccion: {
    desc: 'Gestionar roles por botones de reacción',
    subs: {
      crear: 'Crear un nuevo panel de roles por reacción',
      agregar: 'Agregar un botón de rol a un panel',
      quitar: 'Quitar un botón de rol de un panel',
      lista: 'Listar todos los paneles de roles por reacción',
    },
  },
  rol: {
    desc: 'Gestionar roles de los miembros',
    subs: {
      dar: 'Dar un rol a un miembro',
      quitar: 'Quitar un rol a un miembro',
      todos: 'Dar o quitar un rol a todos los miembros',
      info: 'Ver información sobre un rol',
    },
  },
  modolento: {
    desc: 'Establecer o quitar el modo lento de un canal',
  },
  verificacion: {
    desc: 'Verificar un usuario: asigna rol, anuncia y guarda transcripción',
  },

  // ─── Utilidades ─────────────────────────
  ayuda: {
    desc: 'Ver todos los comandos e información del bot',
  },
  anunciar: {
    desc: 'Enviar un anuncio formateado con embed, menciones e imagen',
  },
  embed: {
    desc: 'Crear y gestionar embeds personalizados',
    subs: {
      enviar: 'Enviar un embed personalizado a un canal',
      editar: 'Editar un embed existente enviado por el bot',
    },
  },
  hablar: {
    desc: 'Hacer que el bot envíe un mensaje (texto e imágenes) en un canal',
  },
  snipe: {
    desc: 'Ver el último mensaje eliminado en un canal',
  },
  recordatorio: {
    desc: 'Gestionar recordatorios personales',
    subs: {
      crear: 'Crear un nuevo recordatorio',
      lista: 'Ver tus recordatorios activos',
      eliminar: 'Eliminar un recordatorio',
    },
  },
  servidor: {
    desc: 'Ver información detallada sobre el servidor',
  },
  usuario: {
    desc: 'Ver información sobre un usuario',
  },

  // ─── Mensajes Fijos ─────────────────────
  fijo: {
    desc: 'Gestionar mensajes fijos que se mantienen al final del canal',
    subs: {
      establecer: 'Establecer un mensaje fijo en un canal',
      quitar: 'Quitar el mensaje fijo de un canal',
      lista: 'Listar todos los mensajes fijos del servidor',
    },
  },

  // ─── Social / AFK ──────────────────────
  afk: {
    desc: 'Gestionar tu estado AFK',
    subs: {
      establecer: 'Ponerte como AFK con una razón opcional',
      quitar: 'Quitar tu estado AFK',
    },
  },
  sorteo: {
    desc: 'Sistema de sorteos',
    subs: {
      iniciar: 'Iniciar un nuevo sorteo',
      finalizar: 'Finalizar un sorteo antes de tiempo',
      relista: 'Volver a sortear ganadores',
      lista: 'Listar sorteos activos',
    },
  },
  sugerencia: {
    desc: 'Sistema de sugerencias',
    subs: {
      crear: 'Enviar una nueva sugerencia',
      aprobar: 'Aprobar una sugerencia (solo mods)',
      rechazar: 'Rechazar una sugerencia (solo mods)',
      estado: 'Ver el estado de una sugerencia',
    },
  },

  // ─── Automatización ─────────────────────
  autorespuesta: {
    desc: 'Gestionar autorespuestas automáticas',
    subs: {
      agregar: 'Agregar una autorespuesta',
      lista: 'Listar todas las autorespuestas',
      eliminar: 'Eliminar una autorespuesta',
    },
  },
  encuesta: {
    desc: 'Crear y gestionar encuestas',
    subs: {
      crear: 'Crear una nueva encuesta',
      finalizar: 'Finalizar una encuesta activa',
    },
  },
  programar: {
    desc: 'Gestionar mensajes programados (cron)',
    subs: {
      agregar: 'Agregar un mensaje programado',
      lista: 'Listar todos los mensajes programados',
      eliminar: 'Eliminar un mensaje programado',
    },
  },

  // ─── Configuración ─────────────────────
  configuracion: {
    desc: 'Configuración general del bot',
    subs: {
      'modulo activar': 'Activar un módulo',
      'modulo desactivar': 'Desactivar un módulo',
      'modulo estado': 'Ver el estado de los módulos',
    },
  },

  // ─── Invitaciones ──────────────────────
  invitaciones: {
    desc: 'Seguimiento de invitaciones',
    subs: {
      info: 'Ver estadísticas de invitaciones de un usuario',
      ranking: 'Ver el ranking de invitaciones',
      quien: 'Ver quién invitó a un usuario',
      reiniciar: 'Reiniciar las invitaciones de un usuario',
    },
  },

  // ─── Respaldos ─────────────────────────
  respaldo: {
    desc: 'Gestión de respaldos del servidor',
    subs: {
      crear: 'Crear un respaldo del servidor',
      lista: 'Listar todos los respaldos',
      restaurar: 'Restaurar un respaldo (destructivo)',
      eliminar: 'Eliminar un respaldo',
    },
  },

  // ─── Reputación ────────────────────────
  rep: {
    desc: 'Dar reputación a un usuario (atajo rápido)',
  },
  reputacion: {
    desc: 'Gestionar reputación',
    subs: {
      ver: 'Ver la reputación de un usuario',
      ranking: 'Ver el ranking de reputación',
      historial: 'Ver historial de rep dada/recibida',
    },
  },

  // ─── Tickets ───────────────────────────
  ticket: {
    desc: 'Sistema completo de tickets',
    subs: {
      panel: 'Gestionar paneles de tickets',
      cerrar: 'Cerrar un ticket',
      añadir: 'Añadir un usuario al ticket',
      quitar: 'Quitar un usuario del ticket',
      prioridad: 'Cambiar la prioridad del ticket',
      renombrar: 'Renombrar el ticket',
      reclamar: 'Reclamar un ticket',
      transferir: 'Transferir un ticket a otro staff',
    },
  },
};

export default {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Ver todos los comandos e información del bot')
    .addStringOption((opt) =>
      opt
        .setName('comando')
        .setDescription('Obtener ayuda detallada de un comando específico')
        .setRequired(false)
    ),
  cooldown: 5,
  module: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as BotClient;
    const specificCommand = interaction.options.getString('comando');

    // ─── Specific command help ────────────────────────
    if (specificCommand) {
      const cmdName = specificCommand.toLowerCase().replace('/', '');
      const command = client.commands.get(cmdName);
      const details = commandDetails[cmdName];

      if (!command) {
        await interaction.reply({ content: `Comando \`/${cmdName}\` no encontrado.`, ephemeral: true });
        return;
      }

      const mod = command.module || 'utility';
      const emoji = moduleEmojis[mod] || '📦';
      const modName = moduleNames[mod] || mod;

      const embed = new EmbedBuilder()
        .setColor(moduleColor(mod))
        .setTitle(`${emoji} /${command.data.name}`)
        .setDescription(details?.desc || command.data.description)
        .addFields(
          { name: '📁 Módulo', value: modName, inline: true },
          { name: '⏱️ Cooldown', value: `${command.cooldown || 3}s`, inline: true },
        );

      // Show subcommands if available
      if (details?.subs) {
        const subsText = Object.entries(details.subs)
          .map(([sub, desc]) => `\`/${cmdName} ${sub}\`\n╰ ${desc}`)
          .join('\n\n');
        embed.addFields({ name: '📋 Subcomandos', value: subsText, inline: false });
      }

      // Show permissions if any
      if (command.permissions && command.permissions.length > 0) {
        embed.addFields({
          name: '🔒 Permisos requeridos',
          value: 'Requiere permisos de administración/moderación',
          inline: false,
        });
      }

      embed.setFooter({ text: 'Usa /ayuda para ver todos los módulos' }).setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ─── Main help view ───────────────────────────────

    // Organize commands by module
    const modules: Record<string, { name: string; description: string; hasSubs: boolean }[]> = {};

    for (const [, cmd] of client.commands) {
      const mod = cmd.module || 'utility';
      if (!modules[mod]) modules[mod] = [];
      const details = commandDetails[cmd.data.name];
      modules[mod].push({
        name: `/${cmd.data.name}`,
        description: cmd.data.description,
        hasSubs: !!(details?.subs && Object.keys(details.subs).length > 0),
      });
    }

    // Sort modules in a logical order
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

    // Build fields for main embed
    const fields = sortedModules.map(([mod, cmds]) => {
      const emoji = moduleEmojis[mod] || '📦';
      const cmdList = cmds.map((c) => `\`${c.name}\``).join(' ');
      return {
        name: `${emoji} ${moduleNames[mod] || mod.charAt(0).toUpperCase() + mod.slice(1)} (${cmds.length})`,
        value: cmdList,
        inline: false,
      };
    });

    const totalCommands = client.commands.size;

    const mainEmbed = new EmbedBuilder()
      .setColor(moduleColor('default'))
      .setAuthor({
        name: `${client.user?.username || 'Vapiano Bot'} — Centro de Ayuda`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setDescription(
        `Bienvenido al centro de ayuda de **${client.user?.username || 'Vapiano Bot'}**.\n\n` +
        `📌 Usa el **menú desplegable** para ver los comandos de cada módulo en detalle.\n` +
        `📌 Usa \`/ayuda comando:<nombre>\` para ver detalles y subcomandos de un comando específico.\n` +
        `📌 También puedes usar \`+rep @usuario\` en el chat para dar reputación.\n\n` +
        `**Dashboard**: Gestiona tu servidor desde el panel web con todas las opciones.`
      )
      .addFields(fields)
      .setFooter({ text: `${totalCommands} comandos en ${sortedModules.length} módulos • Selecciona un módulo ↓` })
      .setTimestamp();

    // Build select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ayuda_modulo')
      .setPlaceholder('📂 Selecciona un módulo para ver detalles...')
      .addOptions(
        sortedModules.map(([mod, cmds]) => ({
          label: moduleNames[mod] || mod.charAt(0).toUpperCase() + mod.slice(1),
          description: `${cmds.length} comando${cmds.length !== 1 ? 's' : ''} — Ver detalles y subcomandos`,
          value: mod,
          emoji: moduleEmojis[mod] || '📦',
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const reply = await interaction.reply({ embeds: [mainEmbed], components: [row] });

    // Collector for module selection (3 minutes)
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (menuInteraction: StringSelectMenuInteraction) => {
      const selectedMod = menuInteraction.values[0];
      const cmds = modules[selectedMod];
      if (!cmds) return;

      const emoji = moduleEmojis[selectedMod] || '📦';
      const modName = moduleNames[selectedMod] || selectedMod.charAt(0).toUpperCase() + selectedMod.slice(1);

      // Build detailed command list with subcommands
      const commandLines: string[] = [];
      for (const cmd of cmds) {
        const cmdName = cmd.name.replace('/', '');
        const details = commandDetails[cmdName];
        const desc = details?.desc || cmd.description;

        commandLines.push(`**${cmd.name}** — ${desc}`);

        if (details?.subs) {
          for (const [sub, subDesc] of Object.entries(details.subs)) {
            commandLines.push(`  ╰ \`${cmd.name} ${sub}\` — ${subDesc}`);
          }
        }

        commandLines.push(''); // blank line separator
      }

      const moduleEmbed = new EmbedBuilder()
        .setColor(moduleColor(selectedMod))
        .setTitle(`${emoji} Módulo: ${modName}`)
        .setDescription(commandLines.join('\n').trim())
        .setFooter({ text: `Usa /ayuda comando:<nombre> para más detalles de un comando específico` })
        .setTimestamp();

      await menuInteraction.update({ embeds: [moduleEmbed], components: [row] });
    });

    collector.on('end', () => {
      selectMenu.setDisabled(true);
      reply.edit({
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
      }).catch(() => {});
    });
  },
};
