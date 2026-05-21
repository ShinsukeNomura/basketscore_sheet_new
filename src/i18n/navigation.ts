'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import type { Locale } from './getDictionary';

/** 現在のロケールを返す hook */
export function useLocale(): Locale {
  const params = useParams();
  return (params?.lang as Locale) ?? 'ja';
}

/** ロケール付きのパスを生成 */
export function localePath(locale: Locale, path: string): string {
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

/** 現在のロケールに基づくナビゲーション helper を返す hook */
export function useLocaleRouter() {
  const locale = useLocale();
  const to = useCallback(
    (path: string) => localePath(locale, path),
    [locale],
  );
  return { locale, to };
}
