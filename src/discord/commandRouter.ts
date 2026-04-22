import { ChatInputCommandInteraction, Interaction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { EnvConfig } from '../config/env.js';
import { logger } from '../logger.js';
import { requireAdmin, handleCommandError } from './commands/handler.js';
import { findAllianceVillagesNear } from '../travian/queries/findAllianceVillagesNear.js';
import { findEnemyVillagesNearForGuild } from '../travian/diplomacy/enemyQueries.js';
import { findInactiveCandidates } from '../travian/queries/findInactiveCandidates.js';
import { listAllianceVillages } from '../travian/queries/listAllianceVillages.js';
import { listPlayerVillages } from '../travian/queries/listPlayerVillages.js';
import { setAllianceDiplomacyStatus, removeAllianceDiplomacyStatus, listDiplomacyStates } from '../travian/diplomacy/diplomacyRepository.js';
import { setGuildDefaultLanguage } from '../settings/guildSettingsRepository.js';
import { importMapSnapshot } from '../travian/importMapSnapshot.js';
import { findVillagesByTribe } from '../travian/queries/findVillagesByTribe.js';
import { getAllianceStats } from '../travian/queries/getAllianceStats.js';
import { getPlayerInfo } from '../travian/queries/getPlayerInfo.js';
import { getWotwInfo } from '../travian/queries/getWotwInfo.js';
import { calculateDistance } from '../shared/distance.js';
import {
  TRIBE_UNITS,
  TRIBE_DISPLAY_NAMES,
  TRIBE_ID_MAP,
  getEffectiveSpeed,
  calculateTravelTime,
  formatTravelTime,
} from '../travian/unitSpeeds.js';
import {
  createVillageListEmbed,
  createVillageWithDistanceEmbed,
  createInactiveReportEmbed,
  createDiplomacyListEmbed,
  createServerInfoEmbed,
  createHelpEmbed,
  createAllianceStatsEmbed,
  createPlayerInfoEmbed,
  createDistanceEmbed,
  createWotwInfoEmbed,
} from './embeds/formatters.js';

export async function handleInteraction(
  interaction: Interaction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;

  try {
    switch (commandName) {
      case 'alliance-near':
        await handleAllianceNear(interaction, prisma, config);
        break;
      case 'enemy-near':
        await handleEnemyNear(interaction, prisma, config);
        break;
      case 'inactive-search':
        await handleInactiveSearch(interaction, prisma, config);
        break;
      case 'alliance-villages':
        await handleAllianceVillages(interaction, prisma, config);
        break;
      case 'player-villages':
        await handlePlayerVillages(interaction, prisma, config);
        break;
      case 'diplomacy-set':
        await handleDiplomacySet(interaction, prisma, config);
        break;
      case 'diplomacy-list':
        await handleDiplomacyList(interaction, prisma, config);
        break;
      case 'diplomacy-remove':
        await handleDiplomacyRemove(interaction, prisma, config);
        break;
      case 'settings-language':
        await handleSettingsLanguage(interaction, prisma, config);
        break;
      case 'map-refresh':
        await handleMapRefresh(interaction, prisma, config);
        break;
      case 'help':
        await handleHelp(interaction);
        break;
      case 'tribe-search':
        await handleTribeSearch(interaction, prisma, config);
        break;
      case 'alliance-stats':
        await handleAllianceStats(interaction, prisma, config);
        break;
      case 'player-info':
        await handlePlayerInfo(interaction, prisma, config);
        break;
      case 'distance':
        await handleDistance(interaction, config);
        break;
      case 'last-update':
        await handleLastUpdate(interaction, prisma, config);
        break;
      case 'wotw-info':
        await handleWotwInfo(interaction, prisma, config);
        break;
      case 'server-info':
        await handleServerInfo(interaction, prisma, config);
        break;
      default:
        logger.warn({ commandName }, 'Unknown command received');
        await interaction.reply({ content: 'Unknown command. Use `/help` to see available commands.', ephemeral: true });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

async function handleAllianceNear(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const x = interaction.options.getInteger('x', true);
  const y = interaction.options.getInteger('y', true);
  const radius = interaction.options.getInteger('radius') ?? 50;
  const limit = interaction.options.getInteger('limit') ?? 10;

  const result = await findAllianceVillagesNear(prisma, config.SERVER_ID, tag, { x, y }, radius, { limit });

  const embed = createVillageWithDistanceEmbed(
    `Alliance ${tag} near ${x}|${y} (radius: ${radius})`,
    result.villages,
    result.totalMatched,
    result.hasMore
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleEnemyNear(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const x = interaction.options.getInteger('x', true);
  const y = interaction.options.getInteger('y', true);
  const radius = interaction.options.getInteger('radius') ?? 50;
  const limit = interaction.options.getInteger('limit') ?? 10;

  if (!interaction.guildId) {
    await interaction.editReply({ content: 'This command can only be used in a server.' });
    return;
  }

  const result = await findEnemyVillagesNearForGuild(prisma, interaction.guildId, config.SERVER_ID, { x, y }, radius, { limit });

  const embed = createVillageWithDistanceEmbed(
    `Enemy villages near ${x}|${y} (radius: ${radius})`,
    result.villages,
    result.totalMatched,
    result.hasMore,
    0xe74c3c
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleInactiveSearch(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') ?? 10;

  const result = await findInactiveCandidates(prisma, config.SERVER_ID, { limit });

  const embed = createInactiveReportEmbed(
    'Inactive Candidates',
    result.villages.map(v => {
      const reasons: string[] = [];
      const exp = v.explanation;
      if (exp.unchangedSteps > 0) reasons.push(`${exp.unchangedSteps} unchanged snapshots`);
      if (exp.populationRange !== null && exp.populationRange <= 5) reasons.push(`Pop range: ${exp.populationRange}`);
      if (exp.totalDelta !== null && exp.totalDelta <= 5) reasons.push(`Total delta: ${exp.totalDelta}`);
      if (exp.stableStepRatio >= 0.75) reasons.push(`Stable: ${(exp.stableStepRatio * 100).toFixed(0)}%`);
      if (reasons.length === 0) reasons.push('No significant population change');

      return {
        ...v,
        explanation: {
          score: v.inactivityScore,
          isCandidate: true,
          reasons,
        },
      };
    }),
    result.totalMatched,
    result.hasMore
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleAllianceVillages(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const limit = interaction.options.getInteger('limit') ?? 10;

  const result = await listAllianceVillages(prisma, config.SERVER_ID, tag, { limit });

  const embed = createVillageListEmbed(
    `Alliance ${tag} Villages`,
    result.villages,
    result.totalMatched,
    result.hasMore
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlayerVillages(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const limit = interaction.options.getInteger('limit') ?? 10;

  const result = await listPlayerVillages(prisma, config.SERVER_ID, name, { limit });

  const embed = createVillageListEmbed(
    `Player ${name} Villages`,
    result.villages,
    result.totalMatched,
    result.hasMore
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleDiplomacySet(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!await requireAdmin(config, interaction)) return;

  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const status = interaction.options.getString('status', true) as 'enemy' | 'ally' | 'nap' | 'neutral';

  await setAllianceDiplomacyStatus(prisma, interaction.guildId, tag, status);

  await interaction.editReply({ content: `Diplomacy set: ${tag} → ${status}` });
}

async function handleDiplomacyList(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  if (!interaction.guildId) {
    await interaction.editReply({ content: 'This command can only be used in a server.' });
    return;
  }

  const states = await listDiplomacyStates(prisma, interaction.guildId);

  const embed = createDiplomacyListEmbed(
    'Diplomacy Settings',
    states.map(s => ({ allianceTag: s.allianceTag, status: s.status }))
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleDiplomacyRemove(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!await requireAdmin(config, interaction)) return;

  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const removed = await removeAllianceDiplomacyStatus(prisma, interaction.guildId, tag);

  await interaction.editReply({
    content: removed ? `Diplomacy removed for ${tag}` : `No diplomacy setting found for ${tag}`,
  });
}

async function handleSettingsLanguage(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!await requireAdmin(config, interaction)) return;

  await interaction.deferReply();

  const language = interaction.options.getString('language', true) as 'en' | 'pl';

  await setGuildDefaultLanguage(prisma, interaction.guildId, language);

  await interaction.editReply({ content: `Language set to ${language}.` });
}

async function handleMapRefresh(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  if (!await requireAdmin(config, interaction)) return;

  await interaction.deferReply();

  const result = await importMapSnapshot(prisma, config.SERVER_ID, config.MAP_SQL_URL, config.SERVER_NAME);

  const embed = createServerInfoEmbed('Map Refresh Complete', {
    'Snapshot ID': result.snapshotId.toString(),
    'Snapshot At': result.snapshotAt.toISOString(),
    'Total Villages': result.totalVillages.toString(),
    'Total Players': result.totalPlayers.toString(),
    'Total Alliances': result.totalAlliances.toString(),
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleServerInfo(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId: config.SERVER_ID },
    orderBy: { snapshotAt: 'desc' },
  });

  const server = await prisma.server.findUnique({
    where: { id: config.SERVER_ID },
  });

  const info: Record<string, string> = {
    'Server ID': config.SERVER_ID.toString(),
    'Server Name': server?.name ?? 'Not configured',
    'Latest Snapshot': latestSnapshot ? latestSnapshot.snapshotAt.toISOString() : 'None',
    'Total Villages': latestSnapshot?.totalVillages.toString() ?? 'N/A',
    'Total Players': latestSnapshot?.totalPlayers.toString() ?? 'N/A',
    'Total Alliances': latestSnapshot?.totalAlliances.toString() ?? 'N/A',
  };

  const embed = createServerInfoEmbed('Server Information', info);

  await interaction.editReply({ embeds: [embed] });
}

async function handleHelp(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const commands = [
    { name: 'alliance-near', description: 'Find alliance villages near a coordinate. Options: tag, x, y, radius, limit' },
    { name: 'enemy-near', description: 'Find enemy villages near a coordinate (uses diplomacy settings). Options: x, y, radius, limit' },
    { name: 'inactive-search', description: 'Find likely inactive players. Options: limit' },
    { name: 'alliance-villages', description: 'List all villages of an alliance. Options: tag, limit' },
    { name: 'player-villages', description: 'List all villages of a player. Options: name, limit' },
    { name: 'tribe-search', description: 'Find villages by tribe. Options: tribe, x, y, radius, limit' },
    { name: 'alliance-stats', description: 'Show statistics for an alliance (players, villages, pop, top 10). Options: tag' },
    { name: 'player-info', description: 'Show detailed info about a player (tribe, villages, pop, flags). Options: name' },
    { name: 'distance', description: 'Calculate distance and travel time between two coordinates. Options: x1, y1, x2, y2, tribe' },
    { name: 'wotw-info', description: 'Show villages with Victory Points (Wonder of the World). Options: limit' },
    { name: 'last-update', description: 'Show when the map was last updated' },
    { name: 'diplomacy-set', description: 'Set diplomacy status for an alliance (admin only). Options: tag, status' },
    { name: 'diplomacy-list', description: 'List all diplomacy settings for this server' },
    { name: 'diplomacy-remove', description: 'Remove diplomacy status for an alliance (admin only). Options: tag' },
    { name: 'settings-language', description: 'Set language preference for this server (admin only). Options: language' },
    { name: 'map-refresh', description: 'Manually trigger a map.sql import (admin only)' },
    { name: 'server-info', description: 'Show current server and snapshot information' },
  ];

  const embed = createHelpEmbed('Travian Bot Commands', commands);

  await interaction.editReply({ embeds: [embed] });
}

async function handleTribeSearch(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const tribeKey = interaction.options.getString('tribe', true);
  const tribeId = Object.entries(TRIBE_ID_MAP).find(([, key]) => key === tribeKey)?.[0];
  if (!tribeId) {
    await interaction.editReply({ content: 'Unknown tribe selected.' });
    return;
  }

  const x = interaction.options.getInteger('x');
  const y = interaction.options.getInteger('y');
  const radius = interaction.options.getInteger('radius') ?? undefined;
  const limit = interaction.options.getInteger('limit') ?? 10;

  const options: Parameters<typeof findVillagesByTribe>[3] = { limit };
  if (x !== null && y !== null) {
    options.center = { x, y };
    options.radius = radius ?? 50;
  }

  const result = await findVillagesByTribe(prisma, config.SERVER_ID, parseInt(tribeId), options);

  const title = x !== null && y !== null
    ? `${TRIBE_DISPLAY_NAMES[tribeKey]} villages near ${x}|${y} (radius: ${options.radius})`
    : `${TRIBE_DISPLAY_NAMES[tribeKey]} villages`;

  const embed = createVillageWithDistanceEmbed(title, result.villages, result.totalMatched, result.hasMore);

  await interaction.editReply({ embeds: [embed] });
}

async function handleAllianceStats(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const stats = await getAllianceStats(prisma, config.SERVER_ID, tag);

  if (!stats) {
    await interaction.editReply({ content: `Alliance "${tag}" not found.` });
    return;
  }

  const embed = createAllianceStatsEmbed(`Alliance Stats: ${stats.tag}`, stats);

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlayerInfo(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const info = await getPlayerInfo(prisma, config.SERVER_ID, name);

  if (!info) {
    await interaction.editReply({ content: `Player "${name}" not found.` });
    return;
  }

  const embed = createPlayerInfoEmbed(`Player: ${info.name}`, info);

  await interaction.editReply({ embeds: [embed] });
}

async function handleDistance(
  interaction: ChatInputCommandInteraction,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const x1 = interaction.options.getInteger('x1', true);
  const y1 = interaction.options.getInteger('y1', true);
  const x2 = interaction.options.getInteger('x2', true);
  const y2 = interaction.options.getInteger('y2', true);
  const tribeFilter = interaction.options.getString('tribe');

  const distance = calculateDistance(x1, y1, x2, y2);

  const tribesToShow = tribeFilter ? [tribeFilter] : Object.keys(TRIBE_UNITS);
  const tribeResults: Array<{ tribeName: string; units: Array<{ name: string; speed: number; time: string }>; fastest: { name: string; time: string } }> = [];

  for (const tribeKey of tribesToShow) {
    const units = TRIBE_UNITS[tribeKey];
    if (!units) continue;

    const unitResults = Object.values(units).map(unit => {
      const speed = getEffectiveSpeed(unit.baseSpeed);
      const time = calculateTravelTime(distance, unit.baseSpeed);
      return { name: unit.name, speed, time: formatTravelTime(time) };
    });

    const fastest = unitResults.reduce((a, b) => {
      const aTime = parseFloat(a.time.split('h ')[0]) * 60 + parseFloat(a.time.split('h ')[1]);
      const bTime = parseFloat(b.time.split('h ')[0]) * 60 + parseFloat(b.time.split('h ')[1]);
      return aTime < bTime ? a : b;
    });

    tribeResults.push({
      tribeName: TRIBE_DISPLAY_NAMES[tribeKey] ?? tribeKey,
      units: unitResults,
      fastest,
    });
  }

  const title = `Distance: ${x1}|${y1} → ${x2}|${y2}`;
  const embed = createDistanceEmbed(title, distance, tribeResults);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLastUpdate(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId: config.SERVER_ID },
    orderBy: { snapshotAt: 'desc' },
  });

  if (!latestSnapshot) {
    await interaction.editReply({ content: 'No map data imported yet. Use `/map-refresh` to import.' });
    return;
  }

  const info: Record<string, string> = {
    'Last Update': latestSnapshot.snapshotAt.toISOString(),
    'Total Villages': latestSnapshot.totalVillages.toLocaleString(),
    'Total Players': latestSnapshot.totalPlayers.toLocaleString(),
    'Total Alliances': latestSnapshot.totalAlliances.toLocaleString(),
    'Next Scheduled Import': 'Daily at midnight (server time)',
  };

  const embed = createServerInfoEmbed('Last Map Update', info);

  await interaction.editReply({ embeds: [embed] });
}

async function handleWotwInfo(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') ?? 10;
  const result = await getWotwInfo(prisma, config.SERVER_ID, { limit });

  const embed = createWotwInfoEmbed(
    'Victory Points (Wonder of the World)',
    result.villages as Array<{ villageId: number; name: string; x: number; y: number; population: number; playerName: string | null; allianceTag: string | null; victoryPoints: number }>,
    result.totalMatched,
    result.hasMore
  );

  await interaction.editReply({ embeds: [embed] });
}
