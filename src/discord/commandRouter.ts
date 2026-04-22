import { ChatInputCommandInteraction, Interaction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { EnvConfig } from '../config/env.js';
import { logger } from '../logger.js';
import { requireAdmin, handleCommandError } from './commands/handler.js';
import { resolveStoredLanguagePreference } from '../settings/languagePreferences.js';
import { translate, SupportedLanguage } from '../i18n/index.js';
import { findAllianceVillagesNear } from '../travian/queries/findAllianceVillagesNear.js';
import { findEnemyVillagesNearForGuild } from '../travian/diplomacy/enemyQueries.js';
import { findInactiveCandidates } from '../travian/queries/findInactiveCandidates.js';
import { listAllianceVillages } from '../travian/queries/listAllianceVillages.js';
import { listPlayerVillages } from '../travian/queries/listPlayerVillages.js';
import { setAllianceDiplomacyStatus, removeAllianceDiplomacyStatus, listDiplomacyStates } from '../travian/diplomacy/diplomacyRepository.js';
import { setGuildDefaultLanguage } from '../settings/guildSettingsRepository.js';
import { setUserLanguageOverride } from '../settings/userSettingsRepository.js';
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

async function getLang(interaction: Interaction, prisma: PrismaClient): Promise<SupportedLanguage> {
  if (!interaction.guildId || !interaction.isChatInputCommand()) {
    return 'en';
  }
  return resolveStoredLanguagePreference(prisma, interaction.guildId, interaction.user.id);
}

export async function handleInteraction(
  interaction: Interaction,
  prisma: PrismaClient,
  config: EnvConfig
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const lang = await getLang(interaction, prisma);

  try {
    switch (commandName) {
      case 'alliance-near':
        await handleAllianceNear(interaction, prisma, config, lang);
        break;
      case 'enemy-near':
        await handleEnemyNear(interaction, prisma, config, lang);
        break;
      case 'inactive-search':
        await handleInactiveSearch(interaction, prisma, config, lang);
        break;
      case 'alliance-villages':
        await handleAllianceVillages(interaction, prisma, config, lang);
        break;
      case 'player-villages':
        await handlePlayerVillages(interaction, prisma, config, lang);
        break;
      case 'diplomacy-set':
        await handleDiplomacySet(interaction, prisma, config, lang);
        break;
      case 'diplomacy-list':
        await handleDiplomacyList(interaction, prisma, config, lang);
        break;
      case 'diplomacy-remove':
        await handleDiplomacyRemove(interaction, prisma, config, lang);
        break;
      case 'settings-language':
        await handleSettingsLanguage(interaction, prisma, config, lang);
        break;
      case 'map-refresh':
        await handleMapRefresh(interaction, prisma, config, lang);
        break;
      case 'help':
        await handleHelp(interaction, lang);
        break;
      case 'tribe-search':
        await handleTribeSearch(interaction, prisma, config, lang);
        break;
      case 'alliance-stats':
        await handleAllianceStats(interaction, prisma, config, lang);
        break;
      case 'player-info':
        await handlePlayerInfo(interaction, prisma, config, lang);
        break;
      case 'distance':
        await handleDistance(interaction, config, lang);
        break;
      case 'last-update':
        await handleLastUpdate(interaction, prisma, config, lang);
        break;
      case 'wotw-info':
        await handleWotwInfo(interaction, prisma, config, lang);
        break;
      case 'server-info':
        await handleServerInfo(interaction, prisma, config, lang);
        break;
      default:
        logger.warn({ commandName }, 'Unknown command received');
        await interaction.reply({ content: translate(lang, 'common.unknown_command'), ephemeral: true });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

async function handleAllianceNear(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const x = interaction.options.getInteger('x', true);
  const y = interaction.options.getInteger('y', true);
  const radius = interaction.options.getInteger('radius') ?? 50;
  const limit = interaction.options.getInteger('limit') ?? 10;

  const result = await findAllianceVillagesNear(prisma, config.SERVER_ID, tag, { x, y }, radius, { limit });

  const title = translate(lang, 'alliance_near.title', { tag, x, y, radius });
  const embed = createVillageWithDistanceEmbed(lang, title, result.villages, result.totalMatched, result.hasMore);

  await interaction.editReply({ embeds: [embed] });
}

async function handleEnemyNear(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const x = interaction.options.getInteger('x', true);
  const y = interaction.options.getInteger('y', true);
  const radius = interaction.options.getInteger('radius') ?? 50;
  const limit = interaction.options.getInteger('limit') ?? 10;

  if (!interaction.guildId) {
    await interaction.editReply({ content: translate(lang, 'common.guild_only') });
    return;
  }

  const result = await findEnemyVillagesNearForGuild(prisma, interaction.guildId, config.SERVER_ID, { x, y }, radius, { limit });

  const title = translate(lang, 'enemy_near.title', { x, y, radius });
  const embed = createVillageWithDistanceEmbed(lang, title, result.villages, result.totalMatched, result.hasMore, 0xe74c3c);

  await interaction.editReply({ embeds: [embed] });
}

async function handleInactiveSearch(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') ?? 10;
  const x = interaction.options.getInteger('x');
  const y = interaction.options.getInteger('y');
  const radius = interaction.options.getInteger('radius') ?? undefined;

  const options: Parameters<typeof findInactiveCandidates>[2] = { limit };
  if (x !== null && y !== null) {
    options.center = { x, y };
    options.radius = radius ?? 50;
  }

  const result = await findInactiveCandidates(prisma, config.SERVER_ID, options);

  const title = x !== null && y !== null
    ? translate(lang, 'inactive_search.title_near', { x, y, radius: options.radius })
    : translate(lang, 'inactive_search.title');

  const embed = createInactiveReportEmbed(
    lang,
    title,
    result.villages,
    result.totalMatched,
    result.hasMore
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleAllianceVillages(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const limit = interaction.options.getInteger('limit') ?? 10;

  const result = await listAllianceVillages(prisma, config.SERVER_ID, tag, { limit });

  const title = translate(lang, 'alliance_villages.title', { tag });
  const embed = createVillageListEmbed(lang, title, result.villages, result.totalMatched, result.hasMore);

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlayerVillages(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const limit = interaction.options.getInteger('limit') ?? 10;

  const result = await listPlayerVillages(prisma, config.SERVER_ID, name, { limit });

  const title = translate(lang, 'player_villages.title', { name });
  const embed = createVillageListEmbed(lang, title, result.villages, result.totalMatched, result.hasMore);

  await interaction.editReply({ embeds: [embed] });
}

async function handleDiplomacySet(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: translate(lang, 'common.guild_only'), ephemeral: true });
    return;
  }

  if (!await requireAdmin(config, interaction)) return;

  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const status = interaction.options.getString('status', true) as 'enemy' | 'ally' | 'nap' | 'neutral';

  await setAllianceDiplomacyStatus(prisma, interaction.guildId, tag, status);

  await interaction.editReply({ content: translate(lang, 'diplomacy.updated', { tag, status }) });
}

async function handleDiplomacyList(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  if (!interaction.guildId) {
    await interaction.editReply({ content: translate(lang, 'common.guild_only') });
    return;
  }

  const states = await listDiplomacyStates(prisma, interaction.guildId);

  const embed = createDiplomacyListEmbed(
    lang,
    translate(lang, 'diplomacy.list_title'),
    states.map(s => ({ allianceTag: s.allianceTag, status: s.status }))
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleDiplomacyRemove(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: translate(lang, 'common.guild_only'), ephemeral: true });
    return;
  }

  if (!await requireAdmin(config, interaction)) return;

  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const removed = await removeAllianceDiplomacyStatus(prisma, interaction.guildId, tag);

  await interaction.editReply({
    content: removed
      ? translate(lang, 'diplomacy.removed', { tag })
      : translate(lang, 'diplomacy.not_found', { tag }),
  });
}

async function handleSettingsLanguage(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: translate(lang, 'common.guild_only'), ephemeral: true });
    return;
  }

  const language = interaction.options.getString('language', true) as 'en' | 'pl';
  const scope = interaction.options.getString('scope') ?? 'user';

  if (scope === 'server') {
    if (!await requireAdmin(config, interaction)) return;
    await interaction.deferReply();
    await setGuildDefaultLanguage(prisma, interaction.guildId, language);
    await interaction.editReply({ content: translate(lang, 'settings.language.updated_server', { language }) });
  } else {
    await interaction.deferReply();
    await setUserLanguageOverride(prisma, interaction.user.id, language);
    await interaction.editReply({ content: translate(lang, 'settings.language.updated_user', { language }) });
  }
}

