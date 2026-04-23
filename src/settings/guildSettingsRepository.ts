import { PrismaClient, GuildSetting } from '@prisma/client';
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

  const result = await prisma.guildSetting.upsert({
    where: { guildId: normalizedGuildId },
    update: { defaultLanguage: normalizedLanguage },
    create: {
      guildId: normalizedGuildId,
      defaultLanguage: normalizedLanguage,
    },
  });

  return mapGuildSettingRecord(result);
}

export async function getGuildDefaultLanguage(
  prisma: PrismaClient,
  guildId: string
): Promise<SupportedLanguage | null> {
  const normalizedGuildId = normalizeIdentifier(guildId, 'guildId');

  const result = await prisma.guildSetting.findUnique({
    where: { guildId: normalizedGuildId },
    select: { defaultLanguage: true },
  });

  return normalizeLanguage(result?.defaultLanguage) ?? null;
}

function mapGuildSettingRecord(setting: GuildSetting | null): GuildSettingRecord {
  if (!setting) {
    throw new Error('Failed to persist guild settings');
  }

  return {
    guildId: setting.guildId,
    defaultLanguage: requireSupportedLanguage(setting.defaultLanguage, 'defaultLanguage'),
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
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
