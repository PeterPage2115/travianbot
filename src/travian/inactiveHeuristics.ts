export interface InactiveHeuristicsConfig {
  lookbackSnapshots: number;
  minHistorySnapshots: number;
  maxStepDelta: number;
  maxPopulationRange: number;
  maxTotalDelta: number;
  minStableStepRatio: number;
  minScore: number;
}

export interface PopulationHistoryPoint {
  snapshotId: number;
  snapshotAt: Date;
  population: number;
}

export type InactiveClassification = 'likely_inactive' | 'active' | 'insufficient_history';

export interface InactiveScoreExplanation {
  classification: InactiveClassification;
  isCandidate: boolean;
  score: number;
  snapshotCount: number;
  deltas: number[];
  unchangedSteps: number;
  smallDeltaSteps: number;
  stableStepRatio: number;
  minPopulation: number | null;
  maxPopulation: number | null;
  populationRange: number | null;
  startPopulation: number | null;
  endPopulation: number | null;
  totalDelta: number | null;
  maxStepDeltaObserved: number | null;
  history: PopulationHistoryPoint[];
}

export const DEFAULT_INACTIVE_HEURISTICS_CONFIG: Readonly<InactiveHeuristicsConfig> = Object.freeze({
  lookbackSnapshots: 7,
  minHistorySnapshots: 4,
  maxStepDelta: 2,
  maxPopulationRange: 4,
  maxTotalDelta: 4,
  minStableStepRatio: 0.75,
  minScore: 60
});

export function resolveInactiveHeuristicsConfig(
  overrides: Partial<InactiveHeuristicsConfig> = {}
): InactiveHeuristicsConfig {
  const lookbackSnapshots = readPositiveInteger(
    overrides.lookbackSnapshots,
    process.env.INACTIVE_LOOKBACK_SNAPSHOTS,
    DEFAULT_INACTIVE_HEURISTICS_CONFIG.lookbackSnapshots,
    2
  );

  const minHistorySnapshots = Math.min(
    readPositiveInteger(
      overrides.minHistorySnapshots,
      process.env.INACTIVE_MIN_HISTORY_SNAPSHOTS,
      DEFAULT_INACTIVE_HEURISTICS_CONFIG.minHistorySnapshots,
      2
    ),
    lookbackSnapshots
  );

  return {
    lookbackSnapshots,
    minHistorySnapshots,
    maxStepDelta: readNonNegativeNumber(
      overrides.maxStepDelta,
      process.env.INACTIVE_MAX_STEP_DELTA,
      DEFAULT_INACTIVE_HEURISTICS_CONFIG.maxStepDelta
    ),
    maxPopulationRange: readNonNegativeNumber(
      overrides.maxPopulationRange,
      process.env.INACTIVE_MAX_POPULATION_RANGE,
      DEFAULT_INACTIVE_HEURISTICS_CONFIG.maxPopulationRange
    ),
    maxTotalDelta: readNonNegativeNumber(
      overrides.maxTotalDelta,
      process.env.INACTIVE_MAX_TOTAL_DELTA,
      DEFAULT_INACTIVE_HEURISTICS_CONFIG.maxTotalDelta
    ),
    minStableStepRatio: readRatio(
      overrides.minStableStepRatio,
      process.env.INACTIVE_MIN_STABLE_STEP_RATIO,
      DEFAULT_INACTIVE_HEURISTICS_CONFIG.minStableStepRatio
    ),
    minScore: readBoundedNumber(
      overrides.minScore,
      process.env.INACTIVE_MIN_SCORE,
      DEFAULT_INACTIVE_HEURISTICS_CONFIG.minScore,
      0,
      100
    )
  };
}