async function handleMapRefresh(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  if (!await requireAdmin(config, interaction)) return;

  await interaction.deferReply();

  const result = await importMapSnapshot(prisma, config.SERVER_ID, config.MAP_SQL_URL, config.SERVER_NAME);

  const embed = createServerInfoEmbed(lang, translate(lang, 'server_info.refresh_title'), {
    [translate(lang, 'server_info.snapshot_id')]: result.snapshotId.toString(),
    [translate(lang, 'server_info.snapshot_at')]: result.snapshotAt.toISOString(),
    [translate(lang, 'server_info.total_villages')]: result.totalVillages.toString(),
    [translate(lang, 'server_info.total_players')]: result.totalPlayers.toString(),
    [translate(lang, 'server_info.total_alliances')]: result.totalAlliances.toString(),
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleServerInfo(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
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
    [translate(lang, 'server_info.server_id')]: config.SERVER_ID.toString(),
    [translate(lang, 'server_info.server_name')]: server?.name ?? translate(lang, 'server_info.not_configured'),
    [translate(lang, 'server_info.latest_snapshot')]: latestSnapshot ? latestSnapshot.snapshotAt.toISOString() : translate(lang, 'server_info.none'),
    [translate(lang, 'server_info.total_villages')]: latestSnapshot?.totalVillages.toString() ?? 'N/A',
    [translate(lang, 'server_info.total_players')]: latestSnapshot?.totalPlayers.toString() ?? 'N/A',
    [translate(lang, 'server_info.total_alliances')]: latestSnapshot?.totalAlliances.toString() ?? 'N/A',
  };

  const embed = createServerInfoEmbed(lang, translate(lang, 'server_info.title'), info);

  await interaction.editReply({ embeds: [embed] });
}

async function handleHelp(
  interaction: ChatInputCommandInteraction,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const commands = [
    { name: 'alliance-near', description: translate(lang, 'help.alliance-near') },
    { name: 'enemy-near', description: translate(lang, 'help.enemy-near') },
    { name: 'inactive-search', description: translate(lang, 'help.inactive-search') },
    { name: 'alliance-villages', description: translate(lang, 'help.alliance-villages') },
    { name: 'player-villages', description: translate(lang, 'help.player-villages') },
    { name: 'tribe-search', description: translate(lang, 'help.tribe-search') },
    { name: 'alliance-stats', description: translate(lang, 'help.alliance-stats') },
    { name: 'player-info', description: translate(lang, 'help.player-info') },
    { name: 'distance', description: translate(lang, 'help.distance') },
    { name: 'wotw-info', description: translate(lang, 'help.wotw-info') },
    { name: 'last-update', description: translate(lang, 'help.last-update') },
    { name: 'diplomacy-set', description: translate(lang, 'help.diplomacy-set') },
    { name: 'diplomacy-list', description: translate(lang, 'help.diplomacy-list') },
    { name: 'diplomacy-remove', description: translate(lang, 'help.diplomacy-remove') },
    { name: 'settings-language', description: translate(lang, 'help.settings-language') },
    { name: 'map-refresh', description: translate(lang, 'help.map-refresh') },
    { name: 'server-info', description: translate(lang, 'help.server-info') },
  ];

  const embed = createHelpEmbed(lang, translate(lang, 'help.title'), commands);

  await interaction.editReply({ embeds: [embed] });
}

async function handleTribeSearch(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const tribeKey = interaction.options.getString('tribe', true);
  const tribeId = Object.entries(TRIBE_ID_MAP).find(([, key]) => key === tribeKey)?.[0];
  if (!tribeId) {
    await interaction.editReply({ content: translate(lang, 'tribe_search.unknown') });
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

  const tribeName = TRIBE_DISPLAY_NAMES[tribeKey] ?? tribeKey;
  const title = x !== null && y !== null
    ? translate(lang, 'tribe_search.title', { tribe: tribeName, x, y, radius: options.radius })
    : translate(lang, 'tribe_search.title_all', { tribe: tribeName });

  const embed = createVillageWithDistanceEmbed(lang, title, result.villages, result.totalMatched, result.hasMore);

  await interaction.editReply({ embeds: [embed] });
}

async function handleAllianceStats(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const tag = interaction.options.getString('tag', true);
  const stats = await getAllianceStats(prisma, config.SERVER_ID, tag);

  if (!stats) {
    await interaction.editReply({ content: translate(lang, 'alliance_stats.not_found', { tag }) });
    return;
  }

  const embed = createAllianceStatsEmbed(lang, translate(lang, 'alliance_stats.title', { tag }), stats);

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlayerInfo(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const info = await getPlayerInfo(prisma, config.SERVER_ID, name);

  if (!info) {
    await interaction.editReply({ content: translate(lang, 'player_info.not_found', { name }) });
    return;
  }

  const embed = createPlayerInfoEmbed(lang, translate(lang, 'player_info.title', { name }), info);

  await interaction.editReply({ embeds: [embed] });
}

async function handleDistance(
  interaction: ChatInputCommandInteraction,
  config: EnvConfig,
  lang: SupportedLanguage
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

  const title = translate(lang, 'distance.title', { x1, y1, x2, y2 });
  const embed = createDistanceEmbed(lang, title, distance, tribeResults);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLastUpdate(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { serverId: config.SERVER_ID },
    orderBy: { snapshotAt: 'desc' },
  });

  if (!latestSnapshot) {
    await interaction.editReply({ content: translate(lang, 'server_info.no_data') });
    return;
  }

  const info: Record<string, string> = {
    [translate(lang, 'server_info.last_update')]: latestSnapshot.snapshotAt.toISOString(),
    [translate(lang, 'server_info.total_villages')]: latestSnapshot.totalVillages.toLocaleString(),
    [translate(lang, 'server_info.total_players')]: latestSnapshot.totalPlayers.toLocaleString(),
    [translate(lang, 'server_info.total_alliances')]: latestSnapshot.totalAlliances.toLocaleString(),
    [translate(lang, 'server_info.next_import')]: translate(lang, 'server_info.next_import_value'),
  };

  const embed = createServerInfoEmbed(lang, translate(lang, 'server_info.last_update_title'), info);

  await interaction.editReply({ embeds: [embed] });
}

async function handleWotwInfo(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient,
  config: EnvConfig,
  lang: SupportedLanguage
): Promise<void> {
  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') ?? 10;
  const result = await getWotwInfo(prisma, config.SERVER_ID, { limit });

  const embed = createWotwInfoEmbed(
    lang,
    translate(lang, 'wotw.title'),
    result.villages as Array<{ villageId: number; name: string; x: number; y: number; population: number; playerName: string | null; allianceTag: string | null; victoryPoints: number }>,
    result.totalMatched,
    result.hasMore
  );

  await interaction.editReply({ embeds: [embed] });
}
