import { PrismaClient } from '@prisma/client';
import { getEnemyAllianceTagsForGuild } from '../diplomacy/enemyQueries.js';
import {
  Coordinates,
  VillageWithDistance,
  findEnemyVillagesNear
} from './findEnemyVillagesNear.js';
import { QueryOptions, QueryResult } from './listAllianceVillages.js';

/**
 * Find the nearest enemy villages globally from a center point, sorted by distance.
 * No radius limit — returns the closest enemies across the entire map.
 */
export async function findNearestEnemies(
  prisma: PrismaClient,
  guildId: string,
  serverId: number,
  center: Coordinates,
  options: QueryOptions = {}
): Promise<QueryResult<VillageWithDistance>> {
  const enemyAllianceTags = await getEnemyAllianceTagsForGuild(prisma, guildId);

  // Radius 999 covers the entire Travian map (max possible distance ≈ 566)
  return findEnemyVillagesNear(prisma, serverId, enemyAllianceTags, center, 999, options);
}
