/**
 * Script de un solo uso: crea el panel de tickets del marketplace
 * y lo envía al canal especificado.
 *
 * Uso: npx tsx scripts/deploy-marketplace-panel.ts
 */
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import prisma from '../src/database/client';
import 'dotenv/config';

const CHANNEL_ID = '1420907241124663297';

const PANELS = [
  {
    name: 'Mediación',
    emoji: '🤝',
    buttonLabel: 'Mediación',
    buttonStyle: ButtonStyle.Primary,
    buttonColor: 'Primary',
    title: 'Mediación',
    description: 'Solicita un mediador del staff para que tu compra o venta sea segura. (Un valor de 200K IC)',
    welcomeTitle: 'Ticket de Mediación',
    welcomeMessage: 'Bienvenido {user} 👋\nUn miembro del staff actuará como intermediario en tu transacción.\n\nDescribe brevemente la compra/venta que deseas realizar.',
  },
  {
    name: 'Soporte',
    emoji: '📞',
    buttonLabel: 'Soporte',
    buttonStyle: ButtonStyle.Secondary,
    buttonColor: 'Secondary',
    title: 'Soporte',
    description: 'Abre un ticket para dudas o problemas con el marketplace.',
    welcomeTitle: 'Ticket de Soporte',
    welcomeMessage: 'Bienvenido {user} 👋\nDescribe tu problema o duda con el mayor detalle posible.',
  },
  {
    name: 'Verificación OOC',
    emoji: '💰',
    buttonLabel: 'Verificación OOC',
    buttonStyle: ButtonStyle.Success,
    buttonColor: 'Success',
    title: 'Verificación OOC',
    description: 'Solicita el rango necesario para poder hacer ventas OOC.',
    welcomeTitle: 'Ticket de Verificación OOC',
    welcomeMessage: 'Bienvenido {user} 👋\nPara solicitar tu verificación OOC, por favor indica:\n- Tu nombre de personaje\n- El monto de la venta\n- Evidencia del acuerdo',
  },
  {
    name: 'Estafas',
    emoji: '🚨',
    buttonLabel: 'Estafas',
    buttonStyle: ButtonStyle.Danger,
    buttonColor: 'Danger',
    title: 'Reporte de Estafa',
    description: 'Reporta un intento de estafa o si ya fuiste estafado.',
    welcomeTitle: 'Reporte de Estafa',
    welcomeMessage: 'Bienvenido {user} 👋\nPor favor proporciona la siguiente información:\n- Usuario que te estafó\n- Monto o ítem involucrado\n- Evidencia (capturas de pantalla)',
  },
];

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await client.login(process.env.BOT_TOKEN);
  await new Promise<void>((resolve) => client.once('ready', () => resolve()));
  console.log(`✅ Bot conectado como ${client.user!.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID) as TextChannel;
  if (!channel) throw new Error(`Canal ${CHANNEL_ID} no encontrado`);

  const guildId = channel.guildId;
  console.log(`📌 Guild: ${guildId} | Canal: #${channel.name}`);

  // Crear cada panel en la base de datos
  const createdPanels = [];
  for (const p of PANELS) {
    const panel = await prisma.ticketPanel.create({
      data: {
        guildId,
        name: p.name,
        channelId: CHANNEL_ID,
        title: p.title,
        description: p.description,
        embedColor: '#5865F2',
        buttonLabel: p.buttonLabel,
        buttonEmoji: p.emoji,
        buttonColor: p.buttonColor,
        welcomeTitle: p.welcomeTitle,
        welcomeMessage: p.welcomeMessage,
        welcomeColor: '#5865F2',
        mentionStaff: true,
        mentionCreator: true,
        closeRequestEnabled: true,
        claimEnabled: true,
        transcriptEnabled: true,
      },
    });
    createdPanels.push(panel);
    console.log(`  ✓ Panel creado: ${p.name} (${panel.id})`);
  }

  // Embed del panel
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('SELECCIONAR EL BOTON QUE CORRESPONDA A TU CASO')
    .setDescription(
      '🤝 **Mediación** – Un miembro del staff actuará como intermediario para que tu compra o venta sea segura. (Un valor de 200K IC)\n\n' +
      '📞 **Soporte** – Para dudas o problemas con el marketplace.\n\n' +
      '💰 **Verificación OOC** – Solicitar rango para poder hacer ventas OOC.\n\n' +
      '📚 **Estafas** – Reporta intentos o si ya fuiste estafado.'
    );

  // Fila de botones (máx 5 por fila)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_create_${createdPanels[0].id}`)
      .setLabel('Mediación')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🤝'),
    new ButtonBuilder()
      .setCustomId(`ticket_create_${createdPanels[1].id}`)
      .setLabel('Soporte')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📞'),
    new ButtonBuilder()
      .setCustomId(`ticket_create_${createdPanels[2].id}`)
      .setLabel('Verificación OOC')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💰'),
    new ButtonBuilder()
      .setCustomId(`ticket_create_${createdPanels[3].id}`)
      .setLabel('Estafas')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🚨'),
  );

  const msg = await channel.send({ embeds: [embed], components: [row] });
  console.log(`✅ Panel enviado: ${msg.url}`);

  // Guardar el messageId en todos los paneles
  for (const panel of createdPanels) {
    await prisma.ticketPanel.update({
      where: { id: panel.id },
      data: { messageId: msg.id },
    });
  }

  console.log('✅ Listo.');
  await prisma.$disconnect();
  client.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
