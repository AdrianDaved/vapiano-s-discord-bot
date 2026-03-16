/**
 * Configure the 4 marketplace ticket panels:
 * - Set correct channelId, categoryId, closedCategoryId
 * - Copy welcome messages from existing open tickets in each category
 * - Redeploy the panel message to the correct channel
 */
import { Client, GatewayIntentBits, ChannelType, TextChannel, EmbedBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import prisma from '../src/database/client';
import 'dotenv/config';

const GUILD_ID = '1420045220325625898';

// Panel button channel (🎟️│𝐓𝐢𝐜𝐤𝐞𝐭𝐬)
const TICKET_BUTTON_CHANNEL = '1420056046088622211';

// Closed category (shared for all)
const CLOSED_CATEGORY = '1474504995205419302';

// Old message to delete (wrong channel)
const OLD_MESSAGE_ID = '1482937410043121674';
const OLD_CHANNEL_ID = '1420907241124663297';

const PANELS = [
  {
    id: 'd8c6144b-8cb7-49d3-a997-f340363b7898',
    name: 'Mediación',
    emoji: '⚖️',
    categoryId: '1420597419334307870',
    defaultWelcome: '¡Bienvenido/a a tu ticket de **Mediación**, {user}!\n\nUn mediador estará contigo en breve. Por favor, describe detalladamente el conflicto que quieres mediar, incluyendo:\n- Las partes involucradas\n- Qué ocurrió\n- Qué solución buscas\n\n> Sé respetuoso/a durante todo el proceso.',
  },
  {
    id: 'f08c9ff9-899f-492d-9290-be4399366602',
    name: 'Soporte',
    emoji: '🎧',
    categoryId: '1420806911866962030',
    defaultWelcome: '¡Bienvenido/a a tu ticket de **Soporte**, {user}!\n\nUn miembro del staff te atenderá en breve. Por favor, explica tu consulta o problema con el mayor detalle posible:\n- ¿Qué ocurrió?\n- ¿Cuándo ocurrió?\n- ¿Qué necesitas?\n\n> Mantén un trato respetuoso. Tickets con spam o faltas de respeto serán cerrados.',
  },
  {
    id: '3a1afdc4-f764-45c0-9a84-6bafeea7a3ac',
    name: 'Verificación OOC',
    emoji: '✅',
    categoryId: '1474505727862378619',
    defaultWelcome: '¡Bienvenido/a a tu ticket de **Verificación OOC**, {user}!\n\nUn miembro del staff revisará tu solicitud en breve. Para completar la verificación, proporciona:\n- Tu nombre/alias de personaje\n- Información necesaria para la verificación\n- Cualquier otro dato relevante\n\n> Por favor sé paciente, el proceso puede tardar unos minutos.',
  },
  {
    id: '1293ce10-a894-4f69-a8e2-b53bfc6889e1',
    name: 'Estafas',
    emoji: '🐀',
    categoryId: '1420598305880014872',
    defaultWelcome: '¡Bienvenido/a a tu ticket de **Reporte de Estafas**, {user}!\n\nUn miembro del staff revisará tu caso en breve. Para procesar tu reporte, necesitamos:\n- Nombre del acusado\n- Descripción detallada de lo ocurrido\n- Pruebas (capturas de pantalla, etc.)\n- Monto o bienes involucrados\n\n> Los reportes falsos tendrán consecuencias. Adjunta las pruebas necesarias.',
  },
];

const BUTTON_STYLE: Record<string, number> = {
  Primary: 1, Secondary: 2, Success: 3, Danger: 4,
  primary: 1, secondary: 2, success: 3, danger: 4,
};

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });
  await client.login(process.env.BOT_TOKEN);
  await new Promise<void>((r) => client.once('ready', r));
  console.log('✅ Bot conectado como', client.user?.tag);

  const guild = await client.guilds.fetch(GUILD_ID);
  const channels = await guild.channels.fetch();

  // Step 1: Try to copy welcome messages from existing open tickets
  console.log('\n═══ Buscando mensajes de bienvenida en tickets existentes ═══');

  const welcomeMessages: Record<string, string> = {};

  for (const panel of PANELS) {
    // Find open tickets in this panel's category
    const openTickets = await prisma.ticket.findMany({
      where: { guildId: GUILD_ID, panelId: panel.id, status: 'open' },
      take: 1,
    });

    if (openTickets.length > 0) {
      const t = openTickets[0];
      try {
        const ch = channels.get(t.channelId) as TextChannel | undefined;
        if (ch && ch.type === ChannelType.GuildText) {
          const msgs = await ch.messages.fetch({ limit: 5 });
          // Find first bot embed message (welcome message)
          const botMsg = msgs.find((m) => m.author.bot && m.embeds.length > 0);
          if (botMsg && botMsg.embeds[0].description) {
            // Remove mention replacement, keep template
            const desc = botMsg.embeds[0].description;
            console.log(`  [${panel.name}] Encontrado mensaje de bienvenida en ticket existente`);
            welcomeMessages[panel.id] = desc;
          } else {
            console.log(`  [${panel.name}] Sin embed en ticket existente, usando default`);
            welcomeMessages[panel.id] = panel.defaultWelcome;
          }
        } else {
          console.log(`  [${panel.name}] Canal de ticket no encontrado, usando default`);
          welcomeMessages[panel.id] = panel.defaultWelcome;
        }
      } catch (err) {
        console.log(`  [${panel.name}] Error leyendo canal: ${err}, usando default`);
        welcomeMessages[panel.id] = panel.defaultWelcome;
      }
    } else {
      console.log(`  [${panel.name}] Sin tickets abiertos, usando default`);
      welcomeMessages[panel.id] = panel.defaultWelcome;
    }
  }

  // Step 2: Update panel records in DB
  console.log('\n═══ Actualizando paneles en la base de datos ═══');

  for (const panel of PANELS) {
    await prisma.ticketPanel.update({
      where: { id: panel.id },
      data: {
        channelId: TICKET_BUTTON_CHANNEL,
        categoryId: panel.categoryId,
        closedCategoryId: CLOSED_CATEGORY,
        welcomeMessage: welcomeMessages[panel.id],
        welcomeTitle: `Ticket de ${panel.name}`,
      },
    });
    console.log(`  ✅ ${panel.name} — categoryId: ${panel.categoryId}`);
  }

  // Step 3: Delete old panel message from wrong channel
  console.log('\n═══ Eliminando mensaje antiguo ═══');
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
  try {
    await rest.delete(Routes.channelMessage(OLD_CHANNEL_ID, OLD_MESSAGE_ID));
    console.log(`  ✅ Mensaje antiguo eliminado de canal ${OLD_CHANNEL_ID}`);
  } catch (err: any) {
    console.log(`  ⚠️  No se pudo eliminar el mensaje antiguo: ${err?.rawError?.message || err?.message}`);
  }

  // Step 4: Build and send new panel message to correct channel
  console.log('\n═══ Enviando nuevo panel al canal correcto ═══');

  const panelRecords = await prisma.ticketPanel.findMany({
    where: { id: { in: PANELS.map((p) => p.id) } },
  });

  // Sort by PANELS order
  const ordered = PANELS.map((p) => panelRecords.find((r) => r.id === p.id)!).filter(Boolean);

  const buttons = ordered.map((p) => {
    const panelMeta = PANELS.find((x) => x.id === p.id)!;
    const style = BUTTON_STYLE[p.buttonColor] ?? 1;
    const component: Record<string, unknown> = {
      type: 2,
      style,
      label: p.buttonLabel || p.name,
      custom_id: `ticket_create_${p.id}`,
    };
    if (p.buttonEmoji) {
      const customMatch = p.buttonEmoji.match(/^<a?:(\w+):(\d+)>$/);
      if (customMatch) {
        component.emoji = { name: customMatch[1], id: customMatch[2] };
      } else {
        component.emoji = { name: p.buttonEmoji };
      }
    } else {
      component.emoji = { name: panelMeta.emoji };
    }
    return component;
  });

  const payload = {
    embeds: [
      {
        title: '🎟️ Sistema de Tickets',
        description: 'Selecciona el botón que corresponda a tu caso para abrir un ticket.\n\n⚖️ **Mediación** — Conflictos entre jugadores\n🎧 **Soporte** — Ayuda y consultas generales\n✅ **Verificación OOC** — Verificación fuera del personaje\n🐀 **Estafas** — Reporte de estafas',
        color: 0x5865f2,
      },
    ],
    components: [{ type: 1, components: buttons }],
  };

  let newMessageId: string;
  try {
    const msg = await rest.post(Routes.channelMessages(TICKET_BUTTON_CHANNEL), { body: payload }) as { id: string };
    newMessageId = msg.id;
    console.log(`  ✅ Panel enviado al canal ${TICKET_BUTTON_CHANNEL}, mensaje ID: ${newMessageId}`);
  } catch (err: any) {
    console.error(`  ❌ Error enviando panel: ${err?.rawError?.message || err?.message}`);
    await prisma.$disconnect();
    client.destroy();
    return;
  }

  // Step 5: Update messageId on all panels
  await prisma.ticketPanel.updateMany({
    where: { id: { in: ordered.map((p) => p.id) } },
    data: { messageId: newMessageId },
  });
  console.log('  ✅ messageId actualizado en todos los paneles');

  console.log('\n🎉 ¡Configuración completada!');
  await prisma.$disconnect();
  client.destroy();
}

main().catch(console.error);
