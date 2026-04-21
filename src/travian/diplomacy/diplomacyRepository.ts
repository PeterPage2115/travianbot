import { PrismaClient } from '@prisma/client';

export const DIPLOMACY_STATUSES = ['enemy', 'ally', 'nap', 'neutral'] as const;
export type DiplomacyStatus = (typeof DIPLOMACY_STATUSES)[number];

export interface DiplomacyState {
  guildId: string;
  allianceTag: string;
  status: DiplomacyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export async function setAllianceDiplomacyStatus(
  prisma: PrismaClient,
  guildId: string,
  allianceTag: string,
  status: DiplomacyStatus
): Promise<DiplomacyState> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');
  const normalizedAllianceTag = normalizeAllianceTag(allianceTag);
  const normalizedStatus = normalizeDiplomacyStatus(status);

  await ensureDiplomacyTable(prisma);

  const rows = await prisma.$queryRawUnsafe<DiplomacyStateRow[]>(
    `
      INSERT INTO guild_diplomacy_settings (guild_id, alliance_tag, status, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (guild_id, alliance_tag)
      DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING guild_id, alliance_tag, status, created_at, updated_at
    `,
    normalizedGuildId,
    normalizedAllianceTag,
    normalizedStatus
  );

  return mapDiplomacyStateRow(rows[0]);
}

export async function getAllianceDiplomacyStatus(
  prisma: PrismaClient,
  guildId: string,
  allianceTag: string
): Promise<DiplomacyState | null> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');
  const normalizedAllianceTag = normalizeAllianceTag(allianceTag);

  await ensureDiplomacyTable(prisma);

  const rows = await prisma.$queryRawUnsafe<DiplomacyStateRow[]>(
    `
      SELECT guild_id, alliance_tag, status, created_at, updated_at
      FROM guild_diplomacy_settings
      WHERE guild_id = $1 AND alliance_tag = $2
      LIMIT 1
    `,
    normalizedGuildId,
    normalizedAllianceTag
  );

  return rows[0] ? mapDiplomacyStateRow(rows[0]) : null;
}

export async function listDiplomacyStates(
  prisma: PrismaClient,
  guildId: string
): Promise<DiplomacyState[]> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');

  await ensureDiplomacyTable(prisma);

  const rows = await prisma.$queryRawUnsafe<DiplomacyStateRow[]>(
    `
      SELECT guild_id, alliance_tag, status, created_at, updated_at
      FROM guild_diplomacy_settings
      WHERE guild_id = $1
      ORDER BY alliance_tag ASC
    `,
    normalizedGuildId
  );

  return rows.map(mapDiplomacyStateRow);
}

export async function listAllianceTagsByStatus(
  prisma: PrismaClient,
  guildId: string,
  status: DiplomacyStatus
): Promise<string[]> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');
  const normalizedStatus = normalizeDiplomacyStatus(status);

  await ensureDiplomacyTable(prisma);

  const rows = await prisma.$queryRawUnsafe<Array<Pick<DiplomacyStateRow, 'alliance_tag'>>>(
    `
      SELECT alliance_tag
      FROM guild_diplomacy_settings
      WHERE guild_id = $1 AND status = $2
      ORDER BY alliance_tag ASC
    `,
    normalizedGuildId,
    normalizedStatus
  );

  return rows.map(row => row.alliance_tag);
}

export async function removeAllianceDiplomacyStatus(
  prisma: PrismaClient,
  guildId: string,
  allianceTag: string
): Promise<boolean> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');
  const normalizedAllianceTag = normalizeAllianceTag(allianceTag);

  await ensureDiplomacyTable(prisma);

  const deletedCount = await prisma.$executeRawUnsafe(
    `
      DELETE FROM guild_diplomacy_settings
      WHERE guild_id = $1 AND alliance_tag = $2
    `,
    normalizedGuildId,
    normalizedAllianceTag
  );

  return deletedCount > 0;
}

async function ensureDiplomacyTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS guild_diplomacy_settings (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      alliance_tag TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('enemy', 'ally', 'nap', 'neutral')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT guild_diplomacy_settings_guild_id_alliance_tag_key UNIQUE (guild_id, alliance_tag)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS guild_diplomacy_settings_guild_id_status_idx
    ON guild_diplomacy_settings (guild_id, status)
  `);
}

function mapDiplomacyStateRow(row: DiplomacyStateRow): DiplomacyState {
  return {
    guildId: row.guild_id,
    allianceTag: row.alliance_tag,
    status: normalizeDiplomacyStatus(row.status),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function normalizeIdentifier(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeAllianceTag(value: string): string {
  return normalizeIdentifier(value, 'allianceTag').toUpperCase();
}

function normalizeDiplomacyStatus(value: string): DiplomacyStatus {
  const normalized = value.trim().toLowerCase();

  if ((DIPLOMACY_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as DiplomacyStatus;
  }

  throw new TypeError(`status must be one of: ${DIPLOMACY_STATUSES.join(', ')}`);
}

interface DiplomacyStateRow {
  guild_id: string;
  alliance_tag: string;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
}
