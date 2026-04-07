import { Router, Response } from 'express';
import { REST, Routes } from 'discord.js';
import { z } from 'zod';
import prisma from '../../database/client';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';

export const commandsRouter = Router({ mergeParams: true });
commandsRouter.use(requireAuth as any, requireGuildAccess as any);

export interface CommandEntry {
  name: string;       // unique key: "ban" or "mod advertir"
  parent?: string;    // parent command name if this is a subcommand
  subcommand?: string;
  module: string;
  description: string;
}

// All commands and subcommands the bot exposes
export const ALL_COMMANDS: CommandEntry[] = [
  // ── Moderation ──────────────────────────────────────────────────────────────
  { name: 'ban',                           module: 'moderation', description: 'Banear a un usuario permanentemente' },
  { name: 'limpiar',                       module: 'moderation', description: 'Eliminar mensajes en el canal actual' },
  { name: 'mod advertir',   parent: 'mod', subcommand: 'advertir',           module: 'moderation', description: 'Advertir a un usuario' },
  { name: 'mod silenciar',  parent: 'mod', subcommand: 'silenciar',          module: 'moderation', description: 'Silenciar a un usuario' },
  { name: 'mod desilenciar',parent: 'mod', subcommand: 'desilenciar',        module: 'moderation', description: 'Quitar silencio a un usuario' },
  { name: 'mod banear',     parent: 'mod', subcommand: 'banear',             module: 'moderation', description: 'Banear (con registro de infracción)' },
  { name: 'mod ban-temporal',parent: 'mod',subcommand: 'ban-temporal',       module: 'moderation', description: 'Ban temporal con duración' },
  { name: 'mod desbanear',  parent: 'mod', subcommand: 'desbanear',          module: 'moderation', description: 'Desbanear a un usuario' },
  { name: 'mod expulsar',   parent: 'mod', subcommand: 'expulsar',           module: 'moderation', description: 'Expulsar (kick) a un usuario' },
  { name: 'mod bloquear',   parent: 'mod', subcommand: 'bloquear',           module: 'moderation', description: 'Bloquear a un usuario de un canal' },
  { name: 'mod desbloquear',parent: 'mod', subcommand: 'desbloquear',        module: 'moderation', description: 'Desbloquear a un usuario de un canal' },
  { name: 'mod advertencias',parent:'mod', subcommand: 'advertencias',       module: 'moderation', description: 'Ver advertencias de un usuario' },
  { name: 'mod historial',  parent: 'mod', subcommand: 'historial',          module: 'moderation', description: 'Ver historial de sanciones' },
  { name: 'mod limpiar-advertencias',parent:'mod',subcommand:'limpiar-advertencias',module:'moderation',description:'Limpiar advertencias de un usuario'},
  { name: 'purgar',                        module: 'moderation', description: 'Eliminar mensajes en todos los canales' },
  { name: 'rolreaccion crear',   parent: 'rolreaccion', subcommand: 'crear',   module: 'moderation', description: 'Crear panel de roles por botón' },
  { name: 'rolreaccion agregar', parent: 'rolreaccion', subcommand: 'agregar', module: 'moderation', description: 'Agregar rol a un panel existente' },
  { name: 'rolreaccion eliminar',parent: 'rolreaccion', subcommand: 'eliminar',module: 'moderation', description: 'Eliminar un panel de roles' },
  { name: 'rolreaccion emoji',   parent: 'rolreaccion', subcommand: 'emoji',   module: 'moderation', description: 'Cambiar emoji de un rol en panel' },
  { name: 'rolreaccion lista',   parent: 'rolreaccion', subcommand: 'lista',   module: 'moderation', description: 'Listar paneles de roles' },
  { name: 'rol dar',    parent: 'rol', subcommand: 'dar',    module: 'moderation', description: 'Dar un rol a un miembro' },
  { name: 'rol quitar', parent: 'rol', subcommand: 'quitar', module: 'moderation', description: 'Quitar un rol a un miembro' },
  { name: 'rol todos',  parent: 'rol', subcommand: 'todos',  module: 'moderation', description: 'Dar/quitar rol a todos los miembros' },
  { name: 'rol info',   parent: 'rol', subcommand: 'info',   module: 'moderation', description: 'Info de un rol' },
  { name: 'modolento',                     module: 'moderation', description: 'Activar modo lento en un canal' },
  { name: 'verificacion',                  module: 'moderation', description: 'Verificar a un usuario manualmente' },
  { name: 'hackeado',                      module: 'moderation', description: 'Aislar cuenta comprometida y borrar spam' },
  // ── Utility ─────────────────────────────────────────────────────────────────
  { name: 'perfil', module: 'utility', description: 'Perfil de un miembro: rep, invitaciones, historial' },
  { name: 'ayuda',                         module: 'utility', description: 'Centro de ayuda del bot' },
  { name: 'anunciar',                      module: 'utility', description: 'Enviar anuncio con embed' },
  { name: 'embed enviar', parent: 'embed', subcommand: 'enviar', module: 'utility', description: 'Enviar embed personalizado' },
  { name: 'embed editar', parent: 'embed', subcommand: 'editar', module: 'utility', description: 'Editar embed existente' },
  { name: 'hablar',                        module: 'utility', description: 'El bot envía un mensaje en un canal' },
  { name: 'snipe',                         module: 'utility', description: 'Ver el último mensaje eliminado' },
  { name: 'recordatorio crear',   parent: 'recordatorio', subcommand: 'crear',   module: 'utility', description: 'Crear un recordatorio' },
  { name: 'recordatorio eliminar',parent: 'recordatorio', subcommand: 'eliminar',module: 'utility', description: 'Eliminar un recordatorio' },
  { name: 'recordatorio lista',   parent: 'recordatorio', subcommand: 'lista',   module: 'utility', description: 'Ver tus recordatorios' },
  { name: 'servidor',                      module: 'utility', description: 'Información del servidor' },
  { name: 'usuario',                       module: 'utility', description: 'Información de un usuario' },
  { name: 'fijo establecer', parent: 'fijo', subcommand: 'establecer', module: 'utility', description: 'Fijar un mensaje en un canal' },
  { name: 'fijo quitar',     parent: 'fijo', subcommand: 'quitar',     module: 'utility', description: 'Quitar mensaje fijo' },
  { name: 'fijo lista',      parent: 'fijo', subcommand: 'lista',      module: 'utility', description: 'Listar mensajes fijos' },
  // ── Social ──────────────────────────────────────────────────────────────────
  { name: 'afk establecer', parent: 'afk', subcommand: 'establecer', module: 'social', description: 'Activar estado AFK' },
  { name: 'afk quitar',     parent: 'afk', subcommand: 'quitar',     module: 'social', description: 'Desactivar estado AFK' },
  { name: 'sorteo iniciar',  parent: 'sorteo', subcommand: 'iniciar',  module: 'social', description: 'Iniciar un sorteo' },
  { name: 'sorteo finalizar',parent: 'sorteo', subcommand: 'finalizar',module: 'social', description: 'Finalizar un sorteo' },
  { name: 'sorteo resortear',parent: 'sorteo', subcommand: 'resortear',module: 'social', description: 'Repetir sorteo de ganador' },
  { name: 'sorteo lista',    parent: 'sorteo', subcommand: 'lista',    module: 'social', description: 'Listar sorteos activos' },
  { name: 'sugerencia crear',      parent: 'sugerencia', subcommand: 'crear',      module: 'social', description: 'Crear una sugerencia' },
  { name: 'sugerencia aprobar',    parent: 'sugerencia', subcommand: 'aprobar',    module: 'social', description: 'Aprobar una sugerencia' },
  { name: 'sugerencia rechazar',   parent: 'sugerencia', subcommand: 'rechazar',   module: 'social', description: 'Rechazar una sugerencia' },
  { name: 'sugerencia implementar',parent: 'sugerencia', subcommand: 'implementar',module: 'social', description: 'Marcar sugerencia como implementada' },
  { name: 'sugerencia lista',      parent: 'sugerencia', subcommand: 'lista',      module: 'social', description: 'Listar sugerencias recientes' },
  { name: 'rifa crear',    parent: 'rifa', subcommand: 'crear',    module: 'social', description: 'Crear una rifa' },
  { name: 'rifa info',     parent: 'rifa', subcommand: 'info',     module: 'social', description: 'Info de la rifa activa' },
  { name: 'rifa listar',   parent: 'rifa', subcommand: 'listar',   module: 'social', description: 'Ver participantes de la rifa' },
  { name: 'rifa sortear',  parent: 'rifa', subcommand: 'sortear',  module: 'social', description: 'Realizar el sorteo (staff)' },
  { name: 'rifa cancelar', parent: 'rifa', subcommand: 'cancelar', module: 'social', description: 'Cancelar la rifa activa (staff)' },
  { name: 'rifa inscribir',parent: 'rifa', subcommand: 'inscribir',module: 'social', description: 'Inscribir usuario manualmente (staff)' },
  { name: 'rifa quitar',   parent: 'rifa', subcommand: 'quitar',   module: 'social', description: 'Quitar usuario de la rifa (staff)' },
  { name: 'rifa reroll',   parent: 'rifa', subcommand: 'reroll',   module: 'social', description: 'Repetir el sorteo de la última rifa (staff)' },
  { name: 'rifa historial',parent: 'rifa', subcommand: 'historial',module: 'social', description: 'Ver rifas anteriores' },
  // ── Automation ──────────────────────────────────────────────────────────────
  { name: 'encuesta crear',    parent: 'encuesta', subcommand: 'crear',    module: 'automation', description: 'Crear una encuesta' },
  { name: 'encuesta finalizar',parent: 'encuesta', subcommand: 'finalizar',module: 'automation', description: 'Finalizar una encuesta' },
  { name: 'autorespuesta agregar', parent: 'autorespuesta', subcommand: 'agregar', module: 'automation', description: 'Agregar autorespuesta' },
  { name: 'autorespuesta eliminar',parent: 'autorespuesta', subcommand: 'eliminar',module: 'automation', description: 'Eliminar autorespuesta' },
  { name: 'autorespuesta alternar',parent: 'autorespuesta', subcommand: 'alternar',module: 'automation', description: 'Activar/desactivar autorespuesta' },
  { name: 'autorespuesta lista',   parent: 'autorespuesta', subcommand: 'lista',   module: 'automation', description: 'Listar autorespuestas' },
  { name: 'programar agregar', parent: 'programar', subcommand: 'agregar', module: 'automation', description: 'Programar un mensaje' },
  { name: 'programar eliminar',parent: 'programar', subcommand: 'eliminar',module: 'automation', description: 'Eliminar mensaje programado' },
  { name: 'programar alternar',parent: 'programar', subcommand: 'alternar',module: 'automation', description: 'Activar/desactivar mensaje programado' },
  { name: 'programar lista',   parent: 'programar', subcommand: 'lista',   module: 'automation', description: 'Listar mensajes programados' },
  // ── Config ──────────────────────────────────────────────────────────────────
  { name: 'configuracion establecer', parent: 'configuracion', subcommand: 'establecer', module: 'config', description: 'Establecer canal/ajuste' },
  { name: 'configuracion modulo',     parent: 'configuracion', subcommand: 'modulo',     module: 'config', description: 'Activar/desactivar módulo' },
  { name: 'configuracion automod',    parent: 'configuracion', subcommand: 'automod',    module: 'config', description: 'Configurar automod' },
  { name: 'configuracion estado',     parent: 'configuracion', subcommand: 'estado',     module: 'config', description: 'Ver estado de módulos' },
  // ── Invites ──────────────────────────────────────────────────────────────────
  { name: 'invitaciones ranking',  parent: 'invitaciones', subcommand: 'ranking',  module: 'invites', description: 'Ranking de invitaciones' },
  { name: 'invitaciones info',     parent: 'invitaciones', subcommand: 'info',     module: 'invites', description: 'Info de invitaciones de un usuario' },
  { name: 'invitaciones quien',    parent: 'invitaciones', subcommand: 'quien',    module: 'invites', description: 'Ver quién invitó a un usuario' },
  { name: 'invitaciones reiniciar',parent: 'invitaciones', subcommand: 'reiniciar',module: 'invites', description: 'Reiniciar invitaciones de un usuario' },
  // ── Tickets ──────────────────────────────────────────────────────────────────
  { name: 'ticket panel',           parent: 'ticket', subcommand: 'panel',           module: 'tickets', description: 'Gestionar paneles de tickets' },
  { name: 'ticket nuevo',           parent: 'ticket', subcommand: 'nuevo',           module: 'tickets', description: 'Abrir un ticket nuevo' },
  { name: 'ticket cerrar',          parent: 'ticket', subcommand: 'cerrar',          module: 'tickets', description: 'Cerrar el ticket actual' },
  { name: 'ticket reabrir',         parent: 'ticket', subcommand: 'reabrir',         module: 'tickets', description: 'Reabrir un ticket cerrado' },
  { name: 'ticket eliminar',        parent: 'ticket', subcommand: 'eliminar',        module: 'tickets', description: 'Eliminar canal de ticket' },
  { name: 'ticket agregar',         parent: 'ticket', subcommand: 'agregar',         module: 'tickets', description: 'Añadir usuario al ticket' },
  { name: 'ticket quitar',          parent: 'ticket', subcommand: 'quitar',          module: 'tickets', description: 'Quitar usuario del ticket' },
  { name: 'ticket asignar',         parent: 'ticket', subcommand: 'asignar',         module: 'tickets', description: 'Asignarte el ticket como staff' },
  { name: 'ticket desasignar',      parent: 'ticket', subcommand: 'desasignar',      module: 'tickets', description: 'Liberar asignación del ticket' },
  { name: 'ticket transcripcion',   parent: 'ticket', subcommand: 'transcripcion',   module: 'tickets', description: 'Generar transcripción del ticket' },
  { name: 'ticket renombrar',       parent: 'ticket', subcommand: 'renombrar',       module: 'tickets', description: 'Renombrar el canal del ticket' },
  { name: 'ticket prioridad',       parent: 'ticket', subcommand: 'prioridad',       module: 'tickets', description: 'Cambiar prioridad del ticket' },
  { name: 'ticket escalar',         parent: 'ticket', subcommand: 'escalar',         module: 'tickets', description: 'Escalar ticket a nivel superior' },
  { name: 'ticket solicitar-cierre',parent: 'ticket', subcommand: 'solicitar-cierre',module: 'tickets', description: 'Solicitar cierre del ticket (usuario)' },
  { name: 'ticket vapiano',         parent: 'ticket', subcommand: 'vapiano',         module: 'tickets', description: 'Gestión especial Vapiano' },
  { name: 'ticket hubstore',        parent: 'ticket', subcommand: 'hubstore',        module: 'tickets', description: 'Gestión especial HubStore' },
  // ── Reputation ──────────────────────────────────────────────────────────────
  { name: 'rep',                            module: 'reputation', description: 'Dar reputación (+1) a un usuario' },
  { name: 'reputacion ver',      parent: 'reputacion', subcommand: 'ver',      module: 'reputation', description: 'Ver reputación de un usuario' },
  { name: 'reputacion ranking',  parent: 'reputacion', subcommand: 'ranking',  module: 'reputation', description: 'Ver el ranking global de reputación' },
  { name: 'reputacion historial',parent: 'reputacion', subcommand: 'historial',module: 'reputation', description: 'Ver historial de rep dada/recibida' },
  { name: 'reputacion quitar',   parent: 'reputacion', subcommand: 'quitar',   module: 'reputation', description: 'Quitar reputación a un usuario (mods)' },
  { name: 'reputacion reiniciar',parent: 'reputacion', subcommand: 'reiniciar',module: 'reputation', description: 'Reiniciar toda la rep de un usuario (admins)' },
  // ── Backup ───────────────────────────────────────────────────────────────────
  { name: 'respaldo crear',    parent: 'respaldo', subcommand: 'crear',    module: 'backup', description: 'Crear respaldo del servidor' },
  { name: 'respaldo restaurar',parent: 'respaldo', subcommand: 'restaurar',module: 'backup', description: 'Restaurar un respaldo' },
  { name: 'respaldo lista',    parent: 'respaldo', subcommand: 'lista',    module: 'backup', description: 'Listar respaldos disponibles' },
  { name: 'respaldo info',     parent: 'respaldo', subcommand: 'info',     module: 'backup', description: 'Información de un respaldo' },
  { name: 'respaldo eliminar', parent: 'respaldo', subcommand: 'eliminar', module: 'backup', description: 'Eliminar un respaldo' },
];

