import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getDictionary, hasLocale, defaultLocale, type Locale } from '@/i18n/getDictionary';

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const locale = hasLocale(params.lang) ? params.lang as Locale : defaultLocale;
  const dict = await getDictionary(locale);
  return { title: `${dict.legal.title} — Basketball Score` };
}

export default async function LegalPage({ params }: { params: { lang: string } }) {
  const locale = hasLocale(params.lang) ? params.lang as Locale : defaultLocale;
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
