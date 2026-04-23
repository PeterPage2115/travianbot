import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { calculateDistance } from '../../src/shared/distance.js';
import { listAllianceVillages } from '../../src/travian/queries/listAllianceVillages.js';
import { findAllianceVillagesNear } from '../../src/travian/queries/findAllianceVillagesNear.js';
import { findEnemyVillagesNear } from '../../src/travian/queries/findEnemyVillagesNear.js';
import { findInactiveCandidates } from '../../src/travian/queries/findInactiveCandidates.js';
import { listPlayerVillages } from '../../src/travian/queries/listPlayerVillages.js';
import { config } from 'dotenv';

config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe('Distance Helpers', () => {
  it('should calculate Euclidean distance correctly', () => {
    expect(calculateDistance(0, 0, 3, 4)).toBe(5);
    expect(calculateDistance(0, 0, 0, 0)).toBe(0);
    expect(calculateDistance(-10, -10, 10, 10)).toBeCloseTo(28.28, 1);
  });

  it('should calculate distance for negative coordinates', () => {
    expect(calculateDistance(-5, -5, 5, 5)).toBeCloseTo(14.14, 1);
  });

  it('should use wrap-around distance on the ROF 401x401 map', () => {
    expect(calculateDistance(-200, 0, 200, 0)).toBe(1);
    expect(calculateDistance(0, -200, 0, 200)).toBe(1);
  });
});

