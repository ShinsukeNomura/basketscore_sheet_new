'use client';

import Link from 'next/link';
import {
  ChevronLeft, Plus, Users, BarChart2, ClipboardList, Trophy,
  RefreshCw, Crown, Sparkles, FileText, Smartphone, AlertCircle,
  RotateCcw, ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { useLocale } from '@/i18n/navigation';

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

export default function GuidePage() {
  const dict = useDictionary();
  const g = dict.guide;
  const locale = useLocale();

  return (
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

            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-3">{g.step3Buttons}</p>
              <div className="flex flex-col gap-2 text-xs">
                {[
                  ['2PT / 3PT / FT',                      locale === 'ja' ? '得点（シュート成功）' : 'Points (made)',          'text-emerald-400'],
                  ['2PT miss / 3PT miss / FT miss',        locale === 'ja' ? 'シュートミス（得点なし）' : 'Missed shots',       'text-red-400'],
                  ['ORbd / DRbd',                          locale === 'ja' ? 'オフェンス・ディフェンスリバウンド' : 'Offensive/Defensive rebound', 'text-blue-400'],
                  ['AST / STL / BLK',                      locale === 'ja' ? 'アシスト・スティール・ブロック' : 'Assist / Steal / Block', 'text-violet-400'],
                  ['FOUL',                                  locale === 'ja' ? 'ファウル' : 'Foul',                             'text-amber-400'],
                  ['TOV',                                   locale === 'ja' ? 'ターンオーバー（スタッツパネル最上段）' : 'Turnover (top of stats panel)', 'text-orange-400'],
                ].map(([label, desc, color]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className={cn('font-bold shrink-0 w-40', color)}>{label}</span>
                    <span className="text-white/30">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3CourtMap}</p>
              <p className="text-white/40 text-xs leading-relaxed">{g.step3CourtMapDesc}</p>
            </div>

            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">{g.step3StlLink}</p>
              <p className="text-white/40 text-xs leading-relaxed">{g.step3StlLinkDesc}</p>
            </div>

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
              [Sparkles,  dict.premium.features.ai,        dict.premium.features.aiDesc],
              [FileText,  dict.premium.features.pdf,       dict.premium.features.pdfDesc],
              [Smartphone,dict.premium.features.cloud,     dict.premium.features.cloudDesc],
              [Plus,      dict.premium.features.unlimited, dict.premium.features.unlimitedDesc.replace('{limit}', '3')],
              [AlertCircle,dict.premium.features.tov,      dict.premium.features.tovDesc],
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

          {/* TOV詳細分類 */}
          <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex flex-col gap-3 mt-3">
            <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">{g.premiumTovTitle}</p>
            <p className="text-white/55 text-xs leading-relaxed">{g.premiumTovDesc}</p>
            <div className="flex flex-col gap-2">
              {[
                [g.premiumTovModeSimple, 'bg-neutral-700',  g.premiumTovModeSimpleDesc],
                [g.premiumTovMode6,      'bg-sky-900/70',   g.premiumTovMode6Desc],
                [g.premiumTovMode12,     'bg-amber-900/70', g.premiumTovMode12Desc],
              ].map(([label, color, desc]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded shrink-0 text-white/90', color)}>{label}</span>
                  <span className="text-white/35 text-xs leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-white/4 border border-white/6 p-3 flex flex-col gap-1.5">
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">{g.premiumTovAutoConvert}</p>
              <p className="text-white/40 text-xs leading-relaxed">{g.premiumTovAutoConvertDesc}</p>
              {[
                [g.premiumTov6to12, g.premiumTov6to12Val],
                [g.premiumTov12to6, g.premiumTov12to6Val],
              ].map(([dir, rule]) => (
                <div key={dir} className="flex items-start gap-2 mt-0.5">
                  <span className="text-amber-400/70 text-[10px] font-bold shrink-0 min-w-[90px]">{dir}</span>
                  <span className="text-white/30 text-[10px] leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* クラウド同期 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <RefreshCw size={16} className="text-white" />
            </div>
            <h2 className="text-white font-black text-lg">{g.cloudTitle}</h2>
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-3">
              {[
                [g.cloudStep1, g.cloudStep1Val],
                [g.cloudStep2, g.cloudStep2Val],
                [g.cloudStep3, g.cloudStep3Val],
              ].map(([step, result]) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-white/70 text-sm font-semibold">{step}</span>
                  <span className="text-white/35 text-xs">{result}</span>
                </div>
              ))}
            </div>
            <p className="text-white/25 text-xs text-center px-4">{g.cloudHint}</p>
          </div>
        </section>

      </div>
    </div>
  );
}
