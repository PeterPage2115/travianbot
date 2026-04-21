import en from './en.js';
import pl from './pl.js';

export const SUPPORTED_LANGUAGES = ['en', 'pl'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type TranslationKey = keyof typeof en;

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const dictionaries: Record<SupportedLanguage, Record<TranslationKey, string>> = {
  en,
  pl
};

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === 'en' || value === 'pl';
}

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return isSupportedLanguage(normalized) ? normalized : null;
}

export function translate(language: string | null | undefined, key: TranslationKey): string {
  const resolvedLanguage = normalizeLanguage(language) ?? DEFAULT_LANGUAGE;

  return dictionaries[resolvedLanguage][key] ?? dictionaries.en[key] ?? key;
}
