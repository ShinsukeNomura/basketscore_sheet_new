import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = { title: 'プライバシーポリシー — Basketball Score' };

export default function PrivacyPage() {
  const updated = '2026年5月21日';
  return (
    <div className="min-h-dvh bg-neutral-950 text-white">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8 sticky top-0 bg-neutral-950 z-10">
        <Link href="/" className="flex items-center gap-0.5 text-sky-400 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} /><span className="text-xs font-medium">ホーム</span>
        </Link>
        <h1 className="text-white font-black text-base">プライバシーポリシー</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-6 pb-16 text-sm leading-relaxed">
        <p className="text-white/40 text-xs">最終更新日：{updated}</p>

        <section>
          <h2 className="text-white font-bold text-base mb-2">1. はじめに</h2>
          <p className="text-white/60">Basketball Score（以下「本アプリ」）は、バスケットボールの試合スコア・スタッツをリアルタイムで記録するアプリです。本ポリシーは、本アプリが収集する情報とその利用方法について説明します。</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">2. 収集する情報</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li><span className="text-white/80 font-semibold">アカウント情報：</span>メールアドレス（ログイン・登録に使用）</li>
            <li><span className="text-white/80 font-semibold">試合データ：</span>スコア、スタッツ記録、チーム名、選手背番号</li>
            <li><span className="text-white/80 font-semibold">決済情報：</span>プレミアムプランの購入処理はStripeが行い、本アプリはカード情報を保持しません</li>
            <li><span className="text-white/80 font-semibold">利用データ：</span>アプリの利用状況（エラーログ等）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">3. 情報の利用目的</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li>アカウントの認証・管理</li>
            <li>試合記録のクラウド保存・複数端末同期</li>
            <li>AI分析機能の提供（Gemini APIを利用）</li>
            <li>プレミアムプランの管理</li>
            <li>アプリの改善・バグ修正</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">4. 第三者サービスの利用</h2>
          <ul className="text-white/60 flex flex-col gap-2 list-disc pl-5">
            <li><span className="text-white/80 font-semibold">Supabase：</span>認証・データベース（<a href="https://supabase.com/privacy" className="text-sky-400 underline" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>）</li>
            <li><span className="text-white/80 font-semibold">Stripe：</span>決済処理（<a href="https://stripe.com/jp/privacy" className="text-sky-400 underline" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>）</li>
            <li><span className="text-white/80 font-semibold">Google Gemini：</span>AI分析（<a href="https://policies.google.com/privacy" className="text-sky-400 underline" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">5. データの保存・セキュリティ</h2>
          <p className="text-white/60">データは暗号化されたクラウドサーバー（日本リージョン）に保存されます。ローカルデータはお使いの端末のストレージに保存されます。</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">6. データの削除</h2>
          <p className="text-white/60">アカウントおよびデータの削除をご希望の場合は、サポートまでお問い合わせください。</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">7. お問い合わせ</h2>
          <p className="text-white/60">プライバシーに関するお問い合わせ：<a href="mailto:info@medirealize.jp" className="text-sky-400 underline">info@medirealize.jp</a></p>
        </section>
      </div>
    </div>
  );
}
