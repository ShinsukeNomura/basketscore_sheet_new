/** 背番号を正規化（"08" と "8" を同一扱い） */
export function normalizeBackNumber(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^\d+$/.test(t)) {
    return String(parseInt(t, 10));
  }
  return t;
}

export function backNumbersMatch(a: string, b: string): boolean {
  return normalizeBackNumber(a) === normalizeBackNumber(b);
}
