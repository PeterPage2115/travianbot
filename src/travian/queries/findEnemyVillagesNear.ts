import { PrismaClient } from '@prisma/client';
import { calculateDistance } from '../../shared/distance.js';
import { VillageWithSnapshot, QueryResult, QueryOptions } from './listAllianceVillages.js';

export interface VillageWithDistance extends VillageWithSnapshot {
  distance: number;
}

export interface Coordinates {
  x: number;
  y: number;
}

/**
 * Find villages of enemy alliances within a radius from a center point using the latest snapshot
 * This is the query-side foundation for enemy lookup - it accepts explicit enemy alliance tags
 * without needing diplomacy persistence. Task 6 can extend this by reading enemy tags from storage.
 */
export async function findEnemyVillagesNear(
  prisma: PrismaClient,
  serverId: number,
  enemyAllianceTags: string[],
  center: Coordinates,
  radius: number,
  options: QueryOptions = {}
): Promise<QueryResult<VillageWithDistance>> {
  const limit = options.limit ?? 100;
  
  // Early return for empty enemy list
  if (enemyAllianceTags.length === 0) {
    return { villages: [], hasMore: false, totalMatched: 0, returnedCount: 0 };
  }
  
  // Find the latest snapshot for this server
  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId },
    orderBy: { snapshotAt: 'desc' }
  });

  if (!latestSnapshot) {
    return { villages: [], hasMore: false, totalMatched: 0, returnedCount: 0 };
  }

  const enemyAllianceTagFilters = enemyAllianceTags.map(tag => ({
    tag: {
      equals: tag,
      mode: 'insensitive' as const
    }
  }));

  // Find enemy alliances
  const enemyAlliances = await prisma.alliance.findMany({
    where: {
      serverId,
      OR: enemyAllianceTagFilters
    }
  });

  if (enemyAlliances.length === 0) {
    return { villages: [], hasMore: false, totalMatched: 0, returnedCount: 0 };
  }

  const enemyAllianceIds = enemyAlliances.map(a => a.id);

  // Get villages present in the latest snapshot only.
  const villageSnapshots = await prisma.villageSnapshot.findMany({
    where: {
      snapshotId: latestSnapshot.id,
      village: {
        serverId,
        allianceId: { in: enemyAllianceIds }
      }
    },
    include: {
      village: {
        include: {
          player: true,
          alliance: true
        }
      }
    }
  });

  // Calculate distances and filter by radius
  const villagesWithDistance = villageSnapshots
    .map(snapshot => {
      const distance = calculateDistance(center.x, center.y, snapshot.village.x, snapshot.village.y);
      return {
        villageId: snapshot.village.villageId,
        name: snapshot.village.name,
        x: snapshot.village.x,
        y: snapshot.village.y,
        population: snapshot.population,
        playerName: snapshot.village.player?.name ?? null,
        allianceTag: snapshot.village.alliance?.tag ?? null,
        distance
      };
    })
    .filter(v => v.distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.villageId - b.villageId);

  const totalMatched = villagesWithDistance.length;
  const hasMore = villagesWithDistance.length > limit;
  const resultVillages = villagesWithDistance.slice(0, limit);

  return {
    villages: resultVillages,
    hasMore,
    totalMatched,
    returnedCount: resultVillages.length
  };
}
