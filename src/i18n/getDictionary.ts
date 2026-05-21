import 'server-only';

const dictionaries = {
  ja: () => import('./messages/ja.json').then((m) => m.default),
  en: () => import('./messages/en.json').then((m) => m.default),
} as const;

export type Locale = keyof typeof dictionaries;

export const locales: Locale[] = ['ja', 'en'];
export const defaultLocale: Locale = 'ja';

export function hasLocale(locale: string): locale is Locale {
  return locale in dictionaries;
}

export async function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}
