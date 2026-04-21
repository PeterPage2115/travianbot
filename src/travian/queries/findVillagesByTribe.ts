import { PrismaClient } from '@prisma/client';
import { calculateDistance } from '../../shared/distance.js';
import { QueryResult, QueryOptions, VillageWithSnapshot } from './listAllianceVillages.js';

export interface VillageWithDistance extends VillageWithSnapshot {
  distance: number;
}

export interface Coordinates {
  x: number;
  y: number;
}

export async function findVillagesByTribe(
  prisma: PrismaClient,
  serverId: number,
  tribeId: number,
  options: QueryOptions & { center?: Coordinates; radius?: number } = {}
): Promise<QueryResult<VillageWithDistance>> {
  const limit = options.limit ?? 100;

  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId },
    orderBy: { snapshotAt: 'desc' },
  });

  if (!latestSnapshot) {
    return { villages: [], hasMore: false, totalMatched: 0, returnedCount: 0 };
  }

  const villageSnapshots = await prisma.villageSnapshot.findMany({
    where: {
      snapshotId: latestSnapshot.id,
      tribeId,
      village: { serverId },
    },
    include: {
      village: {
        include: {
          player: true,
          alliance: true,
        },
      },
    },
  });

  let results = villageSnapshots.map(snapshot => {
    const distance = options.center
      ? calculateDistance(options.center.x, options.center.y, snapshot.village.x, snapshot.village.y)
      : 0;
    return {
      villageId: snapshot.village.villageId,
      name: snapshot.village.name,
      x: snapshot.village.x,
      y: snapshot.village.y,
      population: snapshot.population,
      playerName: snapshot.village.player?.name ?? null,
      allianceTag: snapshot.village.alliance?.tag ?? null,
      distance,
    };
  });

  if (options.center && options.radius) {
    results = results
      .filter(v => v.distance <= options.radius!)
      .sort((a, b) => a.distance - b.distance || a.villageId - b.villageId);
  } else {
    results.sort((a, b) => a.villageId - b.villageId);
  }

  const totalMatched = results.length;
  const hasMore = results.length > limit;
  const villages = results.slice(0, limit);

  return { villages, hasMore, totalMatched, returnedCount: villages.length };
}
