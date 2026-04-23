import { EmbedBuilder, APIEmbedField } from 'discord.js';
import { translate, TranslationKey, SupportedLanguage } from '../../i18n/index.js';
import { InactiveScoreExplanation } from '../../travian/inactiveHeuristics.js';

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
  explanation: InactiveScoreExplanation;
  populationHistory?: Array<{ snapshotAt: Date; population: number }>;
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

  const ltr = '\u200E';
  const fields: APIEmbedField[] = villages.map(v => {
    const safeName = /[\u0600-\u06FF\u0750-\u077F]/.test(v.name) ? `${ltr}\`${v.name}\`` : v.name;
    const safePlayer = v.playerName && /[\u0600-\u06FF\u0750-\u077F]/.test(v.playerName) ? `${ltr}\`${v.playerName}\`` : (v.playerName ?? '—');
    const safeAlliance = v.allianceTag && /[\u0600-\u06FF\u0750-\u077F]/.test(v.allianceTag) ? `${ltr}\`${v.allianceTag}\`` : v.allianceTag;
    return {
      name: `${ltr}${safeName} (${v.x}|${v.y})`,
      value: `${ltr}${tPlayer}: ${safePlayer} | ${tPop}: ${v.population}${safeAlliance ? ` | ${tAlliance}: ${safeAlliance}` : ''}`,
      inline: false,
    };
  });

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

  const ltr = '\u200E';
  const fields: APIEmbedField[] = villages.map(v => {
    const safeName = /[\u0600-\u06FF\u0750-\u077F]/.test(v.name) ? `${ltr}\`${v.name}\`` : v.name;
    const safePlayer = v.playerName && /[\u0600-\u06FF\u0750-\u077F]/.test(v.playerName) ? `${ltr}\`${v.playerName}\`` : (v.playerName ?? '—');
    const safeAlliance = v.allianceTag && /[\u0600-\u06FF\u0750-\u077F]/.test(v.allianceTag) ? `${ltr}\`${v.allianceTag}\`` : v.allianceTag;
    return {
      name: `${ltr}${safeName} (${v.x}|${v.y}) — ${v.distance.toFixed(1)} ${tFields}`,
      value: `${ltr}${tPlayer}: ${safePlayer} | ${tPop}: ${v.population}${safeAlliance ? ` | ${tAlliance}: ${safeAlliance}` : ''}`,
      inline: false,
    };
  });

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
  const tAlliance = translate(lang, 'village.alliance');
  const tReasons = translate(lang, 'inactive_search.reasons');
  const tPopTrend = translate(lang, 'inactive_search.pop_trend');
  const tNoChange = translate(lang, 'inactive_search.no_change');

  const fields: APIEmbedField[] = candidates.map(c => {
    const exp = c.explanation;
    const reasons: string[] = [];
    if (exp.unchangedSteps > 0) reasons.push(`${exp.unchangedSteps} unchanged snapshots`);
    if (exp.populationRange !== null && exp.populationRange <= 5) reasons.push(`Pop range: ${exp.populationRange}`);
    if (exp.totalDelta !== null && Math.abs(exp.totalDelta) <= 5) reasons.push(`Total delta: ${exp.totalDelta}`);
    if (exp.stableStepRatio >= 0.75) reasons.push(`Stable: ${(exp.stableStepRatio * 100).toFixed(0)}%`);
    if (reasons.length === 0) reasons.push(tNoChange);

    const ltr = '\u200E';
    const safeName = c.name.includes('\u202E') || /[\u0600-\u06FF\u0750-\u077F]/.test(c.name)
      ? `${ltr}\`${c.name}\``
      : c.name;
    const safePlayer = c.playerName && (/[\u0600-\u06FF\u0750-\u077F]/.test(c.playerName) || c.playerName.includes('\u202E'))
      ? `${ltr}\`${c.playerName}\``
      : (c.playerName ?? '—');
    const safeAlliance = c.allianceTag && (/[\u0600-\u06FF\u0750-\u077F]/.test(c.allianceTag) || c.allianceTag.includes('\u202E'))
      ? `${ltr}\`${c.allianceTag}\``
      : c.allianceTag;

    let value = `${ltr}${tPlayer}: ${safePlayer}\n${ltr}${tPop}: ${c.population}`;
    if (safeAlliance) value += `\n${ltr}${tAlliance}: ${safeAlliance}`;

    if (c.populationHistory && c.populationHistory.length > 1) {
      const first = c.populationHistory[0];
      const last = c.populationHistory[c.populationHistory.length - 1];
      const delta = last.population - first.population;
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
      const trend = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';
      value += `\n${ltr}${tPopTrend}: ${trend} ${deltaStr} (${first.population} → ${last.population})`;
    }

    value += `\n${ltr}${tReasons}: ${reasons.join(', ')}`;

    return {
      name: `${ltr}${safeName} (${c.x}|${c.y}) — Score: ${c.inactivityScore}`,
      value,
      inline: false,
    };
  });

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
    value: `${translate(lang, `diplomacy.status.${s.status}` as TranslationKey)}`,
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

  const ltr = '\u200E';
  const fields: APIEmbedField[] = villages.map(v => {
    const safeName = /[\u0600-\u06FF\u0750-\u077F]/.test(v.name) ? `${ltr}\`${v.name}\`` : v.name;
    const safePlayer = v.playerName && /[\u0600-\u06FF\u0750-\u077F]/.test(v.playerName) ? `${ltr}\`${v.playerName}\`` : (v.playerName ?? '—');
    const safeAlliance = v.allianceTag && /[\u0600-\u06FF\u0750-\u077F]/.test(v.allianceTag) ? `${ltr}\`${v.allianceTag}\`` : v.allianceTag;
    return {
      name: `${ltr}${safeName} (${v.x}|${v.y}) — ⭐${v.victoryPoints} VP`,
      value: `${ltr}${tPlayer}: ${safePlayer} | ${tPop}: ${v.population}${safeAlliance ? ` | ${tAlliance}: ${safeAlliance}` : ''}`,
      inline: false,
    };
  });

  embed.addFields(fields);

  return embed;
}
