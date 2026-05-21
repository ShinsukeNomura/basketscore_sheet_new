import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = { title: '特定商取引法に基づく表記 — Basketball Score' };

export default function LegalPage() {
  return (
    <div className="min-h-dvh bg-neutral-950 text-white">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8 sticky top-0 bg-neutral-950 z-10">
        <Link href="/" className="flex items-center gap-0.5 text-sky-400 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} /><span className="text-xs font-medium">ホーム</span>
        </Link>
        <h1 className="text-white font-black text-base">特定商取引法に基づく表記</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto pb-16">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {[
              ['販売事業者',     'Medirealize'],
              ['運営責任者',     '宮崎'],
              ['所在地',         '請求があり次第、遅滞なく開示します'],
              ['電話番号',       '請求があり次第、遅滞なく開示します'],
              ['メールアドレス', 'info@medirealize.jp'],
              ['販売URL',        'https://basketball-score.medirealize.jp'],
              ['販売価格',       '各プランの価格はサービス内に表示される金額（税込）'],
              ['支払方法',       'クレジットカード決済（Stripe）'],
              ['支払時期',       '申込完了時に決済処理。サブスクリプションは各更新日に自動引き落とし'],
              ['サービス提供時期', '決済完了後、即時提供'],
              ['返品・キャンセル', 'サブスクリプションはいつでもキャンセル可能。キャンセル後も契約期間終了まで利用できます。デジタルコンテンツの性質上、原則として返金はいたしかねます。'],
              ['動作環境',       'モダンブラウザ（Safari / Chrome / Edge 最新版）'],
            ].map(([label, value]) => (
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