// GET /api/guilds/:guildId/commands — list all commands with their permission config
commandsRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const stored = await prisma.commandPermission.findMany({ where: { guildId } });
  const storedMap = Object.fromEntries(stored.map(r => [r.command, r]));

  const result = ALL_COMMANDS.map(cmd => ({
    ...cmd,
    disabled: storedMap[cmd.name]?.disabled ?? false,
    roleIds:  storedMap[cmd.name]?.roleIds ?? [],
  }));

  res.json(result);
}));

// PATCH /api/guilds/:guildId/commands/:command — update permissions
const updateSchema = z.object({
  disabled: z.boolean().optional(),
  roleIds:  z.array(z.string().regex(/^\d{17,20}$/)).optional(),
});

commandsRouter.patch('*', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const raw = req.path.startsWith('/') ? req.path.slice(1) : req.path;
  const command = decodeURIComponent(raw);
  const body = updateSchema.parse(req.body);

  const perm = await prisma.commandPermission.upsert({
    where:  { guildId_command: { guildId, command } },
    update: body,
    create: { guildId, command, disabled: body.disabled ?? false, roleIds: body.roleIds ?? [] },
  });

  // Bulk sync ALL command permissions with Discord using bearer token
  if (req.user?.accessToken) {
    syncDiscordPermissions(guildId, req.user.accessToken).catch(err =>
      console.error('[Discord sync]', err?.message ?? err)
    );
  }

  res.json(perm);
}));

