import { PrismaClient } from '@prisma/client';
import { SupportedLanguage, normalizeLanguage } from '../i18n/index.js';

export interface UserSettingRecord {
  userId: string;
  languageOverride: SupportedLanguage;
  createdAt: Date;
  updatedAt: Date;
}

export async function setUserLanguageOverride(
  prisma: PrismaClient,
  userId: string,
  language: SupportedLanguage
): Promise<UserSettingRecord> {
  const normalizedUserId = normalizeIdentifier(userId, 'userId');
  const normalizedLanguage = requireSupportedLanguage(language, 'language');

  await ensureUserSettingsTable(prisma);

  const rows = await prisma.$queryRawUnsafe<UserSettingRow[]>(
    `
      INSERT INTO user_settings (user_id, language_override, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        language_override = EXCLUDED.language_override,
        updated_at = NOW()
      RETURNING user_id, language_override, created_at, updated_at
    `,
    normalizedUserId,
    normalizedLanguage
  );

  return mapUserSettingRow(rows[0]);
}

export async function getUserLanguageOverride(
  prisma: PrismaClient,
  userId: string
): Promise<SupportedLanguage | null> {
  const normalizedUserId = normalizeIdentifier(userId, 'userId');

  await ensureUserSettingsTable(prisma);

  const rows = await prisma.$queryRawUnsafe<Array<Pick<UserSettingRow, 'language_override'>>>(
    `
      SELECT language_override
      FROM user_settings
      WHERE user_id = $1
      LIMIT 1
    `,
    normalizedUserId
  );

  return normalizeLanguage(rows[0]?.language_override) ?? null;
}

async function ensureUserSettingsTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      language_override TEXT NOT NULL CHECK (language_override IN ('en', 'pl')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function mapUserSettingRow(row: UserSettingRow | undefined): UserSettingRecord {
  if (!row) {
    throw new Error('Failed to persist user settings');
  }

  return {
    userId: row.user_id,
    languageOverride: requireSupportedLanguage(row.language_override, 'languageOverride'),
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

interface UserSettingRow {
  user_id: string;
  language_override: string;
  created_at: string | Date;
  updated_at: string | Date;
}
