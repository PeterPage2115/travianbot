import { PrismaClient } from '@prisma/client';

export interface AllianceStats {
  tag: string;
  totalPlayers: number;
  totalVillages: number;
  totalPopulation: number;
  avgPopulationPerVillage: number;
  topPlayers: Array<{
    name: string;
    villageCount: number;
    totalPopulation: number;
  }>;
}

export async function getAllianceStats(
  prisma: PrismaClient,
  serverId: number,
  allianceTag: string
): Promise<AllianceStats | null> {
  const alliance = await prisma.alliance.findFirst({
    where: {
      serverId,
      tag: { equals: allianceTag, mode: 'insensitive' },
    },
  });

  if (!alliance) return null;

  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId },
    orderBy: { snapshotAt: 'desc' },
  });

  if (!latestSnapshot) return null;

  const players = await prisma.player.findMany({
    where: { serverId, allianceId: alliance.id },
    select: { name: true, playerId: true },
  });

  const villageSnapshots = await prisma.villageSnapshot.findMany({
    where: {
      snapshotId: latestSnapshot.id,
      village: { serverId, allianceId: alliance.id },
    },
    include: {
      village: { select: { playerId: true } },
    },
  });

  const totalVillages = villageSnapshots.length;
  const totalPopulation = villageSnapshots.reduce((sum, vs) => sum + vs.population, 0);
  const avgPopulationPerVillage = totalVillages > 0 ? totalPopulation / totalVillages : 0;

  const playerStats = new Map<number, { name: string; villageCount: number; totalPopulation: number }>();
  for (const player of players) {
    playerStats.set(player.playerId, { name: player.name, villageCount: 0, totalPopulation: 0 });
  }

  for (const vs of villageSnapshots) {
    if (vs.village.playerId !== null && playerStats.has(vs.village.playerId)) {
      const stats = playerStats.get(vs.village.playerId)!;
      stats.villageCount++;
      stats.totalPopulation += vs.population;
    }
  }

  const topPlayers = Array.from(playerStats.values())
    .sort((a, b) => b.totalPopulation - a.totalPopulation)
    .slice(0, 10);

  return {
    tag: alliance.tag,
    totalPlayers: players.length,
    totalVillages,
    totalPopulation,
    avgPopulationPerVillage: Math.round(avgPopulationPerVillage * 100) / 100,
    topPlayers,
  };
}
