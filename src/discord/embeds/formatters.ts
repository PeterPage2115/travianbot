import { EmbedBuilder, APIEmbedField } from 'discord.js';

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
  title: string,
  villages: VillageEntry[],
  totalMatched: number,
  hasMore: boolean,
  color: number = 0x3498db
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: `Showing ${villages.length} of ${totalMatched} results${hasMore ? ' (more available)' : ''}` });

  if (villages.length === 0) {
    embed.setDescription('No villages found.');
    return embed;
  }

  const fields: APIEmbedField[] = villages.map(v => ({
    name: `${v.name} (${v.x}|${v.y})`,
    value: `Player: ${v.playerName ?? '—'} | Pop: ${v.population}${v.allianceTag ? ` | Alliance: ${v.allianceTag}` : ''}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createVillageWithDistanceEmbed(
  title: string,
  villages: VillageWithDistance[],
  totalMatched: number,
  hasMore: boolean,
  color: number = 0xe74c3c
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: `Showing ${villages.length} of ${totalMatched} results${hasMore ? ' (more available)' : ''}` });

  if (villages.length === 0) {
    embed.setDescription('No villages found in the specified radius.');
    return embed;
  }

  const fields: APIEmbedField[] = villages.map(v => ({
    name: `${v.name} (${v.x}|${v.y}) — ${v.distance.toFixed(1)} fields`,
    value: `Player: ${v.playerName ?? '—'} | Pop: ${v.population}${v.allianceTag ? ` | Alliance: ${v.allianceTag}` : ''}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createInactiveReportEmbed(
  title: string,
  candidates: InactiveCandidate[],
  totalMatched: number,
  hasMore: boolean,
  color: number = 0xf39c12
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: `Showing ${candidates.length} of ${totalMatched} candidates${hasMore ? ' (more available)' : ''}` });

  if (candidates.length === 0) {
    embed.setDescription('No inactive candidates found.');
    return embed;
  }

  const fields: APIEmbedField[] = candidates.map(c => ({
    name: `${c.name} (${c.x}|${c.y}) — Score: ${c.inactivityScore}`,
    value: `Player: ${c.playerName ?? '—'} | Pop: ${c.population}\nReasons: ${c.explanation.reasons.join(', ') || 'No change in population'}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}

export function createDiplomacyListEmbed(
  title: string,
  statuses: Array<{ allianceTag: string; status: string }>,
  color: number = 0x9b59b6
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color);

  if (statuses.length === 0) {
    embed.setDescription('No diplomacy settings configured.');
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
    { name: 'Players', value: stats.totalPlayers.toString(), inline: true },
    { name: 'Villages', value: stats.totalVillages.toString(), inline: true },
    { name: 'Total Pop', value: stats.totalPopulation.toLocaleString(), inline: true },
    { name: 'Avg Pop/Village', value: stats.avgPopulationPerVillage.toString(), inline: true },
  );

  if (stats.topPlayers.length > 0) {
    const topList = stats.topPlayers
      .map((p, i) => `${i + 1}. **${p.name}** — ${p.villageCount} villages, ${p.totalPopulation.toLocaleString()} pop`)
      .join('\n');
    embed.addFields({ name: 'Top Players', value: topList, inline: false });
  }

  return embed;
}

export function createPlayerInfoEmbed(
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
    { name: 'Tribe', value: info.tribeName ?? 'Unknown', inline: true },
    { name: 'Alliance', value: info.allianceTag ?? 'None', inline: true },
    { name: 'Villages', value: info.totalVillages.toString(), inline: true },
    { name: 'Total Pop', value: info.totalPopulation.toLocaleString(), inline: true },
  );

  if (info.villages.length > 0) {
    const villageList = info.villages.slice(0, 10).map(v => {
      const flags = [v.isCapital ? '👑' : '', v.isCity ? '🏙️' : '', v.hasHarbor ? '⚓' : '', v.victoryPoints > 0 ? `⭐${v.victoryPoints}` : ''].filter(Boolean).join(' ');
      return `${v.name} (${v.x}|${v.y}) — Pop: ${v.population}${flags ? ` ${flags}` : ''}`;
    }).join('\n');
    embed.addFields({ name: 'Villages', value: villageList, inline: false });
  }

  return embed;
}

export function createDistanceEmbed(
  title: string,
  distance: number,
  tribeResults: Array<{
    tribeName: string;
    units: Array<{ name: string; speed: number; time: string }>;
    fastest: { name: string; time: string };
  }>,
  color: number = 0x9b59b6
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields({ name: 'Distance', value: `${distance.toFixed(1)} fields`, inline: false });

  for (const tribe of tribeResults) {
    const unitLines = tribe.units.map(u => `  ${u.name} (${u.speed}/h): ${u.time}`).join('\n');
    embed.addFields({
      name: `${tribe.tribeName} (speed ×2)`,
      value: `${unitLines}\n🐎 Fastest: ${tribe.fastest.name} — ${tribe.fastest.time}`,
      inline: false,
    });
  }

  return embed;
}

export function createWotwInfoEmbed(
  title: string,
  villages: Array<{ villageId: number; name: string; x: number; y: number; population: number; playerName: string | null; allianceTag: string | null; victoryPoints: number }>,
  totalMatched: number,
  hasMore: boolean,
  color: number = 0xe67e22
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: `Showing ${villages.length} of ${totalMatched} results${hasMore ? ' (more available)' : ''}` });

  if (villages.length === 0) {
    embed.setDescription('No villages with Victory Points found.');
    return embed;
  }

  const fields: APIEmbedField[] = villages.map(v => ({
    name: `${v.name} (${v.x}|${v.y}) — ⭐${v.victoryPoints} VP`,
    value: `Player: ${v.playerName ?? '—'} | Pop: ${v.population}${v.allianceTag ? ` | Alliance: ${v.allianceTag}` : ''}`,
    inline: false,
  }));

  embed.addFields(fields);

  return embed;
}