export function scoreVillageInactivity(
  history: PopulationHistoryPoint[],
  configOverrides: Partial<InactiveHeuristicsConfig> = {}
): InactiveScoreExplanation {
  if (!Array.isArray(history)) {
    throw new TypeError('history must be an array');
  }

  const config = resolveInactiveHeuristicsConfig(configOverrides);
  const normalizedHistory = [...history].sort(
    (left, right) => left.snapshotAt.getTime() - right.snapshotAt.getTime() || left.snapshotId - right.snapshotId
  );

  if (normalizedHistory.length < config.minHistorySnapshots) {
    return {
      classification: 'insufficient_history',
      isCandidate: false,
      score: 0,
      snapshotCount: normalizedHistory.length,
      deltas: [],
      unchangedSteps: 0,
      smallDeltaSteps: 0,
      stableStepRatio: 0,
      minPopulation: normalizedHistory.length > 0 ? Math.min(...normalizedHistory.map(point => point.population)) : null,
      maxPopulation: normalizedHistory.length > 0 ? Math.max(...normalizedHistory.map(point => point.population)) : null,
      populationRange: normalizedHistory.length > 0
        ? Math.max(...normalizedHistory.map(point => point.population)) - Math.min(...normalizedHistory.map(point => point.population))
        : null,
      startPopulation: normalizedHistory[0]?.population ?? null,
      endPopulation: normalizedHistory.at(-1)?.population ?? null,
      totalDelta: normalizedHistory.length > 1
        ? normalizedHistory.at(-1)!.population - normalizedHistory[0]!.population
        : null,
      maxStepDeltaObserved: null,
      history: normalizedHistory
    };
  }

  const deltas = normalizedHistory.slice(1).map((point, index) => point.population - normalizedHistory[index].population);
  const absoluteDeltas = deltas.map(delta => Math.abs(delta));
  const unchangedSteps = deltas.filter(delta => delta === 0).length;
  const smallDeltaSteps = absoluteDeltas.filter(delta => delta <= config.maxStepDelta).length;
  const stableStepRatio = deltas.length === 0 ? 1 : smallDeltaSteps / deltas.length;
  const populations = normalizedHistory.map(point => point.population);
  const minPopulation = Math.min(...populations);
  const maxPopulation = Math.max(...populations);
  const populationRange = maxPopulation - minPopulation;
  const startPopulation = normalizedHistory[0]!.population;
  const endPopulation = normalizedHistory.at(-1)!.population;
  const totalDelta = endPopulation - startPopulation;
  const maxStepDeltaObserved = absoluteDeltas.length > 0 ? Math.max(...absoluteDeltas) : 0;
  const unstableSteps = deltas.length - smallDeltaSteps;

  const score = clampScore(
    Math.round(
      100
        - populationRange * 8
        - Math.abs(totalDelta) * 10
        - unstableSteps * 20
        - Math.max(0, maxStepDeltaObserved - config.maxStepDelta) * 15
    )
  );

  const isCandidate =
    populationRange <= config.maxPopulationRange &&
    Math.abs(totalDelta) <= config.maxTotalDelta &&
    maxStepDeltaObserved <= config.maxStepDelta &&
    stableStepRatio >= config.minStableStepRatio &&
    score >= config.minScore;

  return {
    classification: isCandidate ? 'likely_inactive' : 'active',
    isCandidate,
    score,
    snapshotCount: normalizedHistory.length,
    deltas,
    unchangedSteps,
    smallDeltaSteps,
    stableStepRatio,
    minPopulation,
    maxPopulation,
    populationRange,
    startPopulation,
    endPopulation,
    totalDelta,
    maxStepDeltaObserved,
    history: normalizedHistory
  };
}

function readPositiveInteger(
  overrideValue: number | undefined,
  envValue: string | undefined,
  fallback: number,
  min: number
): number {
  const candidate = overrideValue ?? parseOptionalNumber(envValue);

  if (candidate === undefined || !Number.isInteger(candidate) || candidate < min) {
    return fallback;
  }

  return candidate;
}

function readNonNegativeNumber(
  overrideValue: number | undefined,
  envValue: string | undefined,
  fallback: number
): number {
  const candidate = overrideValue ?? parseOptionalNumber(envValue);

  if (candidate === undefined || !Number.isFinite(candidate) || candidate < 0) {
    return fallback;
  }

  return candidate;
}

function readRatio(
  overrideValue: number | undefined,
  envValue: string | undefined,
  fallback: number
): number {
  return readBoundedNumber(overrideValue, envValue, fallback, 0, 1);
}

function readBoundedNumber(
  overrideValue: number | undefined,
  envValue: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const candidate = overrideValue ?? parseOptionalNumber(envValue);

  if (candidate === undefined || !Number.isFinite(candidate) || candidate < min || candidate > max) {
    return fallback;
  }

  return candidate;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampScore(score: number): number {
  if (score < 0) {
    return 0;
  }

  if (score > 100) {
    return 100;
  }

  return score;
}
