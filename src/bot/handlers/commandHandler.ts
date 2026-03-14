import { Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { BotClient, SlashCommand } from '../../shared/types';
import logger from '../../shared/logger';

/**
 * Recursively load all command files from the commands directory.
 */
export async function loadCommands(client: BotClient): Promise<void> {
  client.commands = new Collection();
  client.cooldowns = new Collection();

  const commandsPath = join(__dirname, '..', 'commands');
  const commandFolders = readdirSync(commandsPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(
      (f) => f.endsWith('.ts') || f.endsWith('.js')
    );

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      try {
        const commandModule = await import(filePath);
        const command: SlashCommand = commandModule.default || commandModule;

        if (command.data && 'execute' in command) {
          client.commands.set(command.data.name, command);
          logger.info(`Loaded command: /${command.data.name} [${folder}]`);
        } else {
          logger.warn(`Skipping ${filePath}: missing "data" or "execute"`);
        }
      } catch (err) {
        logger.error(`Failed to load command ${filePath}: ${err}`);
      }
    }
  }

  logger.info(`Loaded ${client.commands.size} commands total`);
}

/**
 * Register all slash commands with the Discord API.
 */
export async function deployCommands(client: BotClient): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
  const commands = client.commands.map((cmd) => cmd.data.toJSON());

  try {
    logger.info(`Deploying ${commands.length} slash commands...`);

    // Deploy as guild commands for every guild the bot is in (instant update).
    // Falls back to global deployment if no guilds are cached yet.
    const guildIds = client.guilds.cache.map((g) => g.id);

    if (guildIds.length > 0) {
      for (const guildId of guildIds) {
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId),
          { body: commands },
        );
        logger.info(`Deployed ${commands.length} commands to guild ${guildId}`);
      }
    } else {
      // Fallback: global commands (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
        body: commands,
      });
      logger.info('Deployed commands globally (no guilds cached)');
    }

    logger.info('Slash commands deployed successfully');
  } catch (err) {
    logger.error(`Failed to deploy commands: ${err}`);
  }
}
