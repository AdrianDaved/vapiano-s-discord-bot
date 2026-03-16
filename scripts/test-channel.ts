import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import 'dotenv/config';

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.BOT_TOKEN);
  await new Promise<void>((r) => client.once('ready', r));

  try {
    const ch = await client.channels.fetch('1482938839084306482') as TextChannel;
    console.log('Canal encontrado:', ch.name, '| Guild:', ch.guild?.name);
    await ch.send('✅ Test de envío desde el bot');
    console.log('✅ Mensaje enviado correctamente');
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }

  client.destroy();
}

main();
