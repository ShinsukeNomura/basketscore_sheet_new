import type { Metadata } from 'next';
import { hasLocale, defaultLocale, type Locale } from '@/i18n/getDictionary';
import { localeAlternates, baseOG, baseTwitter, PAGE_META, type SeoLocale, SITE_URL } from '@/lib/seo';

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const { lang } = await params;
  const locale   = (hasLocale(lang) ? lang : defaultLocale) as SeoLocale;
  const meta     = PAGE_META.login[locale] ?? PAGE_META.login.ja;

  return {
    title:       meta.title,
    description: meta.description,
    robots:      { index: true, follow: true },
    alternates:  localeAlternates('/login'),
    openGraph:   baseOG(locale, meta.title, meta.description, '/login'),
    twitter:     baseTwitter(meta.title, meta.description),
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