// POST /api/guilds/:guildId/commands/sync — manual full sync trigger
commandsRouter.post('/sync', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  if (!req.user?.accessToken) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }
  await syncDiscordPermissions(guildId, req.user.accessToken);
  res.json({ ok: true });
}));

async function syncDiscordPermissions(guildId: string, bearerToken: string): Promise<void> {
  const appId   = process.env.CLIENT_ID!;
  const botRest  = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
  const userRest = new REST({ version: '10', authPrefix: 'Bearer' }).setToken(bearerToken);

  // Fetch Discord guild commands (need their IDs)
  const guildCmds = await botRest.get(Routes.applicationGuildCommands(appId, guildId)) as any[];
  const cmdIdMap: Record<string, string> = Object.fromEntries(
    guildCmds.map((c: any) => [c.name as string, c.id as string])
  );

  // Fetch all saved permissions from DB
  const allPerms = await prisma.commandPermission.findMany({ where: { guildId } });

  // Build bulk permissions body — one entry per PARENT command
  const seen = new Set<string>();
  const bulkBody: { id: string; permissions: { id: string; type: number; permission: boolean }[] }[] = [];

  for (const p of allPerms) {
    const parentName = p.command.split(' ')[0];
    if (seen.has(parentName)) continue;
    seen.add(parentName);

    const cmdId = cmdIdMap[parentName];
    if (!cmdId) continue;

    // Collect roleIds from all subcommands of this parent OR the parent itself
    const related = allPerms.filter(x => x.command.split(' ')[0] === parentName && !x.disabled);
    const roleIds = [...new Set(related.flatMap(x => x.roleIds))];
    if (roleIds.length === 0) continue;

    bulkBody.push({
      id: cmdId,
      permissions: roleIds.map(id => ({ id, type: 1, permission: true })),
    });
  }

  // Send bulk update (requires Bearer token with applications.commands.permissions.update)
  await userRest.put(Routes.guildApplicationCommandsPermissions(appId, guildId), { body: bulkBody });
}
