import { EmbedBuilder, APIEmbedField } from 'discord.js';
import { translate, TranslationKey, SupportedLanguage } from '../../i18n/index.js';

export interface VillageEntry {
  villageId: number;
  name: string;
  x: number;
  y: number;
  population: number;
  playerName: string | null;
  allianceTag: string | null;
}

export interface VillageWithDistance extends VillageEntry {
  distance: number;
}

export interface InactiveCandidate extends VillageEntry {
  inactivityScore: number;
  label: string;
  explanation: {
    score: number;
    isCandidate: boolean;
    reasons: string[];
  };
}

export function createVillageListEmbed(
  lang: SupportedLanguage,
  title: string,
  villages: VillageEntry[],
  totalMatched: number,
  hasMore: boolean,
  color: number = 0x3498db
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: translate(lang, 'common.showing_results', { shown: villages.length, total: totalMatched, hasMore }) });

  if (villages.length === 0) {
    embed.setDescription(translate(lang, 'village.none_found'));
    return embed;
  }

  const tPlayer = translate(lang, 'village.player');
  const tPop = translate(lang, 'village.pop');
  const tAlliance = translate(lang, 'village.alliance');

  const fields: APIEmbedField[] = villages.map(v => ({
    name: `${v.name} (${v.x}|${v.y})`,
    value: `${tPlayer}: ${v.playerName ?? '—'} | ${tPop}: ${v.population}${v.allianceTag ? ` | ${tAlliance}: ${v.allianceTag}` : ''}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createVillageWithDistanceEmbed(
  lang: SupportedLanguage,
  title: string,
  villages: VillageWithDistance[],
  totalMatched: number,
  hasMore: boolean,
  color: number = 0xe74c3c
): EmbedBuilder {
  const tFields = translate(lang, 'fields');
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: translate(lang, 'common.showing_results', { shown: villages.length, total: totalMatched, hasMore }) });

  if (villages.length === 0) {
    embed.setDescription(translate(lang, 'village.none_in_radius'));
    return embed;
  }

  const tPlayer = translate(lang, 'village.player');
  const tPop = translate(lang, 'village.pop');
  const tAlliance = translate(lang, 'village.alliance');

  const fields: APIEmbedField[] = villages.map(v => ({
    name: `${v.name} (${v.x}|${v.y}) — ${v.distance.toFixed(1)} ${tFields}`,
    value: `${tPlayer}: ${v.playerName ?? '—'} | ${tPop}: ${v.population}${v.allianceTag ? ` | ${tAlliance}: ${v.allianceTag}` : ''}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createInactiveReportEmbed(
  lang: SupportedLanguage,
  title: string,
  candidates: InactiveCandidate[],
  totalMatched: number,
  hasMore: boolean,
  color: number = 0xf39c12
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: translate(lang, 'common.showing_results', { shown: candidates.length, total: totalMatched, hasMore }) });

  if (candidates.length === 0) {
    embed.setDescription(translate(lang, 'inactive_search.none'));
    return embed;
  }

  const tPlayer = translate(lang, 'village.player');
  const tPop = translate(lang, 'village.pop');
  const tReasons = translate(lang, 'inactive_search.reasons');

  const fields: APIEmbedField[] = candidates.map(c => ({
    name: `${c.name} (${c.x}|${c.y}) — Score: ${c.inactivityScore}`,
    value: `${tPlayer}: ${c.playerName ?? '—'} | ${tPop}: ${c.population}\n${tReasons}: ${c.explanation.reasons.join(', ') || translate(lang, 'inactive_search.no_change')}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createDiplomacyListEmbed(
  lang: SupportedLanguage,
  title: string,
  statuses: Array<{ allianceTag: string; status: string }>,
  color: number = 0x9b59b6
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color);

  if (statuses.length === 0) {
    embed.setDescription(translate(lang, 'diplomacy.none_configured'));
    return embed;
  }

  const fields: APIEmbedField[] = statuses.map(s => ({
    name: s.allianceTag,
    value: `Status: ${s.status}`,
    inline: true,
  }));

  embed.addFields(fields);

  return embed;
}

export function createServerInfoEmbed(
  lang: SupportedLanguage,
  title: string,
  info: Record<string, string>,
  color: number = 0x2ecc71
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color);

  const fields: APIEmbedField[] = Object.entries(info).map(([key, value]) => ({
    name: key,
    value,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createHelpEmbed(
  lang: SupportedLanguage,
  title: string,
  commands: Array<{ name: string; description: string }>,
  color: number = 0x3498db
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color);

  const fields: APIEmbedField[] = commands.map(cmd => ({
    name: `/${cmd.name}`,
    value: cmd.description,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createAllianceStatsEmbed(
  lang: SupportedLanguage,
  title: string,
  stats: {
    tag: string;
    totalPlayers: number;
    totalVillages: number;
    totalPopulation: number;
    avgPopulationPerVillage: number;
    topPlayers: Array<{ name: string; villageCount: number; totalPopulation: number }>;
  },
  color: number = 0x3498db
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color);

  embed.addFields(
    { name: translate(lang, 'alliance_stats.players'), value: stats.totalPlayers.toString(), inline: true },
    { name: translate(lang, 'alliance_stats.villages'), value: stats.totalVillages.toString(), inline: true },
    { name: translate(lang, 'alliance_stats.total_pop'), value: stats.totalPopulation.toLocaleString(), inline: true },
    { name: translate(lang, 'alliance_stats.avg_pop'), value: stats.avgPopulationPerVillage.toString(), inline: true },
  );

  if (stats.topPlayers.length > 0) {
    const topList = stats.topPlayers
      .map((p, i) => `${i + 1}. **${p.name}** — ${p.villageCount} villages, ${p.totalPopulation.toLocaleString()} pop`)
      .join('\n');
    embed.addFields({ name: translate(lang, 'alliance_stats.top_players'), value: topList, inline: false });
  }

  return embed;
}

export function createPlayerInfoEmbed(
  lang: SupportedLanguage,
  title: string,
  info: {
    name: string;
    tribeName: string | null;
    allianceTag: string | null;
    totalVillages: number;
    totalPopulation: number;
    villages: Array<{
      name: string;
      x: number;
      y: number;
      population: number;
      isCapital: boolean;
      isCity: boolean;
      hasHarbor: boolean;
      victoryPoints: number;
    }>;
  },
  color: number = 0x3498db
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color);

  embed.addFields(
    { name: translate(lang, 'player_info.tribe'), value: info.tribeName ?? translate(lang, 'player_info.unknown'), inline: true },
    { name: translate(lang, 'player_info.alliance'), value: info.allianceTag ?? translate(lang, 'player_info.none'), inline: true },
    { name: translate(lang, 'player_info.villages'), value: info.totalVillages.toString(), inline: true },
    { name: translate(lang, 'player_info.total_pop'), value: info.totalPopulation.toLocaleString(), inline: true },
  );

  if (info.villages.length > 0) {
    const villageList = info.villages.slice(0, 10).map(v => {
      const flags = [v.isCapital ? '👑' : '', v.isCity ? '🏙️' : '', v.hasHarbor ? '⚓' : '', v.victoryPoints > 0 ? `⭐${v.victoryPoints}` : ''].filter(Boolean).join(' ');
      return `${v.name} (${v.x}|${v.y}) — Pop: ${v.population}${flags ? ` ${flags}` : ''}`;
    }).join('\n');
    embed.addFields({ name: translate(lang, 'player_info.villages'), value: villageList, inline: false });
  }

  return embed;
}

export function createDistanceEmbed(
  lang: SupportedLanguage,
  title: string,
  distance: number,
  tribeResults: Array<{
    tribeName: string;
    units: Array<{ name: string; speed: number; time: string }>;
    fastest: { name: string; time: string };
  }>,
  color: number = 0x9b59b6
): EmbedBuilder {
  const tFields = translate(lang, 'distance.fields');
  const tFastest = translate(lang, 'distance.fastest');

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields({ name: translate(lang, 'distance.label'), value: `${distance.toFixed(1)} ${tFields}`, inline: false });

  for (const tribe of tribeResults) {
    const unitLines = tribe.units.map(u => `  ${u.name} (${u.speed}/h): ${u.time}`).join('\n');
    embed.addFields({
      name: translate(lang, 'distance.tribe_speed', { tribe: tribe.tribeName }),
      value: `${unitLines}\n🐎 ${tFastest}: ${tribe.fastest.name} — ${tribe.fastest.time}`,
      inline: false,
    });
  }

  return embed;
}

export function createWotwInfoEmbed(
  lang: SupportedLanguage,
  title: string,
  villages: Array<{ villageId: number; name: string; x: number; y: number; population: number; playerName: string | null; allianceTag: string | null; victoryPoints: number }>,
  totalMatched: number,
  hasMore: boolean,
  color: number = 0xe67e22
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: translate(lang, 'common.showing_results', { shown: villages.length, total: totalMatched, hasMore }) });

  if (villages.length === 0) {
    embed.setDescription(translate(lang, 'wotw.none'));
    return embed;
  }

  const tPlayer = translate(lang, 'village.player');
  const tPop = translate(lang, 'village.pop');
  const tAlliance = translate(lang, 'village.alliance');

  const fields: APIEmbedField[] = villages.map(v => ({
    name: `${v.name} (${v.x}|${v.y}) — ⭐${v.victoryPoints} VP`,
    value: `${tPlayer}: ${v.playerName ?? '—'} | ${tPop}: ${v.population}${v.allianceTag ? ` | ${tAlliance}: ${v.allianceTag}` : ''}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}
