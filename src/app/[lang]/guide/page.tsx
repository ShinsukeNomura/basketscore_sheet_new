import Link from 'next/link';
import {
  ChevronLeft, Plus, Users, BarChart2, ClipboardList, Trophy,
  RefreshCw, Crown, Sparkles, FileText, Smartphone, AlertCircle,
  RotateCcw, ArrowLeftRight, History, Send, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDictionary, hasLocale, defaultLocale, locales, type Locale } from '@/i18n/getDictionary';
import {
  localeAlternates, baseOG, baseTwitter, PAGE_META, type SeoLocale, SITE_URL, SITE_NAME,
} from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const { lang } = await params;
  const locale   = (hasLocale(lang) ? lang : defaultLocale) as SeoLocale;
  const meta     = PAGE_META.guide[locale] ?? PAGE_META.guide.ja;
  return {
    title:       meta.title,
    description: meta.description,
    robots:      { index: true, follow: true },
    alternates:  localeAlternates('/guide'),
    openGraph:   baseOG(locale, meta.title, meta.description, '/guide'),
    twitter:     baseTwitter(meta.title, meta.description),
  };
}

// 全ロケールを静的生成
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// ──────────────────── UI Parts ────────────────────

function SectionTitle({ step, title, color }: { step: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm', color)}>
        {step}
      </div>
      <h2 className="text-white font-black text-lg">{title}</h2>
    </div>
  );
}

