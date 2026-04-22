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

function interpolate(template: string, vars: Record<string, string | number | boolean | null | undefined>): string {
  return template.replace(/\{(\w+)(?:,\s*select,\s*(\w+)\s*\{([^}]*)\s*(\w+)\s*\{([^}]*)\}\s*\})?\}/g, (match, key, _type, defaultVal, optionKey, optionVal) => {
    if (optionKey && optionVal && defaultVal) {
      const val = String(vars[key] ?? '');
      return val === optionKey ? optionVal.trim() : defaultVal.trim();
    }
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}

export function translate(language: string | null | undefined, key: TranslationKey, vars?: Record<string, string | number | boolean | null | undefined>): string {
  const resolvedLanguage = normalizeLanguage(language) ?? DEFAULT_LANGUAGE;
  const template = dictionaries[resolvedLanguage][key] ?? dictionaries.en[key] ?? key;

  return vars ? interpolate(template, vars) : template;
}
