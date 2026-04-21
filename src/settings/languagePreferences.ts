import { PrismaClient } from '@prisma/client';
import { DEFAULT_LANGUAGE, SupportedLanguage, normalizeLanguage } from '../i18n/index.js';
import { getGuildDefaultLanguage } from './guildSettingsRepository.js';
import { getUserLanguageOverride } from './userSettingsRepository.js';

export interface LanguagePreferenceInput {
  userOverride?: string | null;
  guildDefault?: string | null;
  fallbackLanguage?: SupportedLanguage;
}

export function resolveEffectiveLanguage(
  input: LanguagePreferenceInput = {}
): SupportedLanguage {
  return (
    normalizeLanguage(input.userOverride) ??
    normalizeLanguage(input.guildDefault) ??
    input.fallbackLanguage ??
    DEFAULT_LANGUAGE
  );
}

export async function resolveStoredLanguagePreference(
  prisma: PrismaClient,
  guildId: string,
  userId?: string | null
): Promise<SupportedLanguage> {
  const [userOverride, guildDefault] = await Promise.all([
    userId ? getUserLanguageOverride(prisma, userId) : Promise.resolve(null),
    getGuildDefaultLanguage(prisma, guildId)
  ]);

  return resolveEffectiveLanguage({ userOverride, guildDefault });
}
