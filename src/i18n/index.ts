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
  const selectRegex = /\{(\w+),\s*select,\s*(\w+)\s*\{([^}]*)\}\s*(\w+)\s*\{([^}]*)\}\}/g;
  const simpleRegex = /\{(\w+)\}/g;

  let result = template.replace(selectRegex, (match, key, option1, val1, option2, val2) => {
    const val = String(vars[key] ?? '');
    const lowerVal = val.toLowerCase();
    if (lowerVal === option1.toLowerCase()) return val1.trim();
    if (lowerVal === option2.toLowerCase()) return val2.trim();
    return val1.trim();
  });

  result = result.replace(simpleRegex, (match, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : match;
  });

  return result;
}

export function translate(language: string | null | undefined, key: TranslationKey, vars?: Record<string, string | number | boolean | null | undefined>): string {
  const resolvedLanguage = normalizeLanguage(language) ?? DEFAULT_LANGUAGE;
  const template = dictionaries[resolvedLanguage][key] ?? dictionaries.en[key] ?? key;

  return vars ? interpolate(template, vars) : template;
}
