import { loadEnv, sanitizeDatabaseUrl } from './config/env.js';
import { getPrismaClient, disconnectPrisma } from './db/prisma.js';
import { createDiscordClient, setupGracefulShutdown } from './discord/client.js';
import { handleInteraction } from './discord/commandRouter.js';
import { registerSlashCommands } from './discord/commands/register.js';
import { startImportScheduler } from './travian/scheduler.js';
import { createAdminServer } from './admin/server.js';
import { logCommand, logError } from './admin/metrics.js';
import { logger } from './logger.js';
import './discord/commands/definitions/allianceNear.js';
import './discord/commands/definitions/enemyNear.js';
import './discord/commands/definitions/inactiveSearch.js';
import './discord/commands/definitions/allianceVillages.js';
import './discord/commands/definitions/playerVillages.js';
import './discord/commands/definitions/diplomacySet.js';
import './discord/commands/definitions/diplomacyList.js';
import './discord/commands/definitions/diplomacyRemove.js';
import './discord/commands/definitions/settingsLanguage.js';
import './discord/commands/definitions/mapRefresh.js';
import './discord/commands/definitions/serverInfo.js';
import './discord/commands/definitions/help.js';
import './discord/commands/definitions/tribeSearch.js';
import './discord/commands/definitions/lastUpdate.js';
import './discord/commands/definitions/wotwInfo.js';
import './discord/commands/definitions/playerInfo.js';
import './discord/commands/definitions/distance.js';

async function main() {
  logger.info('Starting Travian Discord Bot...');

  const config = loadEnv();
  logger.info({ nodeEnv: config.NODE_ENV }, 'Environment loaded');
  logger.info({ database: sanitizeDatabaseUrl(config.DATABASE_URL) }, 'Database configured');

  createAdminServer(config.ADMIN_PORT);

  const prisma = getPrismaClient();
  const client = createDiscordClient();

  client.once('ready', async () => {
    logger.info({ tag: client.user?.tag }, 'Bot logged in');

    await registerSlashCommands(config.DISCORD_CLIENT_ID, config.DISCORD_TOKEN);

    startImportScheduler(prisma, config.SERVER_ID, config.MAP_SQL_URL, config.SERVER_NAME);

    logger.info('Bootstrap complete - ready to receive commands');
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const startTime = Date.now();
    const userName = interaction.user.username;
    const guildName = interaction.guild?.name ?? '';

    try {
      await handleInteraction(interaction, prisma, config);
      const duration = Date.now() - startTime;
      logCommand({
        userId: interaction.user.id,
        userName,
        guildId: interaction.guildId ?? '',
        guildName,
        commandName: interaction.commandName,
        success: true,
        durationMs: duration,
        errorMessage: null,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stackTrace = error instanceof Error ? error.stack ?? null : null;
      logCommand({
        userId: interaction.user.id,
        userName,
        guildId: interaction.guildId ?? '',
        guildName,
        commandName: interaction.commandName,
        success: false,
        durationMs: duration,
        errorMessage,
      });
      logError({
        commandName: interaction.commandName,
        userId: interaction.user.id,
        userName,
        guildId: interaction.guildId ?? '',
        errorMessage,
        stackTrace,
      });
    }
  });

  client.on('error', (error) => {
    logger.error({ error }, 'Discord client error');
  });

  setupGracefulShutdown(client, async () => {
    await disconnectPrisma();
    logger.info('Prisma disconnected');
  });

  await client.login(config.DISCORD_TOKEN);
}

main().catch((error) => {
  logger.error({ error }, 'Unhandled error in main');
  process.exit(1);
});
