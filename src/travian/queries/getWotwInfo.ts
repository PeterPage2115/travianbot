import { PrismaClient } from '@prisma/client';
import { QueryResult, QueryOptions, VillageWithSnapshot } from './listAllianceVillages.js';

export interface WotwVillage extends VillageWithSnapshot {
  victoryPoints: number;
}

export async function getWotwInfo(
  prisma: PrismaClient,
  serverId: number,
  options: QueryOptions = {}
): Promise<QueryResult<WotwVillage>> {
  const limit = options.limit ?? 25;

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
      victoryPoints: { gt: 0 },
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

  const results = villageSnapshots
    .map(snapshot => ({
      villageId: snapshot.village.villageId,
      name: snapshot.village.name,
      x: snapshot.village.x,
      y: snapshot.village.y,
      population: snapshot.population,
      playerName: snapshot.village.player?.name ?? null,
      allianceTag: snapshot.village.alliance?.tag ?? null,
      victoryPoints: snapshot.victoryPoints,
    }))
    .sort((a, b) => b.victoryPoints - a.victoryPoints || a.villageId - b.villageId);

  const totalMatched = results.length;
  const hasMore = results.length > limit;
  const villages = results.slice(0, limit);

  return { villages, hasMore, totalMatched, returnedCount: villages.length };
}
