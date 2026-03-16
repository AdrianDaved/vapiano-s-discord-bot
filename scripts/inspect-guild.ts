import { Client, GatewayIntentBits, ChannelType, TextChannel } from 'discord.js';
import prisma from '../src/database/client';
import 'dotenv/config';

const GUILD_ID = '1420045220325625898';

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  await client.login(process.env.BOT_TOKEN);
  await new Promise<void>((r) => client.once('ready', r));

  const guild = await client.guilds.fetch(GUILD_ID);
  const channels = await guild.channels.fetch();

  console.log('\n═══ CATEGORÍAS ═══');
  const categories = channels.filter(c => c?.type === ChannelType.GuildCategory);
  categories.forEach(c => console.log(`  [CAT] ${c!.name} — ${c!.id}`));

  console.log('\n═══ CANALES DE TEXTO ═══');
  const textChannels = channels.filter(c => c?.type === ChannelType.GuildText);
  textChannels.forEach(c => {
    const tc = c as TextChannel;
    const parent = tc.parent?.name || 'sin categoría';
    console.log(`  [TEXT] #${tc.name} — ${tc.id}  (en: ${parent})`);
  });

  console.log('\n═══ PANELES EN DB ═══');
  const panels = await prisma.ticketPanel.findMany({ where: { guildId: GUILD_ID } });
  panels.forEach(p => console.log(`  Panel: ${p.name} | channelId: ${p.channelId} | categoryId: ${p.categoryId || 'ninguna'} | closedCategoryId: ${p.closedCategoryId || 'ninguna'}`));

  console.log('\n═══ TICKETS EXISTENTES (últimos 5 abiertos) ═══');
  const tickets = await prisma.ticket.findMany({
    where: { guildId: GUILD_ID, status: 'open' },
    include: { panel: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  tickets.forEach(t => {
    console.log(`  Ticket #${t.number} | canal: ${t.channelId} | panel: ${t.panel?.name || 'ninguno'} | categoría: ${t.panel?.categoryId || 'ninguna'}`);
  });

  await prisma.$disconnect();
  client.destroy();
}

main().catch(console.error);
