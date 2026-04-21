import { PrismaClient } from '@prisma/client';
import { listAllianceTagsByStatus } from './diplomacyRepository.js';
import {
  Coordinates,
  VillageWithDistance,
  findEnemyVillagesNear
} from '../queries/findEnemyVillagesNear.js';
import { QueryOptions, QueryResult } from '../queries/listAllianceVillages.js';

export async function getEnemyAllianceTagsForGuild(
  prisma: PrismaClient,
  guildId: string
): Promise<string[]> {
  return listAllianceTagsByStatus(prisma, guildId, 'enemy');
}

export async function findEnemyVillagesNearForGuild(
  prisma: PrismaClient,
  guildId: string,
  serverId: number,
  center: Coordinates,
  radius: number,
  options: QueryOptions = {}
): Promise<QueryResult<VillageWithDistance>> {
  const enemyAllianceTags = await getEnemyAllianceTagsForGuild(prisma, guildId);

  return findEnemyVillagesNear(prisma, serverId, enemyAllianceTags, center, radius, options);
}
