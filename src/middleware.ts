import { NextRequest, NextResponse } from 'next/server';

export const locales = ['ja', 'en', 'zh', 'zh-TW'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'ja';

function getLocale(request: NextRequest): Locale {
  const accepted = request.headers.get('accept-language') ?? '';
  const languages = accepted.split(',').map((l) => l.split(';')[0].trim().toLowerCase());
  for (const lang of languages) {
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('ja')) return 'ja';
    // zh-TW / zh-HK → 繁體, zh-CN / zh → 簡体
    if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk')) return 'zh-TW';
    if (lang.startsWith('zh')) return 'zh';
  }
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API・静的ファイルはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/apple-touch') ||
    pathname.includes('.') // 拡張子付きファイル
  ) {
    return NextResponse.next();
  }

  // パスにすでにロケールが含まれていればそのまま通す（ロケールをヘッダーに付与）
  const matchedLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (matchedLocale) {
    const res = NextResponse.next();
    res.headers.set('x-locale', matchedLocale);
    return res;
  }

  // ロケールにリダイレクト
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|manifest.json|icon-|apple-touch).*)'],
};
