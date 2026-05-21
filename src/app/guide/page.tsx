'use client';

import Link from 'next/link';
import {
  ChevronLeft, Plus, Users, BarChart2, ClipboardList, Trophy,
  RefreshCw, Crown, Sparkles, FileText, Smartphone, AlertCircle,
  RotateCcw, ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

function Badge({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="px-3 py-1.5 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-sm">{label}</div>
      {sub && <span className="text-white/30 text-[10px]">{sub}</span>}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">

      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8 sticky top-0 bg-neutral-950 z-10">
        <Link href="/" className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} />
          <span className="text-xs font-medium">ホーム</span>
        </Link>
        <h1 className="text-white font-black text-base">使い方ガイド</h1>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-8 pb-16">

        {/* ── STEP 1: 試合を作成 ── */}
        <section>
          <SectionTitle step="1" title="試合を作成する" color="bg-blue-600" />
          <div className="flex flex-col gap-2">
            <StepCard icon={Plus} title="新しい試合を作成" desc="ホーム画面下部の「新しい試合を作成」をタップ" color="bg-blue-600/70" />
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-3">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">入力項目</p>
              {[
                ['試合の種類', '練習試合・公式戦・カップ戦・その他'],
                ['日付', '試合の日付'],
                ['チーム名（自チーム）', '自チームの名前'],
                ['チーム名（相手）', '相手チームの名前'],
                ['ジャージカラー', '各チームのユニフォーム色'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-3">
                  <span className="text-white/70 font-semibold text-xs min-w-[130px]">{k}</span>
                  <span className="text-white/35 text-xs">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STEP 2: メンバー登録 ── */}
        <section>
          <SectionTitle step="2" title="メンバーを登録する" color="bg-emerald-600" />
          <div className="flex flex-col gap-2">
            <StepCard icon={Users} title="メンバーボタンをタップ" desc="スコア記録画面でチーム名横の「メンバー」をタップ" color="bg-emerald-600/70" />
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <div className="flex gap-2 items-center mb-3">
                <div className="flex-1 h-10 rounded-xl bg-neutral-800 border border-white/10 flex items-center px-3">
                  <span className="text-white/30 text-sm">背番号を入力...</span>
                </div>
                <div className="w-16 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">追加</span>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {['3', '5', '7', '10', '23'].map((n) => (
                  <div key={n} className="flex-1 h-10 rounded-xl bg-neutral-700 flex items-center justify-center">
                    <span className="text-white font-black text-sm">#{n}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-[11px] text-center">最初の5人はコート入り・6人目からベンチ</p>
            </div>
            <StepCard icon={ArrowLeftRight} title="選手交代" desc="チーム名横の「交代」をタップ → コート選手とベンチ選手を選ぶ" color="bg-emerald-700/70" />
          </div>
        </section>

        {/* ── STEP 3: スタッツ記録 ── */}
        <section>
          <SectionTitle step="3" title="スタッツを記録する" color="bg-violet-600" />
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-3">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">記録の流れ</p>
              {[
                ['① スタッツを選択', '中央パネルのボタンをタップ（例: 2PT・STL）'],
                ['② 選手をタップ', '上下のチームカードから該当選手をタップ'],
                ['③ 自動で記録', 'スコアとスタッツが即座に更新'],
              ].map(([step, desc]) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="text-violet-400 font-black text-xs min-w-[90px]">{step}</span>
                  <span className="text-white/40 text-xs leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>

            {/* ボタン早見表 */}
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-3">ボタン一覧</p>
              <div className="flex flex-col gap-2 text-xs">
                {[
                  ['2PT / 3PT / FT', '得点（シュート成功）', 'text-emerald-400'],
                  ['2PT miss / 3PT miss / FT miss', 'シュートミス（得点なし）', 'text-red-400'],
                  ['ORbd / DRbd', 'オフェンス・ディフェンスリバウンド', 'text-blue-400'],
                  ['AST / STL / BLK', 'アシスト・スティール・ブロック', 'text-violet-400'],
                  ['FOUL', 'ファウル', 'text-amber-400'],
                  ['TOV（チームボタン）', 'ターンオーバー（スタッツパネル最上段）', 'text-orange-400'],
                ].map(([label, desc, color]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className={cn('font-bold shrink-0 w-40', color)}>{label}</span>
                    <span className="text-white/30">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2PT/3PT はエリア選択あり */}
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">シュートエリア記録</p>
              <p className="text-white/40 text-xs leading-relaxed">
                2PT・3PT（成功・ミス）を選択後、選手をタップするとコートマップが表示されます。
                シュートしたエリアをタップして記録します。
              </p>
            </div>

            {/* STL連動 */}
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-2">STL → TOV 自動連動</p>
              <p className="text-white/40 text-xs leading-relaxed">
                STL（スティール）を記録すると、相手チームのTOVが自動で記録されます。
              </p>
            </div>

            <StepCard icon={RotateCcw} title="間違えたら取り消し" desc="画面下部タイムラインの「取り消し」をタップ。STLと連動TOVは一括で取り消されます" color="bg-neutral-600" />
          </div>
        </section>

        {/* ── STEP 4: 便利な機能 ── */}
        <section>
          <SectionTitle step="4" title="便利な機能" color="bg-amber-600" />
          <div className="flex flex-col gap-2">
            <StepCard
              icon={ClipboardList}
              title="ランニングスコアシート"
              desc="ヘッダー右のクリップボードアイコンをタップ。1点ずつの得点経過をQ別色分けで確認"
              color="bg-amber-600/70"
            />
            <StepCard
              icon={BarChart2}
              title="スタッツ詳細"
              desc="ヘッダー右のグラフアイコンをタップ。選手・チームの全スタッツを確認"
              color="bg-blue-600/70"
            />
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-3">クォーター変更</p>
              <div className="flex justify-center gap-2 mb-2">
                {['1Q', '2Q', '3Q', '4Q'].map((q, i) => (
                  <div key={q} className={cn('w-12 h-9 rounded-lg flex items-center justify-center text-sm font-bold', i === 1 ? 'bg-white text-neutral-900' : 'bg-white/10 text-white/45')}>
                    {q}
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-[11px] text-center">ヘッダーのQボタンをタップして切り替え。過去Qに戻って得点を追加することも可能</p>
            </div>
          </div>
        </section>

        {/* ── STEP 5: 試合終了後 ── */}
        <section>
          <SectionTitle step="5" title="試合終了後" color="bg-red-600" />
          <div className="flex flex-col gap-2">
            <StepCard icon={Trophy} title="試合終了ボタン" desc="ヘッダー右の「終了」をタップ。最終スコア・Q別スコアが表示されます" color="bg-red-600/70" />
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-2">
              <p className="text-white/50 text-xs font-semibold tracking-wider uppercase mb-1">終了後にできること</p>
              {[
                ['ランニングスコアシート確認', 'Q別の色分けで1点ずつの得点経過を確認'],
                ['スタッツ詳細を見る', '選手・チームの完全なスタッツ'],
                ['AIスタッツ分析', 'GeminiがコーチAI目線でレポートを生成（PRO）'],
                ['PDFシートを出力', 'スコアシートをPDFで保存・印刷（PRO）'],
                ['記録を再開する', '終了後もスコアの修正・追加が可能'],
                ['次の試合を作成', 'すぐに次の試合を開始'],
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

        {/* ── プレミアム機能 ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Crown size={16} className="text-neutral-900" />
            </div>
            <h2 className="text-white font-black text-lg">プレミアム機能</h2>
          </div>
          <div className="rounded-2xl bg-amber-500/8 border border-amber-500/20 p-4 flex flex-col gap-3">
            {[
              [Sparkles,     'AIスタッツ分析',    'Geminiが試合・チーム・個人データを分析し、コーチ目線のレポートを日本語で生成。結果はキャッシュ保存されます'],
              [FileText,     'PDF出力',           'スコアシートおよびAI分析レポートをPDFで出力・印刷'],
              [Smartphone,   'クラウド同期',      '複数端末で同じアカウントにログインすれば自動同期'],
              [Plus,         '無制限の試合記録',  '無料プランの3試合制限なく記録できる'],
              [AlertCircle,  'TOV詳細分類',       'ターンオーバーを厳選6・公式12カテゴリーで記録（後述）'],
            ].map(([Icon, title, desc]) => (
              <div key={title as string} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{title as string}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{desc as string}</p>
                </div>
              </div>
            ))}
          </div>

          {/* TOV詳細分類の説明 */}
          <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex flex-col gap-3 mt-3">
            <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">TOV詳細分類モード（PRO）</p>
            <p className="text-white/55 text-xs leading-relaxed">
              スタッツパネルの TOV ボタン上部に <span className="text-neutral-200 font-bold">簡略 / 厳選6 PRO / 公式12 PRO</span> の切替ボタンが表示されます。
            </p>
            <div className="flex flex-col gap-2">
              {[
                ['簡略',     'bg-neutral-700',   'TOVボタンを押すと即座に記録（従来通り）'],
                ['厳選6 PRO', 'bg-sky-900/70',   'スチール・パスミス・トラベリング・オフェンスファウル・時間違反・その他 の6分類'],
                ['公式12 PRO','bg-amber-900/70', 'バッドパス・ハンドリング・OOB・ダブドリ・24秒など JBA公式12分類'],
              ].map(([label, color, desc]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded shrink-0 text-white/90', color)}>{label}</span>
                  <span className="text-white/35 text-xs leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-white/4 border border-white/6 p-3 flex flex-col gap-1.5">
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">モード切替時の自動変換</p>
              <p className="text-white/40 text-xs leading-relaxed">
                試合中にモードを切り替えると、記録済みのTOV理由が自動的に変換されます。
              </p>
              {[
                ['厳選6 → 公式12', 'スチール→ロストボール、時間違反→その他'],
                ['公式12 → 厳選6', '24秒/8秒/5秒/バックコート/3秒→時間違反、OOB→パスミス'],
              ].map(([dir, rule]) => (
                <div key={dir} className="flex items-start gap-2 mt-0.5">
                  <span className="text-amber-400/70 text-[10px] font-bold shrink-0 min-w-[90px]">{dir}</span>
                  <span className="text-white/30 text-[10px] leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── クラウド同期の使い方 ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <RefreshCw size={16} className="text-white" />
            </div>
            <h2 className="text-white font-black text-lg">クラウド同期</h2>
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl bg-white/4 border border-white/6 p-4 flex flex-col gap-3">
              {[
                ['スマホで試合記録', '→ 自動的にクラウドへ保存'],
                ['PCや別端末で開く', '→ 同じアカウントでログイン'],
                ['ホームの「クラウド同期」をタップ', '→ 最新データを取得'],
              ].map(([step, result]) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-white/70 text-sm font-semibold">{step}</span>
                  <span className="text-white/35 text-xs">{result}</span>
                </div>
              ))}
            </div>
            <p className="text-white/25 text-xs text-center px-4">
              スタッツ入力後300msで自動同期。ホーム画面のスコアはローカルデータを即時反映します
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
