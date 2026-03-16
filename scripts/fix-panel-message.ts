/**
 * Edit the deployed panel message to match the original style.
 */
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import prisma from '../src/database/client';
import 'dotenv/config';

const GUILD_ID = '1420045220325625898';
const CHANNEL_ID = '1420907241124663297';

// Panel IDs (in display order)
const PANEL_IDS = [
  'd8c6144b-8cb7-49d3-a997-f340363b7898', // Mediación
  'f08c9ff9-899f-492d-9290-be4399366602', // Soporte
  '3a1afdc4-f764-45c0-9a84-6bafeea7a3ac', // Verificación OOC
  '1293ce10-a894-4f69-a8e2-b53bfc6889e1', // Estafas
];

const BUTTON_STYLE: Record<string, number> = {
  Primary: 1, Secondary: 2, Success: 3, Danger: 4,
  primary: 1, secondary: 2, success: 3, danger: 4,
};

async function main() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

  // Get current messageId from DB
  const panels = await prisma.ticketPanel.findMany({
    where: { id: { in: PANEL_IDS } },
  });

  const ordered = PANEL_IDS.map((id) => panels.find((p) => p.id === id)!).filter(Boolean);
  const messageId = ordered[0]?.messageId;

  if (!messageId) {
    console.error('No messageId found in DB');
    process.exit(1);
  }

  console.log('Editing message', messageId, 'in channel', CHANNEL_ID);

  // Button emojis matching the original panel
  const buttonEmojis: Record<string, string> = {
    'd8c6144b-8cb7-49d3-a997-f340363b7898': '🤝', // Mediación
    'f08c9ff9-899f-492d-9290-be4399366602': '🔧', // Soporte
    '3a1afdc4-f764-45c0-9a84-6bafeea7a3ac': '💰', // Verificación OOC
    '1293ce10-a894-4f69-a8e2-b53bfc6889e1': '🐀', // Estafas
  };

  const buttons = ordered.map((p) => {
    const style = BUTTON_STYLE[p.buttonColor] ?? 1;
    return {
      type: 2,
      style,
      label: p.buttonLabel || p.name,
      custom_id: `ticket_create_${p.id}`,
      emoji: { name: buttonEmojis[p.id] || p.buttonEmoji || '' },
    };
  });

  const payload = {
    embeds: [
      {
        title: 'SELECCIONAR EL BOTON QUE CORRESPONDA A TU CASO',
        description: [
          '🤝 **Mediación** – Un miembro del staff actuará como intermediario para que tu compra o venta sea segura.',
          '',
          '🔧 **Soporte** – Para dudas o problemas con el marketplace.',
          '',
          '💰 **Verificación OOC** – Solicitar rango para poder hacer ventas OOC.',
          '',
          '🐀 **Estafas** – Reporta intentos o si ya fuiste estafado.',
        ].join('\n'),
        color: 0x5865f2,
      },
    ],
    components: [{ type: 1, components: buttons }],
  };

  // Try to edit existing message, otherwise send new one
  let newMsgId = messageId;
  try {
    await rest.patch(Routes.channelMessage(CHANNEL_ID, messageId), { body: payload });
    console.log('✅ Mensaje editado correctamente:', messageId);
  } catch {
    console.log('⚠️  Mensaje no encontrado, enviando uno nuevo...');
    try {
      const msg = await rest.post(Routes.channelMessages(CHANNEL_ID), { body: payload }) as { id: string };
      newMsgId = msg.id;
      console.log('✅ Nuevo mensaje enviado:', newMsgId);
    } catch (err2: any) {
      console.error('❌ Error enviando mensaje:', err2?.rawError?.message || err2?.message);
      await prisma.$disconnect();
      return;
    }
  }

  // Update messageId in all panels if it changed
  if (newMsgId !== messageId) {
    await prisma.ticketPanel.updateMany({
      where: { id: { in: PANEL_IDS } },
      data: { messageId: newMsgId },
    });
    console.log('✅ messageId actualizado en DB');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
