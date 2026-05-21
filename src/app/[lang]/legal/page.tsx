import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getDictionary, hasLocale, defaultLocale, locales, type Locale } from '@/i18n/getDictionary';
import { localeAlternates, baseOG, baseTwitter, PAGE_META, type SeoLocale } from '@/lib/seo';
import type { Metadata } from 'next';

export function generateStaticParams() { return locales.map((lang) => ({ lang })); }

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : defaultLocale) as SeoLocale;
  const meta   = PAGE_META.legal[locale] ?? PAGE_META.legal.ja;
  return {
    title:       meta.title,
    description: meta.description,
    robots:      { index: true, follow: true },
    alternates:  localeAlternates('/legal'),
    openGraph:   baseOG(locale, meta.title, meta.description, '/legal'),
    twitter:     baseTwitter(meta.title, meta.description),
  };
}

export default async function LegalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang as Locale : defaultLocale;
  const dict = await getDictionary(locale);
  const d = dict.legal;

  const rows: [string, string][] = [
    [d.seller,          d.sellerVal],
    [d.manager,         d.managerVal],
    [d.address,         d.addressVal],
    [d.email,           d.emailVal],
    [d.product,         d.productVal],
    [d.price,           d.priceVal],
    [d.extraFees,       d.extraFeesVal],
    [d.paymentTiming,   d.paymentTimingVal],
    [d.paymentMethod,   d.paymentMethodVal],
    [d.delivery,        d.deliveryVal],
    [d.returns,         d.returnsVal],
  ];

  return (
    <div className="min-h-dvh bg-neutral-950 text-white">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8 sticky top-0 bg-neutral-950 z-10">
        <Link href={`/${locale}`} className="flex items-center gap-0.5 text-sky-400 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} /><span className="text-xs font-medium">{dict.nav.home}</span>
        </Link>
        <h1 className="text-white font-black text-base">{d.title}</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto pb-16">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-white/8">
                <td className="py-3 pr-4 text-white/50 font-semibold text-xs align-top whitespace-nowrap w-36">{label}</td>
                <td className="py-3 text-white/75 text-xs leading-relaxed">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
