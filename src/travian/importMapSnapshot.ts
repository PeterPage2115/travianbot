import { PrismaClient } from '@prisma/client';
import { downloadMapSql } from './mapSqlDownloader.js';
import { parseMapSqlFile, type ParsedMapRow } from './mapSqlParser.js';

export interface ImportResult {
  snapshotId: number;
  snapshotAt: Date;
  totalVillages: number;
  totalPlayers: number;
  totalAlliances: number;
}

/**
 * Import a map.sql snapshot for a server
 * This is a transactional operation that:
 * 1. Downloads the map.sql file
 * 2. Parses all records
 * 3. Creates/updates alliances, players, villages in batches
 * 4. Creates a snapshot record with village snapshots
 */
export async function importMapSnapshot(
  prisma: PrismaClient,
  serverId: number,
  mapSqlUrl: string,
  serverName?: string
): Promise<ImportResult> {
  // Download and parse
  const content = await downloadMapSql(mapSqlUrl);
  const records = parseMapSqlFile(content);
  
  if (records.length === 0) {
    throw new Error('No records found in map.sql');
  }
  
  // Use a transaction for consistency
  return await prisma.$transaction(async (tx) => {
    // Ensure the server record exists
    await tx.server.upsert({
      where: { id: serverId },
      update: { mapSqlUrl },
      create: {
        id: serverId,
        name: serverName ?? `Server ${serverId}`,
        mapSqlUrl,
      },
    });

    const snapshotAt = new Date();
    
    // Track unique alliances, players, villages
    const allianceMap = new Map<number, { tag: string }>();
    const playerMap = new Map<number, { name: string; allianceId: number | null }>();
    const villageMap = new Map<number, ParsedMapRow>();
    
    for (const record of records) {
      // Track alliances (skip alliance_id=0, which means no alliance)
      if (record.allianceId !== 0 && !allianceMap.has(record.allianceId)) {
        allianceMap.set(record.allianceId, { tag: record.allianceTag });
      }
      
      // Track players
      if (!playerMap.has(record.playerId)) {
        playerMap.set(record.playerId, {
          name: record.playerName,
          allianceId: record.allianceId === 0 ? null : record.allianceId,
        });
      }
      
      // Track villages
      villageMap.set(record.villageId, record);
    }
    
    // Process alliances in batches
    const allianceDbIds = new Map<number, number>();
    const allianceGameIds = Array.from(allianceMap.keys());
    
    // Fetch existing alliances
    const existingAlliances = await tx.alliance.findMany({
      where: {
        serverId,
        allianceId: { in: allianceGameIds },
      },
      select: { id: true, allianceId: true, tag: true },
    });
    
    // Map existing alliances and identify what needs updating
    const alliancesToUpdate: Array<{ allianceId: number; tag: string }> = [];
    for (const existing of existingAlliances) {
      allianceDbIds.set(existing.allianceId, existing.id);
      const newData = allianceMap.get(existing.allianceId);
      if (newData && newData.tag !== existing.tag) {
        alliancesToUpdate.push({ allianceId: existing.allianceId, tag: newData.tag });
      }
    }
    
    // Create new alliances in batch
    const existingAllianceIds = new Set(existingAlliances.map(a => a.allianceId));
    const newAllianceData = allianceGameIds
      .filter(id => !existingAllianceIds.has(id))
      .map(allianceId => ({
        serverId,
        allianceId,
        tag: allianceMap.get(allianceId)!.tag,
      }));
    
    if (newAllianceData.length > 0) {
      await tx.alliance.createMany({ data: newAllianceData, skipDuplicates: true });
      
      // Fetch the newly created alliances to get their DB IDs
      const newAlliances = await tx.alliance.findMany({
        where: {
          serverId,
          allianceId: { in: newAllianceData.map(a => a.allianceId) },
        },
        select: { id: true, allianceId: true },
      });
      
      for (const alliance of newAlliances) {
        allianceDbIds.set(alliance.allianceId, alliance.id);
      }
    }
    
    // Update changed alliances
    for (const { allianceId, tag } of alliancesToUpdate) {
      await tx.alliance.update({
        where: { serverId_allianceId: { serverId, allianceId } },
        data: { tag },
      });
    }
    
    // Process players in batches
    const playerDbIds = new Map<number, number>();
    const playerGameIds = Array.from(playerMap.keys());
    
    // Fetch existing players
    const existingPlayers = await tx.player.findMany({
      where: {
        serverId,
        playerId: { in: playerGameIds },
      },
      select: { id: true, playerId: true, name: true, allianceId: true },
    });
    
    // Map existing players and identify what needs updating
    const playersToUpdate: Array<{ playerId: number; name: string; allianceId: number | null }> = [];
    for (const existing of existingPlayers) {
      playerDbIds.set(existing.playerId, existing.id);
      const newData = playerMap.get(existing.playerId);
      if (newData) {
        const newAllianceDbId = newData.allianceId ? allianceDbIds.get(newData.allianceId) ?? null : null;
        if (newData.name !== existing.name || newAllianceDbId !== existing.allianceId) {
          playersToUpdate.push({ 
            playerId: existing.playerId, 
            name: newData.name, 
            allianceId: newAllianceDbId 
          });
        }
      }
    }
    
    // Create new players in batch
    const existingPlayerIds = new Set(existingPlayers.map(p => p.playerId));
    const newPlayerData = playerGameIds
      .filter(id => !existingPlayerIds.has(id))
      .map(playerId => {
        const data = playerMap.get(playerId)!;
        return {
          serverId,
          playerId,
          name: data.name,
          allianceId: data.allianceId ? allianceDbIds.get(data.allianceId) ?? null : null,
        };
      });
    
    if (newPlayerData.length > 0) {
      await tx.player.createMany({ data: newPlayerData, skipDuplicates: true });
      
      // Fetch the newly created players to get their DB IDs
      const newPlayers = await tx.player.findMany({
        where: {
          serverId,
          playerId: { in: newPlayerData.map(p => p.playerId) },
        },
        select: { id: true, playerId: true },
      });
      
      for (const player of newPlayers) {
        playerDbIds.set(player.playerId, player.id);
      }
    }
    
    // Update changed players
    for (const { playerId, name, allianceId } of playersToUpdate) {
      await tx.player.update({
        where: { serverId_playerId: { serverId, playerId } },
        data: { name, allianceId },
      });
    }
    
    // Process villages in batches
    const villageDbIds = new Map<number, number>();
    const villageGameIds = Array.from(villageMap.keys());
    
    // Fetch existing villages
    const existingVillages = await tx.village.findMany({
      where: {
        serverId,
        villageId: { in: villageGameIds },
      },
      select: { id: true, villageId: true, name: true, x: true, y: true, playerId: true, allianceId: true },
    });
    
    // Map existing villages and identify what needs updating
    const villagesToUpdate: Array<{ 
      villageId: number; 
      name: string; 
      x: number; 
      y: number; 
      playerId: number | null; 
      allianceId: number | null 
    }> = [];
    
    for (const existing of existingVillages) {
      villageDbIds.set(existing.villageId, existing.id);
      const record = villageMap.get(existing.villageId);
      if (record) {
        const playerDbId = playerDbIds.get(record.playerId) ?? null;
        const allianceDbId = record.allianceId !== 0 
          ? allianceDbIds.get(record.allianceId) ?? null 
          : null;
        
        if (record.villageName !== existing.name || 
            record.x !== existing.x || 
            record.y !== existing.y || 
            playerDbId !== existing.playerId || 
            allianceDbId !== existing.allianceId) {
          villagesToUpdate.push({
            villageId: existing.villageId,
            name: record.villageName,
            x: record.x,
            y: record.y,
            playerId: playerDbId,
            allianceId: allianceDbId,
          });
        }
      }
    }
    
    // Create new villages in batch
    const existingVillageIds = new Set(existingVillages.map(v => v.villageId));
    const newVillageData = villageGameIds
      .filter(id => !existingVillageIds.has(id))
      .map(villageId => {
        const record = villageMap.get(villageId)!;
        const playerDbId = playerDbIds.get(record.playerId) ?? null;
        const allianceDbId = record.allianceId !== 0 
          ? allianceDbIds.get(record.allianceId) ?? null 
          : null;
        
        return {
          serverId,
          villageId,
          name: record.villageName,
          x: record.x,
          y: record.y,
          playerId: playerDbId,
          allianceId: allianceDbId,
        };
      });
    
    if (newVillageData.length > 0) {
      await tx.village.createMany({ data: newVillageData, skipDuplicates: true });
      
      // Fetch the newly created villages to get their DB IDs
      const newVillages = await tx.village.findMany({
        where: {
          serverId,
          villageId: { in: newVillageData.map(v => v.villageId) },
        },
        select: { id: true, villageId: true },
      });
      
      for (const village of newVillages) {
        villageDbIds.set(village.villageId, village.id);
      }
    }
    
    // Update changed villages
    for (const { villageId, name, x, y, playerId, allianceId } of villagesToUpdate) {
      await tx.village.update({
        where: { serverId_villageId: { serverId, villageId } },
        data: { name, x, y, playerId, allianceId },
      });
    }
    
    // Create snapshot
    const snapshot = await tx.snapshot.create({
      data: {
        serverId,
        snapshotAt,
        totalVillages: villageMap.size,
        totalPlayers: playerMap.size,
        totalAlliances: allianceMap.size,
      },
    });
    
    // Create village snapshots in batches
    const BATCH_SIZE = 1000;
    const villageSnapshotData = records.map(record => {
      const villageDbId = villageDbIds.get(record.villageId);
      if (!villageDbId) return null;
      
      return {
        snapshotId: snapshot.id,
        villageId: villageDbId,
        population: record.population,
        tribeId: record.tribeId,
        region: record.region,
        isCapital: record.isCapital,
        isCity: record.isCity,
        hasHarbor: record.hasHarbor,
        victoryPoints: record.victoryPoints,
      };
    }).filter((data): data is NonNullable<typeof data> => data !== null);
    
    // Insert village snapshots in batches
    for (let i = 0; i < villageSnapshotData.length; i += BATCH_SIZE) {
      const batch = villageSnapshotData.slice(i, i + BATCH_SIZE);
      await tx.villageSnapshot.createMany({ data: batch });
    }
    
    return {
      snapshotId: snapshot.id,
      snapshotAt: snapshot.snapshotAt,
      totalVillages: snapshot.totalVillages,
      totalPlayers: snapshot.totalPlayers,
      totalAlliances: snapshot.totalAlliances,
    };
  });
}
