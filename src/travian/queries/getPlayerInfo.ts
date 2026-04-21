import { PrismaClient } from '@prisma/client';

export interface PlayerInfo {
  name: string;
  tribeId: number | null;
  tribeName: string | null;
  allianceTag: string | null;
  totalVillages: number;
  totalPopulation: number;
  villages: Array<{
    villageId: number;
    name: string;
    x: number;
    y: number;
    population: number;
    isCapital: boolean;
    isCity: boolean;
    hasHarbor: boolean;
    victoryPoints: number;
  }>;
}

const TRIBE_NAMES: Record<number, string> = {
  1: 'Romans',
  2: 'Teutons',
  3: 'Gauls',
  5: 'Natars',
  6: 'Egyptians',
  7: 'Huns',
  8: 'Spartans',
  9: 'Vikings',
};

export async function getPlayerInfo(
  prisma: PrismaClient,
  serverId: number,
  playerName: string
): Promise<PlayerInfo | null> {
  const player = await prisma.player.findFirst({
    where: {
      serverId,
      name: { equals: playerName, mode: 'insensitive' },
    },
    include: {
      alliance: true,
    },
  });

  if (!player) return null;

  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId },
    orderBy: { snapshotAt: 'desc' },
  });

  if (!latestSnapshot) return null;

  const villageSnapshots = await prisma.villageSnapshot.findMany({
    where: {
      snapshotId: latestSnapshot.id,
      village: { serverId, playerId: player.id },
    },
    include: {
      village: true,
    },
  });

  const villages = villageSnapshots.map(vs => ({
    villageId: vs.village.villageId,
    name: vs.village.name,
    x: vs.village.x,
    y: vs.village.y,
    population: vs.population,
    isCapital: vs.isCapital,
    isCity: vs.isCity,
    hasHarbor: vs.hasHarbor,
    victoryPoints: vs.victoryPoints,
  }));

  const totalPopulation = villages.reduce((sum, v) => sum + v.population, 0);

  return {
    name: player.name,
    tribeId: villages.length > 0 ? villageSnapshots[0].tribeId : null,
    tribeName: villages.length > 0 ? (TRIBE_NAMES[villageSnapshots[0].tribeId] ?? 'Unknown') : null,
    allianceTag: player.alliance?.tag ?? null,
    totalVillages: villages.length,
    totalPopulation,
    villages: villages.sort((a, b) => b.population - a.population),
  };
}
