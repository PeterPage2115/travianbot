import { PrismaClient } from '@prisma/client';

export interface VillageWithSnapshot {
  villageId: number;
  name: string;
  x: number;
  y: number;
  population: number;
  playerName: string | null;
  allianceTag: string | null;
}

export interface QueryResult<T> {
  villages: T[];
  hasMore: boolean;
  totalMatched: number;
  returnedCount: number;
}

export interface QueryOptions {
  limit?: number;
}

/**
 * List all villages for an alliance tag using the latest snapshot
 */
export async function listAllianceVillages(
  prisma: PrismaClient,
  serverId: number,
  allianceTag: string,
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

  // Find the alliance
  const alliance = await prisma.alliance.findFirst({
    where: {
      serverId,
      tag: { equals: allianceTag, mode: 'insensitive' }
    }
  });

  if (!alliance) {
    return { villages: [], hasMore: false, totalMatched: 0, returnedCount: 0 };
  }

  const where = {
    snapshotId: latestSnapshot.id,
    village: {
      serverId,
      allianceId: alliance.id
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
