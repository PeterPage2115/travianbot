import { PrismaClient, UserSetting } from '@prisma/client';
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

  const result = await prisma.userSetting.upsert({
    where: { userId: normalizedUserId },
    update: { languageOverride: normalizedLanguage },
    create: {
      userId: normalizedUserId,
      languageOverride: normalizedLanguage,
    },
  });

  return mapUserSettingRecord(result);
}

export async function getUserLanguageOverride(
  prisma: PrismaClient,
  userId: string
): Promise<SupportedLanguage | null> {
  const normalizedUserId = normalizeIdentifier(userId, 'userId');

  const result = await prisma.userSetting.findUnique({
    where: { userId: normalizedUserId },
    select: { languageOverride: true },
  });

  return normalizeLanguage(result?.languageOverride) ?? null;
}

function mapUserSettingRecord(setting: UserSetting | null): UserSettingRecord {
  if (!setting) {
    throw new Error('Failed to persist user settings');
  }

  return {
    userId: setting.userId,
    languageOverride: requireSupportedLanguage(setting.languageOverride, 'languageOverride'),
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
