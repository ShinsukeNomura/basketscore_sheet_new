/** BCP 47 locale for date/time formatting */
export function toBcp47(locale: string): string {
  if (locale === 'zh-TW') return 'zh-TW';
  if (locale === 'zh') return 'zh-CN';
  if (locale === 'en') return 'en-US';
  return 'ja-JP';
}

export function formatLocaleDateTime(locale: string, date = new Date()): string {
  return date.toLocaleString(toBcp47(locale));
}

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  );
}
