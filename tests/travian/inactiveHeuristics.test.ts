import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_INACTIVE_HEURISTICS_CONFIG,
  resolveInactiveHeuristicsConfig,
  scoreVillageInactivity
} from '../../src/travian/inactiveHeuristics.js';

describe('inactiveHeuristics', () => {
  describe('resolveInactiveHeuristicsConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should merge environment values with explicit overrides', () => {
      process.env.INACTIVE_LOOKBACK_SNAPSHOTS = '10';
      process.env.INACTIVE_MAX_STEP_DELTA = '3';

      const config = resolveInactiveHeuristicsConfig({
        minHistorySnapshots: 5
      });

      expect(config).toMatchObject({
        lookbackSnapshots: 10,
        maxStepDelta: 3,
        minHistorySnapshots: 5
      });
    });

    it('should fall back to defaults for invalid environment values', () => {
      process.env.INACTIVE_LOOKBACK_SNAPSHOTS = '0';
      process.env.INACTIVE_MIN_STABLE_STEP_RATIO = 'not-a-number';

      const config = resolveInactiveHeuristicsConfig();

      expect(config.lookbackSnapshots).toBe(DEFAULT_INACTIVE_HEURISTICS_CONFIG.lookbackSnapshots);
      expect(config.minStableStepRatio).toBe(DEFAULT_INACTIVE_HEURISTICS_CONFIG.minStableStepRatio);
    });
  });

  describe('scoreVillageInactivity', () => {
    it('should classify unchanged history as likely inactive', () => {
      const result = scoreVillageInactivity([
        { snapshotId: 1, snapshotAt: new Date('2024-01-01T00:00:00Z'), population: 50 },
        { snapshotId: 2, snapshotAt: new Date('2024-01-02T00:00:00Z'), population: 50 },
        { snapshotId: 3, snapshotAt: new Date('2024-01-03T00:00:00Z'), population: 50 },
        { snapshotId: 4, snapshotAt: new Date('2024-01-04T00:00:00Z'), population: 50 }
      ]);

      expect(result.classification).toBe('likely_inactive');
      expect(result.isCandidate).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(DEFAULT_INACTIVE_HEURISTICS_CONFIG.minScore);
      expect(result.snapshotCount).toBe(4);
      expect(result.deltas).toEqual([0, 0, 0]);
      expect(result.populationRange).toBe(0);
      expect(result.maxStepDeltaObserved).toBe(0);
      expect(result.unchangedSteps).toBe(3);
    });

    it('should allow small daily population changes within the configured thresholds', () => {
      const result = scoreVillageInactivity(
        [
          { snapshotId: 1, snapshotAt: new Date('2024-01-01T00:00:00Z'), population: 90 },
          { snapshotId: 2, snapshotAt: new Date('2024-01-02T00:00:00Z'), population: 91 },
          { snapshotId: 3, snapshotAt: new Date('2024-01-03T00:00:00Z'), population: 90 },
          { snapshotId: 4, snapshotAt: new Date('2024-01-04T00:00:00Z'), population: 92 }
        ],
        {
          maxStepDelta: 2,
          maxPopulationRange: 4,
          maxTotalDelta: 3,
          minStableStepRatio: 0.75,
          minHistorySnapshots: 4
        }
      );

      expect(result.classification).toBe('likely_inactive');
      expect(result.isCandidate).toBe(true);
      expect(result.smallDeltaSteps).toBe(3);
      expect(result.maxStepDeltaObserved).toBe(2);
      expect(result.populationRange).toBe(2);
      expect(result.totalDelta).toBe(2);
      expect(result.stableStepRatio).toBe(1);
    });

    it('should classify clear growth as active', () => {
      const result = scoreVillageInactivity([
        { snapshotId: 1, snapshotAt: new Date('2024-01-01T00:00:00Z'), population: 100 },
        { snapshotId: 2, snapshotAt: new Date('2024-01-02T00:00:00Z'), population: 105 },
        { snapshotId: 3, snapshotAt: new Date('2024-01-03T00:00:00Z'), population: 111 },
        { snapshotId: 4, snapshotAt: new Date('2024-01-04T00:00:00Z'), population: 118 }
      ]);

      expect(result.classification).toBe('active');
      expect(result.isCandidate).toBe(false);
      expect(result.score).toBeLessThan(DEFAULT_INACTIVE_HEURISTICS_CONFIG.minScore);
      expect(result.populationRange).toBe(18);
      expect(result.maxStepDeltaObserved).toBe(7);
    });

    it('should report insufficient history for empty history', () => {
      const result = scoreVillageInactivity([]);

      expect(result.classification).toBe('insufficient_history');
      expect(result.isCandidate).toBe(false);
      expect(result.snapshotCount).toBe(0);
      expect(result.deltas).toEqual([]);
    });

    it('should throw for invalid history input', () => {
      expect(() => scoreVillageInactivity(undefined as never)).toThrow(TypeError);
    });
  });
});
