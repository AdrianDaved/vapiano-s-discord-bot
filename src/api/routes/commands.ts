import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../database/client';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';

export const commandsRouter = Router({ mergeParams: true });
commandsRouter.use(requireAuth as any, requireGuildAccess as any);

// All commands the bot exposes — used by dashboard to build the list
export const ALL_COMMANDS = [
  { name: 'ban',           module: 'moderation',  description: 'Banear a un usuario permanentemente' },
  { name: 'limpiar',       module: 'moderation',  description: 'Eliminar mensajes del canal actual' },
  { name: 'mod',           module: 'moderation',  description: 'Advertir, mutear, kickear, historial' },
  { name: 'purgar',        module: 'moderation',  description: 'Eliminar mensajes en todos los canales' },
  { name: 'rolreaccion',   module: 'moderation',  description: 'Paneles de roles por botón' },
  { name: 'rol',           module: 'moderation',  description: 'Dar/quitar roles a miembros' },
  { name: 'modolento',     module: 'moderation',  description: 'Modo lento en un canal' },
  { name: 'verificacion',  module: 'moderation',  description: 'Verificar un usuario' },
  { name: 'hackeado',      module: 'moderation',  description: 'Aislar cuenta comprometida y borrar spam' },
  { name: 'ayuda',         module: 'utility',     description: 'Centro de ayuda del bot' },
  { name: 'anunciar',      module: 'utility',     description: 'Enviar anuncio con embed' },
  { name: 'embed',         module: 'utility',     description: 'Crear/editar embeds personalizados' },
  { name: 'hablar',        module: 'utility',     description: 'El bot envía un mensaje en un canal' },
  { name: 'snipe',         module: 'utility',     description: 'Ver el último mensaje eliminado' },
  { name: 'recordatorio',  module: 'utility',     description: 'Recordatorios personales' },
  { name: 'servidor',      module: 'utility',     description: 'Info del servidor' },
  { name: 'usuario',       module: 'utility',     description: 'Info de un usuario' },
  { name: 'fijo',          module: 'utility',     description: 'Mensajes fijos en canales' },
  { name: 'afk',           module: 'social',      description: 'Estado AFK' },
  { name: 'sorteo',        module: 'social',      description: 'Sistema de sorteos' },
  { name: 'sugerencia',    module: 'social',      description: 'Sistema de sugerencias' },
  { name: 'rifa',          module: 'social',      description: 'Sistema de rifas por slots' },
  { name: 'encuesta',      module: 'automation',  description: 'Crear y gestionar encuestas' },
  { name: 'autorespuesta', module: 'automation',  description: 'Respuestas automáticas' },
  { name: 'programar',     module: 'automation',  description: 'Mensajes programados' },
  { name: 'configuracion', module: 'config',      description: 'Configuración del bot' },
  { name: 'invitaciones',  module: 'invites',     description: 'Seguimiento de invitaciones' },
  { name: 'ticket',        module: 'tickets',     description: 'Sistema de tickets' },
  { name: 'rep',           module: 'reputation',  description: 'Dar reputación (+1)' },
  { name: 'reputacion',    module: 'reputation',  description: 'Ver/gestionar reputación' },
  { name: 'respaldo',      module: 'backup',      description: 'Respaldos del servidor' },
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

commandsRouter.patch('/:command', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const command = req.params.command as string;
  const body = updateSchema.parse(req.body);

  const perm = await prisma.commandPermission.upsert({
    where:  { guildId_command: { guildId, command } },
    update: body,
    create: { guildId, command, disabled: body.disabled ?? false, roleIds: body.roleIds ?? [] },
  });

  res.json(perm);
}));
