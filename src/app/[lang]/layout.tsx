import { getDictionary, hasLocale, defaultLocale } from '@/i18n/getDictionary';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  // Next.js 16 generates Promise<unknown> for dynamic segment params
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const p = await params;
  const lang = typeof p.lang === 'string' ? p.lang : defaultLocale;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return <DictionaryProvider dict={dict}>{children}</DictionaryProvider>;
}
