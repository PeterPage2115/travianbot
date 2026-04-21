import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from 'dotenv';
import { setGuildDefaultLanguage } from '../../src/settings/guildSettingsRepository.js';
import { setUserLanguageOverride } from '../../src/settings/userSettingsRepository.js';
import {
  resolveEffectiveLanguage,
  resolveStoredLanguagePreference
} from '../../src/settings/languagePreferences.js';
import { DEFAULT_LANGUAGE, translate } from '../../src/i18n/index.js';

config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe('Language preferences', () => {
  const testRunId = Date.now().toString(36);
  const guildId = `language-pref-guild-${testRunId}`;
  const userId = `language-pref-user-${testRunId}`;
  const userWithoutOverrideId = `language-pref-user-no-override-${testRunId}`;

  afterAll(async () => {
    try {
      await prisma.$executeRawUnsafe('DELETE FROM user_settings WHERE user_id IN ($1, $2)', userId, userWithoutOverrideId);
      await prisma.$executeRawUnsafe('DELETE FROM guild_settings WHERE guild_id = $1', guildId);
    } catch {
      // Ignore cleanup errors when persistence tables were not created due to an earlier test failure.
    }

    await prisma.$disconnect();
    await pool.end();
  });

  it('prefers user override over guild default', () => {
    expect(resolveEffectiveLanguage({ userOverride: 'en', guildDefault: 'pl' })).toBe('en');
  });

  it('falls back to guild default when user override is missing or unsupported', () => {
    expect(resolveEffectiveLanguage({ guildDefault: 'pl' })).toBe('pl');
    expect(resolveEffectiveLanguage({ userOverride: 'de', guildDefault: 'pl' })).toBe('pl');
  });

  it('falls back to the application default language when no saved preference is usable', () => {
    expect(resolveEffectiveLanguage()).toBe(DEFAULT_LANGUAGE);
    expect(resolveEffectiveLanguage({ userOverride: 'de', guildDefault: 'cz' })).toBe(DEFAULT_LANGUAGE);
  });

  it('persists guild and user language settings and resolves the effective language from storage', async () => {
    await setGuildDefaultLanguage(prisma, guildId, 'pl');

    expect(await resolveStoredLanguagePreference(prisma, guildId, userWithoutOverrideId)).toBe('pl');

    await setUserLanguageOverride(prisma, userId, 'en');

    expect(await resolveStoredLanguagePreference(prisma, guildId, userId)).toBe('en');
  });

  it('recreates settings tables after they are dropped in the same process', async () => {
    await setGuildDefaultLanguage(prisma, guildId, 'pl');
    await setUserLanguageOverride(prisma, userId, 'en');

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS user_settings');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS guild_settings');

    await setGuildDefaultLanguage(prisma, guildId, 'en');
    await setUserLanguageOverride(prisma, userId, 'pl');

    expect(await resolveStoredLanguagePreference(prisma, guildId, userId)).toBe('pl');
    expect(await resolveStoredLanguagePreference(prisma, guildId, userWithoutOverrideId)).toBe('en');
  });

  it('returns translated command text and status labels for supported languages', () => {
    expect(translate('pl', 'common.saved')).toBe('Zapisano.');
    expect(translate('pl', 'diplomacy.status.enemy')).toBe('Wróg');
    expect(translate('de', 'common.saved')).toBe('Saved.');
  });
});
