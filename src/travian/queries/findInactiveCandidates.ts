import { PrismaClient } from '@prisma/client';
import {
  InactiveHeuristicsConfig,
  InactiveScoreExplanation,
  resolveInactiveHeuristicsConfig,
  scoreVillageInactivity
} from '../inactiveHeuristics.js';
import { QueryOptions, QueryResult, VillageWithSnapshot } from './listAllianceVillages.js';

export interface InactiveCandidateVillage extends VillageWithSnapshot {
  inactivityScore: number;
  label: 'likely inactive';
  explanation: InactiveScoreExplanation;
  populationHistory: Array<{ snapshotAt: Date; population: number }>;
}

export interface FindInactiveCandidatesOptions extends QueryOptions {
  heuristics?: Partial<InactiveHeuristicsConfig>;
  center?: { x: number; y: number };
  radius?: number;
}

export interface InactiveCandidateQueryResult extends QueryResult<InactiveCandidateVillage> {
  appliedConfig: InactiveHeuristicsConfig;
  snapshotWindow: {
    latestSnapshotId: number | null;
    latestSnapshotAt: Date | null;
    requestedSnapshotCount: number;
    consideredSnapshotCount: number;
  };
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Find likely inactive villages present in the latest snapshot using recent population deltas only.
 */
export async function findInactiveCandidates(
  prisma: PrismaClient,
  serverId: number,
  options: FindInactiveCandidatesOptions = {}
): Promise<InactiveCandidateQueryResult> {
  const limit = options.limit ?? 100;
  const appliedConfig = resolveInactiveHeuristicsConfig(options.heuristics);

  const snapshots = await prisma.snapshot.findMany({
    where: { serverId },
    orderBy: { snapshotAt: 'desc' },
    take: appliedConfig.lookbackSnapshots
  });

  const latestSnapshot = snapshots[0] ?? null;

  if (!latestSnapshot) {
    return emptyResult(limit, appliedConfig);
  }

  const latestVillageSnapshots = await prisma.villageSnapshot.findMany({
    where: {
      snapshotId: latestSnapshot.id,
      village: { serverId }
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

  if (latestVillageSnapshots.length === 0) {
    return {
      ...emptyResult(limit, appliedConfig),
      snapshotWindow: {
        latestSnapshotId: latestSnapshot.id,
        latestSnapshotAt: latestSnapshot.snapshotAt,
        requestedSnapshotCount: appliedConfig.lookbackSnapshots,
        consideredSnapshotCount: snapshots.length
      }
    };
  }

  const villageIds = latestVillageSnapshots.map(snapshot => snapshot.villageId);
  const snapshotIds = snapshots.map(snapshot => snapshot.id);

  const historicalSnapshots = await prisma.villageSnapshot.findMany({
    where: {
      snapshotId: { in: snapshotIds },
      villageId: { in: villageIds }
    },
    include: {
      snapshot: true
    },
    orderBy: {
      snapshot: { snapshotAt: 'asc' }
    }
  });

  const historyByVillageId = new Map<number, typeof historicalSnapshots>();

  for (const snapshot of historicalSnapshots) {
    const history = historyByVillageId.get(snapshot.villageId) ?? [];
    history.push(snapshot);
    historyByVillageId.set(snapshot.villageId, history);
  }

  const candidates = latestVillageSnapshots
    .map(latestVillageSnapshot => {
      const village = latestVillageSnapshot.village;

      if (options.center && options.radius) {
        const dist = distance(options.center.x, options.center.y, village.x, village.y);
        if (dist > options.radius) {
          return null;
        }
      }

      const history = (historyByVillageId.get(latestVillageSnapshot.villageId) ?? []).map(snapshot => ({
        snapshotId: snapshot.snapshotId,
        snapshotAt: snapshot.snapshot.snapshotAt,
        population: snapshot.population
      }));
      const explanation = scoreVillageInactivity(history, appliedConfig);

      if (!explanation.isCandidate) {
        return null;
      }

      return {
        villageId: village.villageId,
        name: village.name,
        x: village.x,
        y: village.y,
        population: latestVillageSnapshot.population,
        playerName: village.player?.name ?? null,
        allianceTag: village.alliance?.tag ?? null,
        inactivityScore: explanation.score,
        label: 'likely inactive' as const,
        explanation,
        populationHistory: history.map(h => ({ snapshotAt: h.snapshotAt, population: h.population }))
      };
    })
    .filter((village): village is InactiveCandidateVillage => village !== null)
    .sort(
      (left, right) =>
        right.inactivityScore - left.inactivityScore ||
        left.population - right.population ||
        left.villageId - right.villageId
    );

  const hasMore = candidates.length > limit;
  const villages = candidates.slice(0, limit);

  return {
    villages,
    hasMore,
    totalMatched: candidates.length,
    returnedCount: villages.length,
    appliedConfig,
    snapshotWindow: {
      latestSnapshotId: latestSnapshot.id,
      latestSnapshotAt: latestSnapshot.snapshotAt,
      requestedSnapshotCount: appliedConfig.lookbackSnapshots,
      consideredSnapshotCount: snapshots.length
    }
  };
}

function emptyResult(
  limit: number,
  appliedConfig: InactiveHeuristicsConfig
): InactiveCandidateQueryResult {
  void limit;

  return {
    villages: [],
    hasMore: false,
    totalMatched: 0,
    returnedCount: 0,
    appliedConfig,
    snapshotWindow: {
      latestSnapshotId: null,
      latestSnapshotAt: null,
      requestedSnapshotCount: appliedConfig.lookbackSnapshots,
      consideredSnapshotCount: 0
    }
  };
}