describe('Travian Queries - Integration', () => {
  let testServerId: number;
  let testSnapshotId: number;
  let testAllianceId: number;
  let testPlayerId: number;

  beforeAll(async () => {
    // Clean up any existing test data
    const testServers = await prisma.server.findMany({ where: { name: 'test-server' } });
    const testServerIds = testServers.map(s => s.id);
    
    if (testServerIds.length > 0) {
      const testVillages = await prisma.village.findMany({ where: { serverId: { in: testServerIds } } });
      const testVillageIds = testVillages.map(v => v.id);
      
      if (testVillageIds.length > 0) {
        await prisma.villageSnapshot.deleteMany({ where: { villageId: { in: testVillageIds } } });
      }
      
      await prisma.village.deleteMany({ where: { serverId: { in: testServerIds } } });
      await prisma.player.deleteMany({ where: { serverId: { in: testServerIds } } });
      await prisma.alliance.deleteMany({ where: { serverId: { in: testServerIds } } });
      await prisma.snapshot.deleteMany({ where: { serverId: { in: testServerIds } } });
      await prisma.server.deleteMany({ where: { id: { in: testServerIds } } });
    }

    // Create test server
    const server = await prisma.server.create({
      data: {
        name: 'test-server',
        mapSqlUrl: 'http://test.com/sql.sql.gz'
      }
    });
    testServerId = server.id;

    // Create test alliance
    const alliance = await prisma.alliance.create({
      data: {
        serverId: testServerId,
        allianceId: 1,
        tag: 'TEST'
      }
    });
    testAllianceId = alliance.id;

    // Create test player
    const player = await prisma.player.create({
      data: {
        serverId: testServerId,
        playerId: 1,
        name: 'TestPlayer',
        allianceId: testAllianceId
      }
    });
    testPlayerId = player.id;

    // Create test snapshot
    const snapshot = await prisma.snapshot.create({
      data: {
        serverId: testServerId,
        snapshotAt: new Date('2024-01-01T12:00:00Z'),
        totalVillages: 5,
        totalPlayers: 1,
        totalAlliances: 1
      }
    });
    testSnapshotId = snapshot.id;

    // Create test villages with coordinates
    const village1 = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 1,
        name: 'Village 1',
        x: 0,
        y: 0,
        playerId: testPlayerId,
        allianceId: testAllianceId
      }
    });

    const village2 = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 2,
        name: 'Village 2',
        x: 3,
        y: 4,
        playerId: testPlayerId,
        allianceId: testAllianceId
      }
    });

    const village3 = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 3,
        name: 'Village 3',
        x: 10,
        y: 10,
        playerId: testPlayerId,
        allianceId: testAllianceId
      }
    });

    const staleVillage = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 7,
        name: 'Stale Village',
        x: 1,
        y: 1,
        playerId: testPlayerId,
        allianceId: testAllianceId
      }
    });

    // Create enemy alliances for enemy lookup tests
    const enemyAlliance1 = await prisma.alliance.create({
      data: {
        serverId: testServerId,
        allianceId: 2,
        tag: 'ENEMY1'
      }
    });

    const enemyAlliance2 = await prisma.alliance.create({
      data: {
        serverId: testServerId,
        allianceId: 3,
        tag: 'ENEMY2'
      }
    });

    const enemyPlayer1 = await prisma.player.create({
      data: {
        serverId: testServerId,
        playerId: 2,
        name: 'EnemyPlayer1',
        allianceId: enemyAlliance1.id
      }
    });

    const enemyPlayer2 = await prisma.player.create({
      data: {
        serverId: testServerId,
        playerId: 3,
        name: 'EnemyPlayer2',
        allianceId: enemyAlliance2.id
      }
    });

    // Enemy villages near center
    const enemyVillage1 = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 4,
        name: 'Enemy Village 1',
        x: 2,
        y: 1,
        playerId: enemyPlayer1.id,
        allianceId: enemyAlliance1.id
      }
    });

    const enemyVillage2 = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 5,
        name: 'Enemy Village 2',
        x: 1,
        y: 2,
        playerId: enemyPlayer2.id,
        allianceId: enemyAlliance2.id
      }
    });

    const enemyVillage3 = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 6,
        name: 'Enemy Village 3 Far',
        x: 50,
        y: 50,
        playerId: enemyPlayer1.id,
        allianceId: enemyAlliance1.id
      }
    });

    const staleEnemyVillage = await prisma.village.create({
      data: {
        serverId: testServerId,
        villageId: 8,
        name: 'Stale Enemy Village',
        x: 2,
        y: 0,
        playerId: enemyPlayer1.id,
        allianceId: enemyAlliance1.id
      }
    });

    // Create village snapshots
    await prisma.villageSnapshot.createMany({
      data: [
        {
          snapshotId: testSnapshotId,
          villageId: village1.id,
          population: 500,
          tribeId: 1,
          region: 'Center',
          isCapital: true,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: testSnapshotId,
          villageId: village2.id,
          population: 300,
          tribeId: 1,
          region: 'North',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: testSnapshotId,
          villageId: village3.id,
          population: 400,
          tribeId: 1,
          region: 'South',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: testSnapshotId,
          villageId: enemyVillage1.id,
          population: 600,
          tribeId: 2,
          region: 'East',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: testSnapshotId,
          villageId: enemyVillage2.id,
          population: 550,
          tribeId: 2,
          region: 'West',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: testSnapshotId,
          villageId: enemyVillage3.id,
          population: 700,
          tribeId: 2,
          region: 'Far',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        }
      ]
    });

    // Create an older snapshot
    const oldSnapshot = await prisma.snapshot.create({
      data: {
        serverId: testServerId,
        snapshotAt: new Date('2024-01-01T00:00:00Z'),
        totalVillages: 2,
        totalPlayers: 1,
        totalAlliances: 1
      }
    });

    // Add snapshot for one village in old snapshot (should be ignored)
    await prisma.villageSnapshot.create({
      data: {
        snapshotId: oldSnapshot.id,
        villageId: village1.id,
        population: 100,
        tribeId: 1,
        region: 'Center',
        isCapital: true,
        isCity: false,
        hasHarbor: false,
        victoryPoints: 0
      }
    });

    await prisma.villageSnapshot.createMany({
      data: [
        {
          snapshotId: oldSnapshot.id,
          villageId: staleVillage.id,
          population: 250,
          tribeId: 1,
          region: 'Center',
          isCapital: false,
          isCity: false,
          hasHarbor: false,
          victoryPoints: 0
        },
        {
          snapshotId: oldSnapshot.id,
          villageId: staleEnemyVillage.id,
          population: 350,
          tribeId: 2,
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
    // Clean up test data
    const testVillages = await prisma.village.findMany({ where: { serverId: testServerId } });
    const testVillageIds = testVillages.map(v => v.id);
    
    if (testVillageIds.length > 0) {
      await prisma.villageSnapshot.deleteMany({ where: { villageId: { in: testVillageIds } } });
    }
    
    await prisma.village.deleteMany({ where: { serverId: testServerId } });
    await prisma.player.deleteMany({ where: { serverId: testServerId } });
    await prisma.alliance.deleteMany({ where: { serverId: testServerId } });
    await prisma.snapshot.deleteMany({ where: { serverId: testServerId } });
    await prisma.server.deleteMany({ where: { id: testServerId } });
    await prisma.$disconnect();
    await pool.end();
  });

  describe('listAllianceVillages', () => {
    it('should list all villages for an alliance tag', async () => {
      const result = await listAllianceVillages(prisma, testServerId, 'TEST');
      
      expect(result.villages).toHaveLength(3);
      expect(result.villages[0]).toMatchObject({
        name: 'Village 1',
        x: 0,
        y: 0
      });
    });

    it('should use latest snapshot only', async () => {
      const result = await listAllianceVillages(prisma, testServerId, 'TEST');
      
      // Should have 3 villages from latest snapshot, not 1 from old snapshot
      expect(result.villages).toHaveLength(3);
      expect(result.villages.find(v => v.name === 'Village 1')?.population).toBe(500);
    });

    it('should exclude alliance villages missing from the latest snapshot', async () => {
      const result = await listAllianceVillages(prisma, testServerId, 'TEST');

      expect(result.villages.some(v => v.name === 'Stale Village')).toBe(false);
      expect(result.totalMatched).toBe(3);
    });

    it('should return empty for non-existent alliance', async () => {
      const result = await listAllianceVillages(prisma, testServerId, 'NONEXIST');
      
      expect(result.villages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should respect limit option', async () => {
      const result = await listAllianceVillages(prisma, testServerId, 'TEST', { limit: 2 });
      
      expect(result.villages).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('findAllianceVillagesNear', () => {
    it('should find villages within radius', async () => {
      const result = await findAllianceVillagesNear(prisma, testServerId, 'TEST', { x: 0, y: 0 }, 6);
      
      // Village 1 (0,0) distance 0, Village 2 (3,4) distance 5 should be included
      // Village 3 (10,10) distance ~14.14 should be excluded
      expect(result.villages).toHaveLength(2);
      expect(result.villages.some(v => v.name === 'Village 1')).toBe(true);
      expect(result.villages.some(v => v.name === 'Village 2')).toBe(true);
      expect(result.villages.some(v => v.name === 'Village 3')).toBe(false);
    });

    it('should include distance in results', async () => {
      const result = await findAllianceVillagesNear(prisma, testServerId, 'TEST', { x: 0, y: 0 }, 6);
      
      const village1 = result.villages.find(v => v.name === 'Village 1');
      const village2 = result.villages.find(v => v.name === 'Village 2');
      
      expect(village1?.distance).toBe(0);
      expect(village2?.distance).toBe(5);
    });

    it('should sort by distance ascending', async () => {
      const result = await findAllianceVillagesNear(prisma, testServerId, 'TEST', { x: 0, y: 0 }, 20);
      
      expect(result.villages[0].distance).toBeLessThanOrEqual(result.villages[1].distance);
      expect(result.villages[1].distance).toBeLessThanOrEqual(result.villages[2].distance);
    });

    it('should respect limit with hasMore', async () => {
      const result = await findAllianceVillagesNear(prisma, testServerId, 'TEST', { x: 0, y: 0 }, 20, { limit: 2 });
      
      expect(result.villages).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('should exclude stale alliance villages from radius results', async () => {
      const result = await findAllianceVillagesNear(prisma, testServerId, 'TEST', { x: 0, y: 0 }, 5);

      expect(result.villages.some(v => v.name === 'Stale Village')).toBe(false);
      expect(result.totalMatched).toBe(2);
    });
  });

  describe('listPlayerVillages', () => {
    it('should list villages by player name', async () => {
      const result = await listPlayerVillages(prisma, testServerId, 'TestPlayer');
      
      expect(result.villages).toHaveLength(3);
    });

    it('should use latest snapshot', async () => {
      const result = await listPlayerVillages(prisma, testServerId, 'TestPlayer');
      
      const village1 = result.villages.find(v => v.name === 'Village 1');
      expect(village1?.population).toBe(500); // From latest snapshot, not 100 from old
    });

    it('should exclude player villages missing from the latest snapshot', async () => {
      const result = await listPlayerVillages(prisma, testServerId, 'TestPlayer');

      expect(result.villages.some(v => v.name === 'Stale Village')).toBe(false);
      expect(result.totalMatched).toBe(3);
    });

    it('should return empty for non-existent player', async () => {
      const result = await listPlayerVillages(prisma, testServerId, 'NonExistentPlayer');
      
      expect(result.villages).toHaveLength(0);
    });

    it('should respect limit option', async () => {
      const result = await listPlayerVillages(prisma, testServerId, 'TestPlayer', { limit: 2 });
      
      expect(result.villages).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('should include pagination metadata', async () => {
      const result = await listPlayerVillages(prisma, testServerId, 'TestPlayer', { limit: 2 });
      
      expect(result.totalMatched).toBe(3);
      expect(result.returnedCount).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('Pagination Metadata', () => {
    it('should include totalMatched in alliance queries', async () => {
      const result = await listAllianceVillages(prisma, testServerId, 'TEST');
      
      expect(result.totalMatched).toBe(3);
      expect(result.returnedCount).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should include totalMatched with limit', async () => {
      const result = await listAllianceVillages(prisma, testServerId, 'TEST', { limit: 1 });
      
      expect(result.totalMatched).toBe(3);
      expect(result.returnedCount).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should include totalMatched in radius queries', async () => {
      const result = await findAllianceVillagesNear(prisma, testServerId, 'TEST', { x: 0, y: 0 }, 6);
      
      expect(result.totalMatched).toBe(2);
      expect(result.returnedCount).toBe(2);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('findEnemyVillagesNear', () => {
    it('should find villages for multiple enemy alliance tags', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        ['ENEMY1', 'ENEMY2'],
        { x: 0, y: 0 },
        5
      );
      
      // Both Enemy Village 1 (2,1) and Enemy Village 2 (1,2) should be within radius 5
      expect(result.villages).toHaveLength(2);
      expect(result.villages.some(v => v.name === 'Enemy Village 1')).toBe(true);
      expect(result.villages.some(v => v.name === 'Enemy Village 2')).toBe(true);
    });

    it('should exclude enemy villages missing from the latest snapshot', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        ['ENEMY1', 'ENEMY2'],
        { x: 0, y: 0 },
        5
      );

      expect(result.villages.some(v => v.name === 'Stale Enemy Village')).toBe(false);
      expect(result.totalMatched).toBe(2);
    });

    it('should exclude far villages outside radius', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        ['ENEMY1', 'ENEMY2'],
        { x: 0, y: 0 },
        10
      );
      
      // Enemy Village 3 Far (50,50) should not be included
      expect(result.villages.every(v => v.name !== 'Enemy Village 3 Far')).toBe(true);
    });

    it('should work with single enemy alliance', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        ['ENEMY1'],
        { x: 0, y: 0 },
        10
      );
      
      expect(result.villages).toHaveLength(1);
      expect(result.villages[0].name).toBe('Enemy Village 1');
      expect(result.villages[0].allianceTag).toBe('ENEMY1');
    });

    it('should return empty for no enemy alliances', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        [],
        { x: 0, y: 0 },
        10
      );
      
      expect(result.villages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should include distance and sort by distance', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        ['ENEMY1', 'ENEMY2'],
        { x: 0, y: 0 },
        10
      );
      
      expect(result.villages[0].distance).toBeDefined();
      expect(result.villages[0].distance).toBeLessThanOrEqual(result.villages[1].distance);
    });

    it('should respect limit and return pagination metadata', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        ['ENEMY1', 'ENEMY2'],
        { x: 0, y: 0 },
        10,
        { limit: 1 }
      );
      
      expect(result.returnedCount).toBe(1);
      expect(result.totalMatched).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should use latest snapshot only', async () => {
      const result = await findEnemyVillagesNear(
        prisma,
        testServerId,
        ['ENEMY1'],
        { x: 0, y: 0 },
        10
      );
      
      expect(result.villages[0].population).toBe(600); // Latest snapshot, not old
    });

    it('should use villageId ordering for limited alliance lists', async () => {
      const orderedServer = await prisma.server.create({
        data: {
          name: 'ordered-test-server',
          mapSqlUrl: 'http://test.com/ordered.sql.gz'
        }
      });

      try {
        const orderedAlliance = await prisma.alliance.create({
          data: {
            serverId: orderedServer.id,
            allianceId: 10,
            tag: 'ORDER'
          }
        });

        const orderedPlayer = await prisma.player.create({
          data: {
            serverId: orderedServer.id,
            playerId: 10,
            name: 'OrderPlayer',
            allianceId: orderedAlliance.id
          }
        });

        const orderedSnapshot = await prisma.snapshot.create({
          data: {
            serverId: orderedServer.id,
            snapshotAt: new Date('2024-02-01T12:00:00Z'),
            totalVillages: 3,
            totalPlayers: 1,
            totalAlliances: 1
          }
        });

        const insertedVillages = [
          await prisma.village.create({
            data: {
              serverId: orderedServer.id,
              villageId: 30,
              name: 'Village 30',
              x: 0,
              y: 0,
              playerId: orderedPlayer.id,
              allianceId: orderedAlliance.id
            }
          }),
          await prisma.village.create({
            data: {
              serverId: orderedServer.id,
              villageId: 10,
              name: 'Village 10',
              x: 1,
              y: 0,
              playerId: orderedPlayer.id,
              allianceId: orderedAlliance.id
            }
          }),
          await prisma.village.create({
            data: {
              serverId: orderedServer.id,
              villageId: 20,
              name: 'Village 20',
              x: 2,
              y: 0,
              playerId: orderedPlayer.id,
              allianceId: orderedAlliance.id
            }
          })
        ];

        await prisma.villageSnapshot.createMany({
          data: insertedVillages.map((village, index) => ({
            snapshotId: orderedSnapshot.id,
            villageId: village.id,
            population: 100 + index,
            tribeId: 1,
            region: 'Order',
            isCapital: false,
            isCity: false,
            hasHarbor: false,
            victoryPoints: 0
          }))
        });

        const result = await listAllianceVillages(prisma, orderedServer.id, 'ORDER', { limit: 2 });

        expect(result.villages.map(v => v.villageId)).toEqual([10, 20]);
      } finally {
        const villages = await prisma.village.findMany({ where: { serverId: orderedServer.id } });
        const villageIds = villages.map(v => v.id);

        if (villageIds.length > 0) {
          await prisma.villageSnapshot.deleteMany({ where: { villageId: { in: villageIds } } });
        }

        await prisma.village.deleteMany({ where: { serverId: orderedServer.id } });
        await prisma.player.deleteMany({ where: { serverId: orderedServer.id } });
        await prisma.alliance.deleteMany({ where: { serverId: orderedServer.id } });
        await prisma.snapshot.deleteMany({ where: { serverId: orderedServer.id } });
        await prisma.server.deleteMany({ where: { id: orderedServer.id } });
      }
    });
  });

  describe('findInactiveCandidates', () => {
    it('should return likely inactive villages from the latest snapshot with audit data', async () => {
      const inactiveServerName = `inactive-test-server-${Date.now()}-${Math.round(Math.random() * 100000)}`;
      const inactiveServer = await prisma.server.create({
        data: {
          name: inactiveServerName,
          mapSqlUrl: 'http://test.com/inactive.sql.gz'
        }
      });

      try {
        const alliance = await prisma.alliance.create({
          data: {
            serverId: inactiveServer.id,
            allianceId: 50,
            tag: 'FARM'
          }
        });

        const player = await prisma.player.create({
          data: {
            serverId: inactiveServer.id,
            playerId: 50,
            name: 'Farmer',
            allianceId: alliance.id
          }
        });

        const flatVillage = await prisma.village.create({
          data: {
            serverId: inactiveServer.id,
            villageId: 100,
            name: 'Flat Farm',
            x: 0,
            y: 0,
            playerId: player.id,
            allianceId: alliance.id
          }
        });

        const slowVillage = await prisma.village.create({
          data: {
            serverId: inactiveServer.id,
            villageId: 101,
            name: 'Slow Farm',
            x: 1,
            y: 1,
            playerId: player.id,
            allianceId: alliance.id
          }
        });

        const activeVillage = await prisma.village.create({
          data: {
            serverId: inactiveServer.id,
            villageId: 102,
            name: 'Active Village',
            x: 2,
            y: 2,
            playerId: player.id,
            allianceId: alliance.id
          }
        });

        const newVillage = await prisma.village.create({
          data: {
            serverId: inactiveServer.id,
            villageId: 103,
            name: 'New Village',
            x: 3,
            y: 3,
            playerId: player.id,
            allianceId: alliance.id
          }
        });

        const staleVillage = await prisma.village.create({
          data: {
            serverId: inactiveServer.id,
            villageId: 104,
            name: 'Stale Village',
            x: 4,
            y: 4,
            playerId: player.id,
            allianceId: alliance.id
          }
        });

        const snapshots = await Promise.all([
          prisma.snapshot.create({
            data: {
              serverId: inactiveServer.id,
              snapshotAt: new Date('2024-02-01T00:00:00Z'),
              totalVillages: 4,
              totalPlayers: 1,
              totalAlliances: 1
            }
          }),
          prisma.snapshot.create({
            data: {
              serverId: inactiveServer.id,
              snapshotAt: new Date('2024-02-02T00:00:00Z'),
              totalVillages: 4,
              totalPlayers: 1,
              totalAlliances: 1
            }
          }),
          prisma.snapshot.create({
            data: {
              serverId: inactiveServer.id,
              snapshotAt: new Date('2024-02-03T00:00:00Z'),
              totalVillages: 4,
              totalPlayers: 1,
              totalAlliances: 1
            }
          }),
          prisma.snapshot.create({
            data: {
              serverId: inactiveServer.id,
              snapshotAt: new Date('2024-02-04T00:00:00Z'),
              totalVillages: 4,
              totalPlayers: 1,
              totalAlliances: 1
            }
          })
        ]);

        await prisma.villageSnapshot.createMany({
          data: [
            { snapshotId: snapshots[0].id, villageId: flatVillage.id, population: 50, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[1].id, villageId: flatVillage.id, population: 50, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[2].id, villageId: flatVillage.id, population: 50, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[3].id, villageId: flatVillage.id, population: 50, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[0].id, villageId: slowVillage.id, population: 90, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[1].id, villageId: slowVillage.id, population: 91, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[2].id, villageId: slowVillage.id, population: 90, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[3].id, villageId: slowVillage.id, population: 92, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[0].id, villageId: activeVillage.id, population: 100, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[1].id, villageId: activeVillage.id, population: 105, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[2].id, villageId: activeVillage.id, population: 111, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[3].id, villageId: activeVillage.id, population: 118, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[2].id, villageId: newVillage.id, population: 70, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[3].id, villageId: newVillage.id, population: 70, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[0].id, villageId: staleVillage.id, population: 40, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[1].id, villageId: staleVillage.id, population: 40, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[2].id, villageId: staleVillage.id, population: 40, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 }
          ]
        });

        const result = await findInactiveCandidates(prisma, inactiveServer.id, {
          limit: 10,
          heuristics: { minHistorySnapshots: 3 }
        });

        expect(result.villages.map(v => v.name)).toEqual(['Flat Farm', 'Slow Farm']);
        expect(result.villages[0]).toMatchObject({
          label: 'likely inactive',
          population: 50,
          explanation: {
            snapshotCount: 4,
            populationRange: 0,
            totalDelta: 0
          }
        });
        expect(result.villages[1].explanation.maxPopulation).toBe(92);
        expect(result.villages[1].explanation.deltas).toEqual([1, -1, 2]);
        expect(result.totalMatched).toBe(2);
        expect(result.snapshotWindow.consideredSnapshotCount).toBe(4);
      } finally {
        const villages = await prisma.village.findMany({ where: { serverId: inactiveServer.id } });
        const villageIds = villages.map(v => v.id);

        if (villageIds.length > 0) {
          await prisma.villageSnapshot.deleteMany({ where: { villageId: { in: villageIds } } });
        }

        await prisma.village.deleteMany({ where: { serverId: inactiveServer.id } });
        await prisma.player.deleteMany({ where: { serverId: inactiveServer.id } });
        await prisma.alliance.deleteMany({ where: { serverId: inactiveServer.id } });
        await prisma.snapshot.deleteMany({ where: { serverId: inactiveServer.id } });
        await prisma.server.deleteMany({ where: { id: inactiveServer.id } });
      }
    });

    it('should respect configurable thresholds and pagination metadata', async () => {
      const configuredServerName = `inactive-config-test-server-${Date.now()}-${Math.round(Math.random() * 100000)}`;
      const configuredServer = await prisma.server.create({
        data: {
          name: configuredServerName,
          mapSqlUrl: 'http://test.com/inactive-config.sql.gz'
        }
      });

      try {
        const player = await prisma.player.create({
          data: {
            serverId: configuredServer.id,
            playerId: 51,
            name: 'Config Farmer'
          }
        });

        const strictVillage = await prisma.village.create({
          data: {
            serverId: configuredServer.id,
            villageId: 200,
            name: 'Strict Farm',
            x: 0,
            y: 0,
            playerId: player.id
          }
        });

        const borderlineVillage = await prisma.village.create({
          data: {
            serverId: configuredServer.id,
            villageId: 201,
            name: 'Borderline Farm',
            x: 1,
            y: 1,
            playerId: player.id
          }
        });

        const snapshots = await Promise.all([
          prisma.snapshot.create({
            data: {
              serverId: configuredServer.id,
              snapshotAt: new Date('2024-03-01T00:00:00Z'),
              totalVillages: 2,
              totalPlayers: 1,
              totalAlliances: 0
            }
          }),
          prisma.snapshot.create({
            data: {
              serverId: configuredServer.id,
              snapshotAt: new Date('2024-03-02T00:00:00Z'),
              totalVillages: 2,
              totalPlayers: 1,
              totalAlliances: 0
            }
          }),
          prisma.snapshot.create({
            data: {
              serverId: configuredServer.id,
              snapshotAt: new Date('2024-03-03T00:00:00Z'),
              totalVillages: 2,
              totalPlayers: 1,
              totalAlliances: 0
            }
          }),
          prisma.snapshot.create({
            data: {
              serverId: configuredServer.id,
              snapshotAt: new Date('2024-03-04T00:00:00Z'),
              totalVillages: 2,
              totalPlayers: 1,
              totalAlliances: 0
            }
          })
        ]);

        await prisma.villageSnapshot.createMany({
          data: [
            { snapshotId: snapshots[0].id, villageId: strictVillage.id, population: 40, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[1].id, villageId: strictVillage.id, population: 40, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[2].id, villageId: strictVillage.id, population: 40, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[3].id, villageId: strictVillage.id, population: 40, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[0].id, villageId: borderlineVillage.id, population: 60, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[1].id, villageId: borderlineVillage.id, population: 61, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[2].id, villageId: borderlineVillage.id, population: 61, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 },
            { snapshotId: snapshots[3].id, villageId: borderlineVillage.id, population: 62, tribeId: 1, region: 'Farm', isCapital: false, isCity: false, hasHarbor: false, victoryPoints: 0 }
          ]
        });

        const result = await findInactiveCandidates(prisma, configuredServer.id, {
          limit: 1,
          heuristics: {
            lookbackSnapshots: 3,
            minHistorySnapshots: 3,
            maxStepDelta: 0,
            maxPopulationRange: 1,
            maxTotalDelta: 1
          }
        });

        expect(result.villages).toHaveLength(1);
        expect(result.villages[0].name).toBe('Strict Farm');
        expect(result.villages[0].explanation.snapshotCount).toBe(3);
        expect(result.totalMatched).toBe(1);
        expect(result.returnedCount).toBe(1);
        expect(result.hasMore).toBe(false);
        expect(result.appliedConfig.lookbackSnapshots).toBe(3);
      } finally {
        const villages = await prisma.village.findMany({ where: { serverId: configuredServer.id } });
        const villageIds = villages.map(v => v.id);

        if (villageIds.length > 0) {
          await prisma.villageSnapshot.deleteMany({ where: { villageId: { in: villageIds } } });
        }

        await prisma.village.deleteMany({ where: { serverId: configuredServer.id } });
        await prisma.player.deleteMany({ where: { serverId: configuredServer.id } });
        await prisma.alliance.deleteMany({ where: { serverId: configuredServer.id } });
        await prisma.snapshot.deleteMany({ where: { serverId: configuredServer.id } });
        await prisma.server.deleteMany({ where: { id: configuredServer.id } });
      }
    });
  });
});
