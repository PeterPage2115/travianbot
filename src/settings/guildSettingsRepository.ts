import { PrismaClient } from '@prisma/client';
import { SupportedLanguage, normalizeLanguage } from '../i18n/index.js';

export interface GuildSettingRecord {
  guildId: string;
  defaultLanguage: SupportedLanguage;
  createdAt: Date;
  updatedAt: Date;
}

export async function setGuildDefaultLanguage(
  prisma: PrismaClient,
  guildId: string,
  language: SupportedLanguage
): Promise<GuildSettingRecord> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');
  const normalizedLanguage = requireSupportedLanguage(language, 'language');

  await ensureGuildSettingsTable(prisma);

  const rows = await prisma.$queryRawUnsafe<GuildSettingRow[]>(
    `
      INSERT INTO guild_settings (guild_id, default_language, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (guild_id)
      DO UPDATE SET
        default_language = EXCLUDED.default_language,
        updated_at = NOW()
      RETURNING guild_id, default_language, created_at, updated_at
    `,
    normalizedGuildId,
    normalizedLanguage
  );

  return mapGuildSettingRow(rows[0]);
}

export async function getGuildDefaultLanguage(
  prisma: PrismaClient,
  guildId: string
): Promise<SupportedLanguage | null> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');

  await ensureGuildSettingsTable(prisma);

  const rows = await prisma.$queryRawUnsafe<Array<Pick<GuildSettingRow, 'default_language'>>>(
    `
      SELECT default_language
      FROM guild_settings
      WHERE guild_id = $1
      LIMIT 1
    `,
    normalizedGuildId
  );

  return normalizeLanguage(rows[0]?.default_language) ?? null;
}

async function ensureGuildSettingsTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      default_language TEXT NOT NULL CHECK (default_language IN ('en', 'pl')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function mapGuildSettingRow(row: GuildSettingRow | undefined): GuildSettingRecord {
  if (!row) {
    throw new Error('Failed to persist guild settings');
  }

  return {
    guildId: row.guild_id,
    defaultLanguage: requireSupportedLanguage(row.default_language, 'defaultLanguage'),
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

function requireSupportedLanguage(value: string, fieldName: string): SupportedLanguage {
  const normalized = normalizeLanguage(value);

  if (!normalized) {
    throw new TypeError(`${fieldName} must be one of: en, pl`);
  }

  return normalized;
}

interface GuildSettingRow {
  guild_id: string;
  default_language: string;
  created_at: string | Date;
  updated_at: string | Date;
}