function StepCard({ icon: Icon, title, desc, color }: { icon: React.ElementType; title: string; desc: string; color: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/4 border border-white/6">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={17} className="text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-sm">{title}</p>
        <p className="text-white/45 text-xs leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ──────────────────── Page ────────────────────

export default async function GuidePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang as Locale : defaultLocale;
  const dict   = await getDictionary(locale);
  const g      = dict.guide;

  // JSON-LD: HowTo スキーマ（リッチスニペット対象）
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type':    'HowTo',
    name:       g.title,
    description: PAGE_META.guide[locale as SeoLocale]?.description ?? PAGE_META.guide.ja.description,
    url:        `${SITE_URL}/${locale}/guide`,
    image:      `${SITE_URL}/icon-512.png`,
    totalTime:  'PT3M',
    step: [
      { '@type': 'HowToStep', position: 1, name: g.step1Title, text: g.step1Card1Desc },
      { '@type': 'HowToStep', position: 2, name: g.step2Title, text: g.step2Card1Desc },
      { '@type': 'HowToStep', position: 3, name: g.step3Title, text: `${g.step3Step1Desc} ${g.step3Step2Desc}` },
      { '@type': 'HowToStep', position: 4, name: g.step4Title, text: g.step4RunningDesc },
      { '@type': 'HowToStep', position: 5, name: g.step5Title, text: g.step5Card1Desc },
    ],
    tool: [{ '@type': 'HowToTool', name: SITE_NAME }],
  };

  // WebPage スキーマ
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type':    'WebPage',
    url:        `${SITE_URL}/${locale}/guide`,
    name:       g.title,
    description: PAGE_META.guide[locale as SeoLocale]?.description ?? PAGE_META.guide.ja.description,
    inLanguage: locale,
    isPartOf:   { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/${locale}/login` },
        { '@type': 'ListItem', position: 2, name: g.title,   item: `${SITE_URL}/${locale}/guide` },
      ],
    },
  };

  const STAT_BUTTONS = [
    ['2PT / 3PT / FT', g.statBtn2pt,  'text-emerald-400'],
    ['—',              g.statBtnMiss, 'text-red-400/60'],
    ['ORbd / DRbd',    g.statBtnRbd,  'text-blue-400'],
    ['AST / BLK',      g.statBtnAst,  'text-violet-400'],
    ['STL',            g.statBtnStl,  'text-violet-300'],
    ['STL →',          g.statBtnStlTeam, 'text-cyan-400'],
    ['FOUL',           g.statBtnFoul, 'text-amber-400'],
    ['TOV',            g.statBtnTov,   'text-orange-400'],
    ['TOV →',          g.statBtnTovTeam, 'text-sky-400'],
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />

      <div className="min-h-dvh bg-neutral-950 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8 sticky top-0 bg-neutral-950 z-10">
          <Link href={`/${locale}`} className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 shrink-0 p-1 -ml-1">
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">{dict.nav.home}</span>
          </Link>
          <h1 className="text-white font-black text-base">{g.title}</h1>
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col gap-8 pb-16">

          {/* STEP 1 */}
          <section>
            <SectionTitle step="1" title={g.step1Title} color="bg-blue-600" />
            <div className="flex flex-col gap-2">
              <StepCard icon={Plus} title={g.step1Card1} desc={g.step1Card1Desc} color="bg-blue-600/70" />
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-3">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">{g.step1Fields}</p>
                {[
                  [g.step1FieldGameType, g.step1FieldGameTypeVal],
                  [g.step1FieldDate,     g.step1FieldDateVal],
                  [g.step1FieldMyTeam, g.step1FieldMyTeamVal],
                  [g.step1FieldOurTeam,  g.step1FieldOurTeamVal],
                  [g.step1FieldTheirTeam,g.step1FieldTheirTeamVal],
                  [g.step1FieldColor,    g.step1FieldColorVal],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3">
                    <span className="text-white/70 font-semibold text-xs min-w-[130px]">{k}</span>
                    <span className="text-white/35 text-xs">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* STEP 2 */}
          <section>
            <SectionTitle step="2" title={g.step2Title} color="bg-emerald-600" />
            <div className="flex flex-col gap-2">
              <StepCard icon={Users} title={g.step2Card1} desc={g.step2Card1Desc} color="bg-emerald-600/70" />
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <div className="flex gap-2 items-center mb-3">
                  <div className="flex-1 h-10 rounded-xl bg-neutral-800 border border-white/10 flex items-center px-3">
                    <span className="text-white/30 text-sm">{dict.game.backNumber}...</span>
                  </div>
                  <div className="w-16 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{dict.common.add}</span>
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  {['3', '5', '7', '10', '23'].map((n) => (
                    <div key={n} className="flex-1 h-10 rounded-xl bg-neutral-700 flex items-center justify-center">
                      <span className="text-white font-black text-sm">#{n}</span>
                    </div>
                  ))}
                </div>
                <p className="text-white/30 text-[11px] text-center">{g.step2Hint}</p>
              </div>
              <StepCard icon={ArrowLeftRight} title={g.step2Card2} desc={g.step2Card2Desc} color="bg-emerald-700/70" />
            </div>
          </section>

          {/* STEP 3 */}
          <section>
            <SectionTitle step="3" title={g.step3Title} color="bg-violet-600" />
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-3">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">{g.step3Flow}</p>
                {[
                  [g.step3Step1, g.step3Step1Desc],
                  [g.step3Step2, g.step3Step2Desc],
                  [g.step3Step3, g.step3Step3Desc],
                ].map(([step, desc]) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="text-violet-400 font-black text-xs min-w-[90px]">{step}</span>
                    <span className="text-white/40 text-xs leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-cyan-950/25 border border-cyan-500/25 p-4">
                <p className="text-cyan-400/90 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3ColorLegend}</p>
                <p className="text-white/45 text-xs leading-relaxed whitespace-pre-line">{g.step3ColorLegendDesc}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    ['bg-blue-500', g.statBtnRbd],
                    ['bg-violet-500', g.statBtnStl],
                    ['bg-cyan-400', g.statBtnStlTeam],
                    ['bg-amber-500', g.statBtnFoul],
                    ['bg-emerald-500', g.statBtn2pt],
                  ].map(([dot, label]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dot)} />
                      <span className="text-white/35 text-[10px] leading-snug">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-3">{g.step3Buttons}</p>
                <div className="flex flex-col gap-2 text-xs">
                  {STAT_BUTTONS.map(([label, desc, color]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className={cn('font-bold shrink-0 w-40', color)}>{label}</span>
                      <span className="text-white/30">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3ShotFlow}</p>
                <p className="text-white/40 text-xs leading-relaxed">{g.step3ShotFlowDesc}</p>
              </div>
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3FoulFlow}</p>
                <p className="text-white/40 text-xs leading-relaxed">{g.step3FoulFlowDesc}</p>
              </div>
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3CourtMap}</p>
                <p className="text-white/40 text-xs leading-relaxed">{g.step3CourtMapDesc}</p>
              </div>
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3StlLink}</p>
                <p className="text-white/40 text-xs leading-relaxed">{g.step3StlLinkDesc}</p>
              </div>
              <div className="rounded-2xl bg-cyan-950/25 border border-cyan-500/25 p-4">
                <p className="text-cyan-400/90 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3StlPressure}</p>
                <p className="text-white/45 text-xs leading-relaxed whitespace-pre-line">{g.step3StlPressureDesc}</p>
              </div>
              <div className="rounded-2xl bg-sky-950/25 border border-sky-500/25 p-4">
                <p className="text-sky-400/90 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3TeamTov}</p>
                <p className="text-white/45 text-xs leading-relaxed whitespace-pre-line">{g.step3TeamTovDesc}</p>
              </div>
              <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/35 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <BarChart2 size={11} className="text-emerald-400" />
                  </div>
                  <p className="text-emerald-300 text-xs font-black tracking-wider uppercase">{g.step3Gdf}</p>
                </div>
                <p className="text-white/55 text-xs leading-relaxed">{g.step3GdfDesc}</p>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-emerald-400/70 text-[10px] font-semibold mb-1">{g.step3GdfReasons}</p>
                    <p className="text-white/40 text-[11px] leading-relaxed">{g.step3GdfReasonItems}</p>
                  </div>
                  <div>
                    <p className="text-emerald-400/70 text-[10px] font-semibold mb-1">{g.step3GdfHow}</p>
                    <div className="flex flex-col gap-1 mt-0.5">
                      <div className="flex items-start gap-2">
                        <span className="text-cyan-400/70 text-[10px] font-bold shrink-0">①</span>
                        <span className="text-white/40 text-[11px] leading-relaxed">{g.step3GdfHow1}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sky-400/70 text-[10px] font-bold shrink-0">②</span>
                        <span className="text-white/40 text-[11px] leading-relaxed">{g.step3GdfHow2}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-emerald-400/70 text-[10px] font-semibold mb-1">{g.step3GdfDisplay}</p>
                    <p className="text-white/40 text-[11px] leading-relaxed">{g.step3GdfDisplayDesc}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3TovFlow}</p>
                <p className="text-white/40 text-xs leading-relaxed">{g.step3TovFlowDesc}</p>
              </div>
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3TeamFoul}</p>
                <p className="text-white/40 text-xs leading-relaxed">{g.step3TeamFoulDesc}</p>
              </div>
              <StepCard icon={History} title={g.step3Timeline} desc={g.step3TimelineDesc} color="bg-violet-700/70" />
              <StepCard icon={RotateCcw} title={g.step3Undo} desc={g.step3UndoDesc} color="bg-neutral-600" />
            </div>
          </section>

          {/* STEP 4 */}
          <section>
            <SectionTitle step="4" title={g.step4Title} color="bg-amber-600" />
            <div className="flex flex-col gap-2">
              <StepCard icon={ClipboardList} title={g.step4Running} desc={g.step4RunningDesc} color="bg-amber-600/70" />
              <StepCard icon={BarChart2} title={g.step4Stats} desc={g.step4StatsDesc} color="bg-blue-600/70" />
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-3">{g.step4Quarter}</p>
                <div className="flex justify-center gap-2 mb-2">
                  {['1Q', '2Q', '3Q', '4Q'].map((q, i) => (
                    <div key={q} className={cn('w-12 h-9 rounded-lg flex items-center justify-center text-sm font-bold', i === 1 ? 'bg-white text-neutral-900' : 'bg-white/10 text-white/45')}>
                      {q}
                    </div>
                  ))}
                </div>
                <p className="text-white/30 text-[11px] text-center">{g.step4QuarterHint}</p>
              </div>
            </div>
          </section>

          {/* STEP 5 */}
          <section>
            <SectionTitle step="5" title={g.step5Title} color="bg-red-600" />
            <div className="flex flex-col gap-2">
              <StepCard icon={Trophy} title={g.step5Card1} desc={g.step5Card1Desc} color="bg-red-600/70" />
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-2">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-1">{g.step5Done}</p>
                {[
                  [g.step5Running,     g.step5RunningVal],
                  [g.step5StatsDetail, g.step5StatsDetailVal],
                  [g.step5Ai,          g.step5AiVal],
                  [g.step5Pdf,         g.step5PdfVal],
                  [g.step5Image,       g.step5ImageVal],
                  [g.step5Resume,      g.step5ResumeVal],
                  [g.step5Next,        g.step5NextVal],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-2">
                    <span className="text-emerald-400 text-xs font-bold shrink-0">✓</span>
                    <div>
                      <span className="text-white/70 text-xs font-semibold">{title}</span>
                      <span className="text-white/30 text-xs"> — {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* プレミアム機能 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <Crown size={16} className="text-neutral-900" />
              </div>
              <h2 className="text-white font-black text-lg">{g.premiumTitle}</h2>
            </div>
            <div className="rounded-2xl bg-amber-500/8 border border-amber-500/20 p-4 flex flex-col gap-3">
              {([
                [Sparkles,   dict.premium.features.ai,        dict.premium.features.aiDesc],
                [FileText,   dict.premium.features.pdf,       dict.premium.features.pdfDesc],
                [Smartphone, dict.premium.features.cloud,     dict.premium.features.cloudDesc],
                [Plus,       dict.premium.features.unlimited, dict.premium.features.unlimitedDesc.replace('{limit}', '3')],
                [AlertCircle,dict.premium.features.tov,       dict.premium.features.tovDesc],
              ] as [React.ElementType, string, string][]).map(([Icon, title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{title}</p>
                    <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex flex-col gap-3 mt-3">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">{g.premiumTovTitle}</p>
              <p className="text-white/55 text-xs leading-relaxed">{g.premiumTovDesc}</p>
              <div className="flex flex-col gap-2">
                {[
                  [g.premiumTovModeSimple,  'bg-neutral-700',  g.premiumTovModeSimpleDesc],
                  [g.premiumTovModeDetail,   'bg-amber-900/70', g.premiumTovModeDetailDesc],
                ].map(([label, color, desc]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded shrink-0 text-white/90', color)}>{label}</span>
                    <span className="text-white/35 text-xs leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* クラウド連携 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <RefreshCw size={16} className="text-white" />
              </div>
              <h2 className="text-white font-black text-lg">{g.cloudTitle}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/25 p-4 flex flex-col gap-2">
                <p className="text-emerald-400/90 text-xs font-black tracking-wide">↑ {g.cloudUploadTitle}</p>
                <p className="text-white/65 text-sm leading-relaxed">{g.cloudUploadAuto}</p>
                <p className="text-white/65 text-sm leading-relaxed">{g.cloudUploadManual}</p>
              </div>
              <div className="rounded-2xl bg-sky-950/30 border border-sky-500/25 p-4 flex flex-col gap-2">
                <p className="text-sky-400/90 text-xs font-black tracking-wide">↓ {g.cloudDownloadTitle}</p>
                <p className="text-white/65 text-sm leading-relaxed">{g.cloudDownloadBody}</p>
              </div>
              <p className="text-white/30 text-xs text-center px-2 leading-relaxed">{g.cloudDirectionNote}</p>
              <div className="rounded-2xl bg-sky-950/30 border border-sky-500/25 p-4 flex flex-col gap-2">
                <p className="text-sky-300/90 text-xs font-black tracking-wide">{g.guestModeTitle}</p>
                <p className="text-white/65 text-sm leading-relaxed">{g.guestModeDesc}</p>
              </div>
              <div className="rounded-2xl bg-violet-950/30 border border-violet-500/25 p-4 flex flex-col gap-2">
                <p className="text-violet-300/90 text-xs font-black tracking-wide">{g.cloudTransferTitle}</p>
                <div className="flex items-start gap-2">
                  <Send size={14} className="text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-white/65 text-sm leading-relaxed">{g.cloudTransferSend}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Inbox size={14} className="text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-white/65 text-sm leading-relaxed">{g.cloudTransferReceive}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 協力記録モード */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <Users size={16} className="text-white" />
              </div>
              <h2 className="text-white font-black text-lg">{g.collabTitle}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-white/45 text-xs leading-relaxed">{g.collabDesc}</p>

              {/* セットアップ手順 */}
              <StepCard icon={Users} title={g.collab1Title} desc={g.collab1Desc} color="bg-violet-600/70" />
              <StepCard icon={Smartphone} title={g.collab2Title} desc={g.collab2Desc} color="bg-sky-700/70" />

              {/* ロール分担 */}
              <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-3">
                <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">{g.collabRolesTitle}</p>
                <div className="flex flex-col gap-2">
                  {([
                    [g.collabRolePts, g.collabRolePtsDesc, 'bg-emerald-950/70 border-emerald-700/50 text-emerald-100'],
                    [g.collabRoleReb, g.collabRoleRebDesc, 'bg-blue-950/70 border-blue-700/50 text-blue-100'],
                    [g.collabRoleTov, g.collabRoleTovDesc, 'bg-orange-950/70 border-orange-700/50 text-orange-100'],
                    [g.collabRoleDef, g.collabRoleDefDesc, 'bg-red-950/70 border-red-700/50 text-red-100'],
                  ] as [string, string, string][]).map(([label, desc, cls]) => (
                    <div key={label} className={cn('px-3 py-2.5 rounded-xl border', cls)}>
                      <p className="font-semibold text-sm leading-none mb-0.5">{label}</p>
                      <p className="text-[11px] opacity-60 leading-none">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 統合 */}
              <StepCard icon={RefreshCw} title={g.collab3Title} desc={g.collab3Desc} color="bg-emerald-700/70" />

              {/* コツ */}
              <div className="rounded-2xl bg-sky-950/30 border border-sky-500/25 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone size={13} className="text-sky-400 shrink-0" />
                  <p className="text-sky-300/90 text-xs font-black tracking-wide">{g.collabTipTitle}</p>
                </div>
                <p className="text-white/55 text-xs leading-relaxed">{g.collabTipDesc}</p>
              </div>

              {/* 注意事項 */}
              <div className="rounded-2xl bg-amber-950/30 border border-amber-500/25 p-4 flex flex-col gap-2">
                <p className="text-amber-400/90 text-xs font-black tracking-wide">{g.collabNoteTitle}</p>
                {[g.collabNote1, g.collabNote2, g.collabNote3, g.collabNote4].map((note) => (
                  <div key={note} className="flex items-start gap-2">
                    <span className="text-amber-400/70 text-xs font-bold shrink-0">·</span>
                    <p className="text-white/50 text-xs leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
