import { describe, it, expect } from 'vitest';
import {
  createVillageListEmbed,
  createVillageWithDistanceEmbed,
  createInactiveReportEmbed,
  createDiplomacyListEmbed,
  createServerInfoEmbed,
} from '../../src/discord/embeds/formatters.js';

const LANG = 'en' as const;

describe('Embed Formatters', () => {
  describe('createVillageListEmbed', () => {
    it('should create embed with villages', () => {
      const villages = [
        { villageId: 1, name: 'Village1', x: 10, y: 20, population: 100, playerName: 'Player1', allianceTag: 'ALL' },
      ];
      const embed = createVillageListEmbed(LANG, 'Test Title', villages, 1, false);
      const data = embed.toJSON();
      expect(data.title).toBe('Test Title');
      expect(data.fields).toHaveLength(1);
      expect(data.fields?.[0].name).toBe('Village1 (10|20)');
    });

    it('should show empty message when no villages', () => {
      const embed = createVillageListEmbed(LANG, 'Empty', [], 0, false);
      const data = embed.toJSON();
      expect(data.description).toBe('No villages found.');
    });

    it('should show hasMore footer when true', () => {
      const embed = createVillageListEmbed(LANG, 'Test', [], 50, true);
      const data = embed.toJSON();
      expect(data.footer?.text).toContain('more available');
    });
  });

  describe('createVillageWithDistanceEmbed', () => {
    it('should create embed with distances', () => {
      const villages = [
        { villageId: 1, name: 'Village1', x: 10, y: 20, population: 100, playerName: 'Player1', allianceTag: 'ALL', distance: 15.5 },
      ];
      const embed = createVillageWithDistanceEmbed(LANG, 'Near', villages, 1, false);
      const data = embed.toJSON();
      expect(data.fields?.[0].name).toContain('15.5 fields');
    });

    it('should show empty message when no villages', () => {
      const embed = createVillageWithDistanceEmbed(LANG, 'Empty', [], 0, false);
      const data = embed.toJSON();
      expect(data.description).toContain('No villages found');
    });
  });

  describe('createInactiveReportEmbed', () => {
    it('should create embed with inactive candidates', () => {
      const candidates = [
        {
          villageId: 1, name: 'Village1', x: 10, y: 20, population: 50, playerName: 'Player1', allianceTag: null,
          inactivityScore: 80, label: 'likely inactive',
          explanation: {
            classification: 'likely_inactive',
            isCandidate: true,
            score: 80,
            snapshotCount: 3,
            deltas: [0, 0, 0],
            unchangedSteps: 3,
            smallDeltaSteps: 3,
            stableStepRatio: 1,
            minPopulation: 50,
            maxPopulation: 50,
            populationRange: 0,
            startPopulation: 50,
            endPopulation: 50,
            totalDelta: 0,
            maxStepDeltaObserved: 0,
            history: [],
          },
        },
      ];
      const embed = createInactiveReportEmbed(LANG, 'Inactive', candidates, 1, false);
      const data = embed.toJSON();
      expect(data.fields?.[0].name).toContain('Score: 80');
      expect(data.fields?.[0].value).toContain('unchanged snapshots');
    });

    it('should show empty message when no candidates', () => {
      const embed = createInactiveReportEmbed(LANG, 'Inactive', [], 0, false);
      const data = embed.toJSON();
      expect(data.description).toBe('No inactive candidates found.');
    });
  });

  describe('createDiplomacyListEmbed', () => {
    it('should create embed with diplomacy statuses', () => {
      const statuses = [
        { allianceTag: 'ENEMY', status: 'enemy' },
        { allianceTag: 'FRIEND', status: 'ally' },
      ];
      const embed = createDiplomacyListEmbed(LANG, 'Diplomacy', statuses);
      const data = embed.toJSON();
      expect(data.fields).toHaveLength(2);
      expect(data.fields?.[0].name).toBe('ENEMY');
      expect(data.fields?.[0].value).toBe('Enemy');
    });

    it('should show empty message when no statuses', () => {
      const embed = createDiplomacyListEmbed(LANG, 'Diplomacy', []);
      const data = embed.toJSON();
      expect(data.description).toBe('No diplomacy settings configured.');
    });
  });

  describe('createServerInfoEmbed', () => {
    it('should create embed with server info', () => {
      const info = {
        'Server ID': '1',
        'Latest Snapshot': '2026-04-20T00:00:00.000Z',
        'Total Villages': '1000',
      };
      const embed = createServerInfoEmbed(LANG, 'Server Info', info);
      const data = embed.toJSON();
      expect(data.fields).toHaveLength(3);
      expect(data.fields?.[0].name).toBe('Server ID');
      expect(data.fields?.[0].value).toBe('1');
    });
  });
});
