import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from 'dotenv';
import {
  getAllianceDiplomacyStatus,
  listAllianceTagsByStatus,
  listDiplomacyStates,
  removeAllianceDiplomacyStatus,
  setAllianceDiplomacyStatus
} from '../../src/travian/diplomacy/diplomacyRepository.js';
import { findEnemyVillagesNearForGuild } from '../../src/travian/diplomacy/enemyQueries.js';
import { findEnemyVillagesNear } from '../../src/travian/queries/findEnemyVillagesNear.js';

config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe('Travian diplomacy', () => {
  const testRunId = Date.now().toString(36);
  const guildId = `diplomacy-guild-${testRunId}`;
  const otherGuildId = `diplomacy-other-guild-${testRunId}`;
  const serverName = `diplomacy-test-server-${testRunId}`;
  let serverId: number;

  beforeAll(async () => {
    const server = await prisma.server.create({
      data: {
        name: serverName,
        mapSqlUrl: 'http://test.com/diplomacy.sql.gz'
      }
    });
    serverId = server.id;

    const enemyAlliance = await prisma.alliance.create({
      data: {
        serverId,
        allianceId: 101,
        tag: 'ENEMY1'
      }
    });

    const alliedAlliance = await prisma.alliance.create({
      data: {
        serverId,
        allianceId: 102,
        tag: 'ALLY1'
      }
    });

    const mixedCaseEnemyAlliance = await prisma.alliance.create({
      data: {
        serverId,
        allianceId: 103,
        tag: 'EnemyMixed'
      }
    });

    const enemyPlayer = await prisma.player.create({
      data: {
        serverId,
        playerId: 201,
        name: 'Enemy Player',
        allianceId: enemyAlliance.id
      }
    });

    const alliedPlayer = await prisma.player.create({
      data: {
        serverId,
        playerId: 202,
        name: 'Allied Player',
        allianceId: alliedAlliance.id
      }
    });

    const mixedCaseEnemyPlayer = await prisma.player.create({
      data: {
        serverId,
        playerId: 203,
        name: 'Mixed Enemy Player',
        allianceId: mixedCaseEnemyAlliance.id
      }
    });

    const snapshot = await prisma.snapshot.create({
      data: {
        serverId,
        snapshotAt: new Date('2024-03-01T12:00:00Z'),
        totalVillages: 2,
        totalPlayers: 2,
        totalAlliances: 2
      }
    });

    const enemyVillage = await prisma.village.create({
      data: {
        serverId,
        villageId: 1001,
        name: 'Enemy Village',
        x: 2,
        y: 1,
        playerId: enemyPlayer.id,
        allianceId: enemyAlliance.id
      }
    });

    const alliedVillage = await prisma.village.create({
      data: {
        serverId,
        villageId: 1002,
        name: 'Allied Village',
        x: 1,
        y: 2,
        playerId: alliedPlayer.id,
        allianceId: alliedAlliance.id
      }
    });

    const mixedCaseEnemyVillage = await prisma.village.create({
      data: {
        serverId,
        villageId: 1003,
        name: 'Mixed Enemy Village',
        x: 3,
        y: 1,
        playerId: mixedCaseEnemyPlayer.id,
        allianceId: mixedCaseEnemyAlliance.id
      }
    });

    await prisma.villageSnapshot.createMany({
      data: [
        {
          snapshotId: snapshot.id,
          villageId: enemyVillage.id,
          population: 300,
          tribeId: 1,
          region: 'North',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: snapshot.id,
          villageId: alliedVillage.id,
          population: 320,
          tribeId: 2,
          region: 'South',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: snapshot.id,
          villageId: mixedCaseEnemyVillage.id,
          population: 280,
          tribeId: 3,
          region: 'East',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        }
      ]
    });
  });

  afterAll(async () => {
    if (serverId !== undefined) {
      const villages = await prisma.village.findMany({ where: { serverId } });
      const villageIds = villages.map(village => village.id);

      if (villageIds.length > 0) {
        await prisma.villageSnapshot.deleteMany({ where: { villageId: { in: villageIds } } });
      }

      await prisma.village.deleteMany({ where: { serverId } });
      await prisma.player.deleteMany({ where: { serverId } });
      await prisma.alliance.deleteMany({ where: { serverId } });
      await prisma.snapshot.deleteMany({ where: { serverId } });
      await prisma.server.deleteMany({ where: { id: serverId } });
    }

    try {
      await prisma.$executeRawUnsafe('DELETE FROM guild_diplomacy_settings WHERE guild_id IN ($1, $2)', guildId, otherGuildId);
    } catch {
      // Ignore cleanup errors when diplomacy tables were not created due to an earlier test failure.
    }

    await prisma.$disconnect();
    await pool.end();
  });

  it('persists diplomacy status per guild and normalizes alliance tags', async () => {
    await setAllianceDiplomacyStatus(prisma, guildId, ' enemy1 ', 'enemy');
    await setAllianceDiplomacyStatus(prisma, guildId, 'ally1', 'ally');
    await setAllianceDiplomacyStatus(prisma, otherGuildId, 'enemy1', 'ally');

    expect(await getAllianceDiplomacyStatus(prisma, guildId, 'ENEMY1')).toMatchObject({
      guildId,
      allianceTag: 'ENEMY1',
      status: 'enemy'
    });

    expect(await listDiplomacyStates(prisma, guildId)).toMatchObject([
      { allianceTag: 'ALLY1', status: 'ally' },
      { allianceTag: 'ENEMY1', status: 'enemy' }
    ]);
    expect(await listAllianceTagsByStatus(prisma, otherGuildId, 'enemy')).toEqual([]);
  });

  it('updates and removes diplomacy states', async () => {
    await setAllianceDiplomacyStatus(prisma, guildId, 'ENEMY1', 'nap');

    expect(await listAllianceTagsByStatus(prisma, guildId, 'nap')).toEqual(['ENEMY1']);

    expect(await removeAllianceDiplomacyStatus(prisma, guildId, 'ENEMY1')).toBe(true);
    expect(await getAllianceDiplomacyStatus(prisma, guildId, 'ENEMY1')).toBeNull();

    await setAllianceDiplomacyStatus(prisma, guildId, 'ENEMY1', 'enemy');
  });

  it('reuses saved diplomacy state for enemy village queries', async () => {
    await setAllianceDiplomacyStatus(prisma, guildId, 'ENEMY1', 'enemy');
    await setAllianceDiplomacyStatus(prisma, guildId, 'ALLY1', 'ally');

    const viaDiplomacy = await findEnemyVillagesNearForGuild(
      prisma,
      guildId,
      serverId,
      { x: 0, y: 0 },
      10
    );
    const direct = await findEnemyVillagesNear(prisma, serverId, ['ENEMY1'], { x: 0, y: 0 }, 10);

    expect(viaDiplomacy).toEqual(direct);
    expect(viaDiplomacy.villages).toHaveLength(1);
    expect(viaDiplomacy.villages[0]?.name).toBe('Enemy Village');
  });

  it('matches enemy alliances case-insensitively against imported alliance tags', async () => {
    await setAllianceDiplomacyStatus(prisma, guildId, ' enemyMixed ', 'enemy');

    const result = await findEnemyVillagesNearForGuild(
      prisma,
      guildId,
      serverId,
      { x: 0, y: 0 },
      10
    );

    expect(result.villages.some(village => village.name === 'Mixed Enemy Village')).toBe(true);
  });

  it('recreates the diplomacy table after it is dropped in the same process', async () => {
    await setAllianceDiplomacyStatus(prisma, guildId, 'ENEMY1', 'enemy');

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS guild_diplomacy_settings');

    await setAllianceDiplomacyStatus(prisma, guildId, 'ALLY1', 'ally');

    expect(await listAllianceTagsByStatus(prisma, guildId, 'ally')).toContain('ALLY1');
  });

  it('returns an empty result when a guild has no saved enemy alliances', async () => {
    const result = await findEnemyVillagesNearForGuild(
      prisma,
      otherGuildId,
      serverId,
      { x: 0, y: 0 },
      10
    );

    expect(result).toMatchObject({
      villages: [],
      hasMore: false,
      totalMatched: 0,
      returnedCount: 0
    });
  });
});
