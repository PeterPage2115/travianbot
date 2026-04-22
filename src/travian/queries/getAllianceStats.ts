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

  const playerStatsMap = new Map<number, { villageCount: number; totalPopulation: number }>();
  for (const vs of villageSnapshots) {
    const pid = vs.village.playerId;
    if (pid === null) continue;
    const existing = playerStatsMap.get(pid) ?? { villageCount: 0, totalPopulation: 0 };
    existing.villageCount++;
    existing.totalPopulation += vs.population;
    playerStatsMap.set(pid, existing);
  }

  const playerIds = Array.from(playerStatsMap.keys());
  const players = playerIds.length > 0 ? await prisma.player.findMany({
    where: { serverId, playerId: { in: playerIds } },
    select: { playerId: true, name: true },
  }) : [];

  const playerNameMap = new Map<number, string>();
  for (const p of players) {
    playerNameMap.set(p.playerId, p.name);
  }

  const topPlayers = Array.from(playerStatsMap.entries())
    .map(([playerId, stats]) => ({
      name: playerNameMap.get(playerId) ?? `Player ${playerId}`,
      villageCount: stats.villageCount,
      totalPopulation: stats.totalPopulation,
    }))
    .sort((a, b) => b.totalPopulation - a.totalPopulation)
    .slice(0, 10);

  return {
    tag: alliance.tag,
    totalPlayers: playerStatsMap.size,
    totalVillages,
    totalPopulation,
    avgPopulationPerVillage: Math.round(avgPopulationPerVillage * 100) / 100,
    topPlayers,
  };
}
