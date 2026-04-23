import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { importMapSnapshot } from './importMapSnapshot.js';
import { logger } from '../logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;

const scheduledTasks: ReturnType<typeof cron.schedule>[] = [];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeImportWithRetry(
  prisma: PrismaClient,
  serverId: number,
  mapSqlUrl: string,
  serverName: string | undefined,
  maxRetries: number = MAX_RETRIES
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info({ attempt, maxRetries }, 'Starting map import');
      const result = await importMapSnapshot(prisma, serverId, mapSqlUrl, serverName);
      logger.info({
        snapshotId: result.snapshotId,
        totalVillages: result.totalVillages,
        totalPlayers: result.totalPlayers,
        totalAlliances: result.totalAlliances,
      }, 'Map import completed successfully');
      return;
    } catch (error) {
      logger.error({ attempt, maxRetries, error }, 'Map import failed');
      if (attempt < maxRetries) {
        logger.info({ delayMs: RETRY_DELAY_MS }, 'Retrying after delay');
        await sleep(RETRY_DELAY_MS);
      } else {
        throw error;
      }
    }
  }
}

async function isDuplicateImport(prisma: PrismaClient, serverId: number): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingSnapshot = await prisma.snapshot.findFirst({
    where: {
      serverId,
      snapshotAt: {
        gte: today,
      },
    },
  });

  return existingSnapshot !== null;
}

export function startImportScheduler(
  prisma: PrismaClient,
  serverId: number,
  mapSqlUrl: string,
  serverName: string | undefined,
  cronExpression: string = '0 0 * * *'
) {
  logger.info({ cronExpression }, 'Starting import scheduler');

  const task = cron.schedule(cronExpression, async () => {
    logger.info('Scheduled import triggered');

    try {
      const isDuplicate = await isDuplicateImport(prisma, serverId);
      if (isDuplicate) {
        logger.info('Skipping import - snapshot already exists for today');
        return;
      }

      await executeImportWithRetry(prisma, serverId, mapSqlUrl, serverName);
    } catch (error) {
      logger.error({ error }, 'Scheduled import failed after all retries');
    }
  });

  scheduledTasks.push(task);

  return task;
}

export function stopAllSchedulers(): void {
  logger.info({ count: scheduledTasks.length }, 'Stopping all scheduled tasks');
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping schedulers gracefully');
  stopAllSchedulers();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping schedulers gracefully');
  stopAllSchedulers();
  process.exit(0);
});
