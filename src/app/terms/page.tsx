import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = { title: '利用規約 — Basketball Score' };

export default function TermsPage() {
  const updated = '2026年5月21日';
  return (
    <div className="min-h-dvh bg-neutral-950 text-white">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8 sticky top-0 bg-neutral-950 z-10">
        <Link href="/" className="flex items-center gap-0.5 text-sky-400 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} /><span className="text-xs font-medium">ホーム</span>
        </Link>
        <h1 className="text-white font-black text-base">利用規約</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-6 pb-16 text-sm leading-relaxed">
        <p className="text-white/40 text-xs">最終更新日：{updated}</p>

        <section>
          <h2 className="text-white font-bold text-base mb-2">1. 本規約への同意</h2>
          <p className="text-white/60">Basketball Score（以下「本アプリ」）を利用することで、本利用規約に同意したものとみなします。同意いただけない場合は本アプリの利用をお控えください。</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">2. サービスの提供</h2>
          <p className="text-white/60">本アプリはバスケットボールの試合記録・分析サービスを提供します。無料プランと有料のプレミアムプランがあります。</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">3. プレミアムプラン</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li>プレミアムプランは月額または年額サブスクリプションです</li>
            <li>決済はStripeを通じて行われます</li>
            <li>サブスクリプションはいつでもキャンセル可能です</li>
            <li>返金については個別にお問い合わせください</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">4. 禁止事項</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li>本アプリの不正利用・リバースエンジニアリング</li>
            <li>他のユーザーのデータへの不正アクセス</li>
            <li>本アプリを通じた違法行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">5. 免責事項</h2>
          <p className="text-white/60">本アプリは「現状のまま」提供されます。データの損失やサービスの中断について、運営者は責任を負いません。重要なデータは定期的にバックアップすることをお勧めします。</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">6. サービスの変更・終了</h2>
          <p className="text-white/60">運営者は事前の通知なくサービスの内容を変更または終了する場合があります。</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">7. 特定商取引法に基づく表記</h2>
          <p className="text-white/60">
            販売事業者・価格・支払方法などの詳細は
            <Link href="/legal" className="text-sky-400 underline mx-1">特定商取引法に基づく表記</Link>
            をご覧ください。
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">8. お問い合わせ</h2>
          <p className="text-white/60"><a href="mailto:info@medirealize.jp" className="text-sky-400 underline">info@medirealize.jp</a></p>
        </section>
      </div>
    </div>
  );
}
