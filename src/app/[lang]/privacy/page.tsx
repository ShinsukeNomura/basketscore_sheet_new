import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getDictionary, hasLocale, defaultLocale, type Locale } from '@/i18n/getDictionary';

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const locale = hasLocale(params.lang) ? params.lang as Locale : defaultLocale;
  const dict = await getDictionary(locale);
  return { title: `${dict.privacy.title} — Basketball Score` };
}

export default async function PrivacyPage({ params }: { params: { lang: string } }) {
  const locale = hasLocale(params.lang) ? params.lang as Locale : defaultLocale;
  const dict = await getDictionary(locale);
  const d = dict.privacy;
  const updated = locale === 'ja' ? '2026年5月21日' : 'May 21, 2026';

  return (
    <div className="min-h-dvh bg-neutral-950 text-white">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8 sticky top-0 bg-neutral-950 z-10">
        <Link href={`/${locale}`} className="flex items-center gap-0.5 text-sky-400 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} /><span className="text-xs font-medium">{dict.nav.home}</span>
        </Link>
        <h1 className="text-white font-black text-base">{d.title}</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-6 pb-16 text-sm leading-relaxed">
        <p className="text-white/40 text-xs">{d.updated.replace('{date}', updated)}</p>

        <section>
          <h2 className="text-white font-bold text-base mb-2">{d.sec1Title}</h2>
          <p className="text-white/60">{d.sec1Body}</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">{d.sec2Title}</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li><span className="text-white/80 font-semibold">{d.sec2Item1Label}</span>{d.sec2Item1Val}</li>
            <li><span className="text-white/80 font-semibold">{d.sec2Item2Label}</span>{d.sec2Item2Val}</li>
            <li><span className="text-white/80 font-semibold">{d.sec2Item3Label}</span>{d.sec2Item3Val}</li>
            <li><span className="text-white/80 font-semibold">{d.sec2Item4Label}</span>{d.sec2Item4Val}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">{d.sec3Title}</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li>{d.sec3Item1}</li>
            <li>{d.sec3Item2}</li>
            <li>{d.sec3Item3}</li>
            <li>{d.sec3Item4}</li>
            <li>{d.sec3Item5}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">{d.sec4Title}</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li><span className="text-white/80 font-semibold">{d.sec4Supabase}</span>{d.sec4SupabaseDesc}（<a href="https://supabase.com/privacy" className="text-sky-400 underline" target="_blank" rel="noopener noreferrer">{d.sec4PrivacyPolicy}</a>）</li>
            <li><span className="text-white/80 font-semibold">{d.sec4Stripe}</span>{d.sec4StripeDesc}（<a href="https://stripe.com/jp/privacy" className="text-sky-400 underline" target="_blank" rel="noopener noreferrer">{d.sec4PrivacyPolicy}</a>）</li>
            <li><span className="text-white/80 font-semibold">{d.sec4Gemini}</span>{d.sec4GeminiDesc}（<a href="https://policies.google.com/privacy" className="text-sky-400 underline" target="_blank" rel="noopener noreferrer">{d.sec4PrivacyPolicy}</a>）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">{d.sec5Title}</h2>
          <p className="text-white/60">{d.sec5Body}</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">{d.sec6Title}</h2>
          <p className="text-white/60">{d.sec6Body}</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">{d.sec7Title}</h2>
          <p className="text-white/60">{d.sec7Body}<a href="mailto:info@medirealize.jp" className="text-sky-400 underline">info@medirealize.jp</a></p>
        </section>
      </div>
    </div>
  );
}
