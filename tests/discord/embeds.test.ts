import { describe, it, expect } from 'vitest';
import {
  createVillageListEmbed,
  createVillageWithDistanceEmbed,
  createInactiveReportEmbed,
  createDiplomacyListEmbed,
  createServerInfoEmbed,
  createHelpEmbed,
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
      expect(data.fields?.[0].name).toBe('1️⃣ \u200eVillage1 (10|20)');
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
      expect(data.fields?.[0].name).toContain('Village1 🔴 (10|20)');
      expect(data.fields?.[0].value).toContain('Score: 80');
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
      expect(data.fields?.[0].value).toBe('🔴 Enemy');
    });

    it('should show empty message when no statuses', () => {
      const embed = createDiplomacyListEmbed(LANG, 'Diplomacy', []);
      const data = embed.toJSON();
      expect(data.description).toBe('No diplomacy settings configured.');
    });
  });

  describe('createServerInfoEmbed', () => {
    it('should create embed with server info using inline fields and emojis', () => {
      const info = {
        'Server ID': '1',
        'Latest Snapshot': '2026-04-20T00:00:00.000Z',
        'Total Villages': '1000',
      };
      const embed = createServerInfoEmbed(LANG, 'Server Info', info);
      const data = embed.toJSON();
      expect(data.fields).toHaveLength(5);
      expect(data.fields?.[0].name).toBe('🆔 Server ID');
      expect(data.fields?.[0].value).toBe('1');
      expect(data.fields?.[0].inline).toBe(true);
      expect(data.fields?.[1].name).toBe('📅 Latest Snapshot');
      expect(data.fields?.[2].name).toBe('\u200B');
      expect(data.fields?.[3].name).toBe('🏘️ Total Villages');
      expect(data.fields?.[4].name).toBe('\u200B');
    });
  });

  describe('createHelpEmbed', () => {
    it('should create embed with categorized commands', () => {
      const commands = [
        { name: 'alliance-near', description: 'Find nearby alliance villages' },
        { name: 'player-info', description: 'Show player info' },
        { name: 'diplomacy-set', description: 'Set diplomacy' },
        { name: 'server-info', description: 'Show server info' },
        { name: 'map-refresh', description: 'Refresh map' },
        { name: 'unknown-cmd', description: 'Unknown command' },
      ];
      const embed = createHelpEmbed(LANG, 'Help', commands);
      const data = embed.toJSON();
      expect(data.fields).toBeDefined();
      expect(data.fields!.length).toBeGreaterThan(0);
      expect(data.fields!.some(f => f.name === '🔍 Search')).toBe(true);
      expect(data.fields!.some(f => f.name === '📋 Lists')).toBe(true);
      expect(data.fields!.some(f => f.name === '⚔️ Diplomacy')).toBe(true);
      expect(data.fields!.some(f => f.name === '⚙️ Settings')).toBe(true);
      expect(data.fields!.some(f => f.name === '🛠️ Admin')).toBe(true);
      expect(data.fields!.some(f => f.name === '📦 Other')).toBe(true);
    });
  });
});
