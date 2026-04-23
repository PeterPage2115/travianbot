import { PrismaClient } from '@prisma/client';
import { VillageWithSnapshot, QueryResult, QueryOptions } from './listAllianceVillages.js';

/**
 * List all villages for a player by name using the latest snapshot
 */
export async function listPlayerVillages(
  prisma: PrismaClient,
  serverId: number,
  playerName: string,
  options: QueryOptions = {}
): Promise<QueryResult<VillageWithSnapshot>> {
  const limit = options.limit ?? 100;
  
  // Find the latest snapshot for this server
  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId },
    orderBy: { snapshotAt: 'desc' }
  });

  if (!latestSnapshot) {
    return { villages: [], hasMore: false, totalMatched: 0, returnedCount: 0 };
  }

  // Find the player
  const player = await prisma.player.findFirst({
    where: {
      serverId,
      name: { equals: playerName, mode: 'insensitive' }
    }
  });

  if (!player) {
    return { villages: [], hasMore: false, totalMatched: 0, returnedCount: 0 };
  }

  const where = {
    snapshotId: latestSnapshot.id,
    village: {
      serverId,
      playerId: player.id
    }
  } as const;

  // Get villages present in the latest snapshot only.
  const villageSnapshots = await prisma.villageSnapshot.findMany({
    where,
    include: {
      village: {
        include: {
          player: true,
          alliance: true
        }
      }
    },
    orderBy: {
      village: {
        villageId: 'asc'
      }
    },
    take: limit + 1
  });

  const hasMore = villageSnapshots.length > limit;
  const resultSnapshots = villageSnapshots.slice(0, limit);
  
  const totalMatched = hasMore 
    ? await prisma.villageSnapshot.count({ where })
    : villageSnapshots.length;

  return {
    villages: resultSnapshots.map(snapshot => ({
      villageId: snapshot.village.villageId,
      name: snapshot.village.name,
      x: snapshot.village.x,
      y: snapshot.village.y,
      population: snapshot.population,
      playerName: snapshot.village.player?.name ?? null,
      allianceTag: snapshot.village.alliance?.tag ?? null
    })),
    hasMore,
    totalMatched,
    returnedCount: resultSnapshots.length
  };
}
