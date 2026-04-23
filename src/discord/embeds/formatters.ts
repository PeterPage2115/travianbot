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

function getNumberPrefix(index: number): string {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  return index < emojis.length ? emojis[index] : `${index + 1}.`;
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

  const ltr = '\u200E';
  const fields: APIEmbedField[] = villages.map((v, i) => {
    const prefix = getNumberPrefix(i);
    const safeName = /[\u0600-\u06FF\u0750-\u077F]/.test(v.name) ? `${ltr}\`${v.name}\`` : v.name;
    const safePlayer = v.playerName && /[\u0600-\u06FF\u0750-\u077F]/.test(v.playerName) ? `${ltr}\`${v.playerName}\`` : (v.playerName ?? '—');
    const safeAlliance = v.allianceTag && /[\u0600-\u06FF\u0750-\u077F]/.test(v.allianceTag) ? `${ltr}\`${v.allianceTag}\`` : v.allianceTag;
    return {
      name: `${prefix} ${ltr}${safeName} (${v.x}|${v.y})`,
      value: `${ltr}👤 ${safePlayer} | 🏘️ ${v.population}${safeAlliance ? ` | 🏴 ${safeAlliance}` : ''}`,
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

  const ltr = '\u200E';
  const fields: APIEmbedField[] = villages.map((v, i) => {
    const prefix = getNumberPrefix(i);
    const safeName = /[\u0600-\u06FF\u0750-\u077F]/.test(v.name) ? `${ltr}\`${v.name}\`` : v.name;
    const safePlayer = v.playerName && /[\u0600-\u06FF\u0750-\u077F]/.test(v.playerName) ? `${ltr}\`${v.playerName}\`` : (v.playerName ?? '—');
    const safeAlliance = v.allianceTag && /[\u0600-\u06FF\u0750-\u077F]/.test(v.allianceTag) ? `${ltr}\`${v.allianceTag}\`` : v.allianceTag;
    return {
      name: `${prefix} ${ltr}${safeName} (${v.x}|${v.y}) — 📍 ${v.distance.toFixed(1)} ${tFields}`,
      value: `${ltr}👤 ${safePlayer} | 🏘️ ${v.population}${safeAlliance ? ` | 🏴 ${safeAlliance}` : ''}`,
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

  const fields: APIEmbedField[] = candidates.map((c, index) => {
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

    const scoreEmoji = c.inactivityScore >= 80 ? '🔴' : c.inactivityScore >= 50 ? '🟡' : '🟢';

    let value = `${ltr}👤 ${safePlayer}${safeAlliance ? ` (${safeAlliance})` : ''} | 🏘️ ${tPop}: ${c.population}`;
    value += `\n${ltr}📊 Score: ${c.inactivityScore}/100`;

    if (c.populationHistory && c.populationHistory.length > 1) {
      const first = c.populationHistory[0];
      const last = c.populationHistory[c.populationHistory.length - 1];
      const delta = last.population - first.population;
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
      const trend = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';
      value += `\n${ltr}📈 ${tPopTrend}: ${trend} ${deltaStr} (${first.population} → ${last.population})`;
    }

    value += `\n${ltr}🔍 ${tReasons}: ${reasons.join(', ')}`;

    return {
      name: `${ltr}#${index + 1} ${safeName} ${scoreEmoji} (${c.x}|${c.y})`,
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

  const statusEmoji: Record<string, string> = {
    enemy: '🔴',
    ally: '🟢',
    nap: '🟡',
    neutral: '⚪',
  };

  const fields: APIEmbedField[] = statuses.map(s => {
    const emoji = statusEmoji[s.status.toLowerCase()] || '⚪';
    return {
      name: s.allianceTag,
      value: `${emoji} ${translate(lang, `diplomacy.status.${s.status}` as TranslationKey)}`,
      inline: true,
    };
  });

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

  const getEmoji = (key: string): string => {
    const lower = key.toLowerCase();
    if (lower.includes('server') && lower.includes('id')) return '🆔';
    if (lower.includes('snapshot') || lower.includes('aktualizacja') || lower.includes('update')) return '📅';
    if (lower.includes('village') || lower.includes('wiosek')) return '🏘️';
    if (lower.includes('player') || lower.includes('graczy')) return '👥';
    if (lower.includes('alliance') || lower.includes('sojuszy')) return '🤝';
    if (lower.includes('name') || lower.includes('nazwa')) return '🏷️';
    if (lower.includes('import') || lower.includes('next')) return '⏰';
    return '▫️';
  };

  const entries = Object.entries(info);
  const fields: APIEmbedField[] = [];

  entries.forEach(([key, value], index) => {
    const emoji = getEmoji(key);
    fields.push({
      name: `${emoji} ${key}`,
      value,
      inline: true,
    });

    // Add blank spacer after every 2nd field to force 2-column layout
    if ((index + 1) % 2 === 0 && index + 1 < entries.length) {
      fields.push({ name: '\u200B', value: '\u200B', inline: true });
    }
  });

  // If odd number of entries, pad with a blank field
  if (entries.length % 2 !== 0) {
    fields.push({ name: '\u200B', value: '\u200B', inline: true });
  }

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

  const categories = [
    { emoji: '🔍', name: 'Search', commandNames: ['alliance-near', 'enemy-near', 'inactive-search', 'tribe-search'] },
    { emoji: '📋', name: 'Lists', commandNames: ['alliance-villages', 'player-villages', 'player-info', 'wotw-info'] },
    { emoji: '⚔️', name: 'Diplomacy', commandNames: ['diplomacy-set', 'diplomacy-list', 'diplomacy-remove'] },
    { emoji: '⚙️', name: 'Settings', commandNames: ['settings-language', 'server-info', 'last-update', 'distance'] },
    { emoji: '🛠️', name: 'Admin', commandNames: ['map-refresh'] },
  ] as const;

  const commandMap = new Map(commands.map(c => [c.name, c.description]));
  const fields: APIEmbedField[] = [];

  for (const cat of categories) {
    const lines: string[] = [];
    for (const cmdName of cat.commandNames) {
      const desc = commandMap.get(cmdName);
      if (desc) {
        lines.push(`• \`/${cmdName}\` — ${desc}`);
      }
    }

    if (lines.length > 0) {
      fields.push({
        name: `${cat.emoji} ${cat.name}`,
        value: lines.join('\n'),
        inline: false,
      });
    }
  }

  const categorized = new Set<string>(categories.flatMap(c => c.commandNames));
  const other = commands.filter(c => !categorized.has(c.name));
  if (other.length > 0) {
    fields.push({
      name: '📦 Other',
      value: other.map(c => `• \`/${c.name}\` — ${c.description}`).join('\n'),
      inline: false,
    });
  }

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
    .setColor(color)
    .setDescription(`**${info.name}** — ${info.totalVillages} villages | ${info.totalPopulation.toLocaleString()} pop`);

  embed.addFields(
    { name: '👤 Tribe', value: info.tribeName ?? translate(lang, 'player_info.unknown'), inline: true },
    { name: '🏴 Alliance', value: info.allianceTag ?? translate(lang, 'player_info.none'), inline: true },
    { name: '🏘️ Villages', value: info.totalVillages.toString(), inline: true },
    { name: '👥 Total Pop', value: info.totalPopulation.toLocaleString(), inline: true },
  );

  if (info.villages.length > 0) {
    const ltr = '\u200E';
    const villageList = info.villages.slice(0, 10).map((v, i) => {
      const safeName = /[\u0600-\u06FF\u0750-\u077F]/.test(v.name) ? `${ltr}\`${v.name}\`` : v.name;
      const flags = [v.isCapital ? '👑' : '', v.isCity ? '🏙️' : '', v.hasHarbor ? '⚓' : '', v.victoryPoints > 0 ? `⭐${v.victoryPoints}` : ''].filter(Boolean).join(' ');
      return `${i + 1}. ${ltr}${safeName} (${v.x}|${v.y}) — Pop: ${v.population}${flags ? ` ${flags}` : ''}`;
    }).join('\n');
    const more = info.villages.length > 10 ? `\n... and ${info.villages.length - 10} more` : '';
    embed.addFields({ name: translate(lang, 'player_info.villages'), value: `${villageList}${more}`, inline: false });
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
  const ltr = '\u200E';
  const tFields = translate(lang, 'distance.fields');
  const tFastest = translate(lang, 'distance.fastest');

  const tribeEmoji: Record<string, string> = {
    romans: '🏛️',
    teutons: '🪓',
    gauls: '🐴',
    egyptians: '🏺',
    huns: '🏹',
    spartans: '🔱',
  };

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setDescription(`📍 ${translate(lang, 'distance.label')}: ${distance.toFixed(1)} ${tFields}`);

  const fields: APIEmbedField[] = [];

  for (const tribe of tribeResults) {
    const tribeKey = tribe.tribeName.toLowerCase();
    const emoji = tribeEmoji[tribeKey] || '▫️';
    const translatedTribe = translate(lang, `tribe.${tribeKey}` as TranslationKey);

    const unitLines = tribe.units.map(u => {
      const isFastest = u.name === tribe.fastest.name;
      return isFastest ? `⭐ ${u.name}: ${u.time}` : `${u.name}: ${u.time}`;
    }).join('\n');

    const value = `${ltr}${unitLines}\n${ltr}🏆 ${tFastest}: ${tribe.fastest.name} — ${tribe.fastest.time}`;

    fields.push({
      name: `${emoji} ${ltr}${translatedTribe}`,
      value,
      inline: false,
    });
  }

  embed.addFields(fields);
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
  const sortedByVP = [...villages].sort((a, b) => b.victoryPoints - a.victoryPoints);
  const topVP = sortedByVP[0]?.victoryPoints ?? 0;
  const secondVP = sortedByVP[1]?.victoryPoints ?? 0;
  const thirdVP = sortedByVP[2]?.victoryPoints ?? 0;

  const fields: APIEmbedField[] = villages.map((v, i) => {
    const safeName = /[\u0600-\u06FF\u0750-\u077F]/.test(v.name) ? `${ltr}\`${v.name}\`` : v.name;
    const safePlayer = v.playerName && /[\u0600-\u06FF\u0750-\u077F]/.test(v.playerName) ? `${ltr}\`${v.playerName}\`` : (v.playerName ?? '—');
    const safeAlliance = v.allianceTag && /[\u0600-\u06FF\u0750-\u077F]/.test(v.allianceTag) ? `${ltr}\`${v.allianceTag}\`` : v.allianceTag;

    let vpEmoji = '';
    if (v.victoryPoints === topVP && topVP > 0) vpEmoji = '🥇 ';
    else if (v.victoryPoints === secondVP && secondVP > 0) vpEmoji = '🥈 ';
    else if (v.victoryPoints === thirdVP && thirdVP > 0) vpEmoji = '🥉 ';

    return {
      name: `${i + 1}. ${ltr}${safeName} (${v.x}|${v.y}) ${vpEmoji}🏆 VP: ${v.victoryPoints}`,
      value: `${ltr}👤 ${safePlayer} | 🏘️ ${tPop}: ${v.population}${safeAlliance ? ` | 🏴 ${tAlliance}: ${safeAlliance}` : ''}`,
      inline: false,
    };
  });

  embed.addFields(fields);

  return embed;
}
