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
              ['販売業者',             'メディリアライズ'],
              ['運営責任者',           '野村 信介'],
              ['所在地・電話番号',     '請求をいただいた場合、遅滞なく電子メール等にて提供いたします'],
              ['メールアドレス',       'info@medirealize.jp'],
              ['販売商品',             'Basketball Score プレミアムプラン（デジタルサービス）の利用ライセンス'],
              ['販売価格',             '各プランの価格はサービス内に表示される金額（税込）'],
              ['商品代金以外の費用',   'インターネット接続料金その他の電気通信回線の通信に関する費用'],
              ['代金の支払い時期',     '初回は決済時。次月以降は毎月同日に決済'],
              ['代金の支払い方法',     'クレジットカード（Stripe）'],
              ['提供時期',             '決済完了後、直ちにご利用いただけます'],
              ['返品・キャンセル',     'デジタルコンテンツのため返品・返金不可。サブスクリプション解約はアカウント設定から可能。解約後も当該請求期間終了まで利用可。日割り計算による返金なし'],
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
