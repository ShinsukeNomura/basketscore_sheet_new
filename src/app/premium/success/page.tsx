'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Crown, Loader2, ChevronRight } from 'lucide-react';

export default function PremiumSuccessPage() {
  const { isPremium, refetchPlan } = useAuth();
  const [polling,   setPolling]   = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [attempts,  setAttempts]  = useState(0);

  // Webhookが処理されるまで最大20秒ポーリング
  useEffect(() => {
    if (isPremium) {
      setConfirmed(true);
      setPolling(false);
      return;
    }
    if (attempts >= 10) {
      setPolling(false);
      return;
    }
    const t = setTimeout(async () => {
      await refetchPlan();
      setAttempts((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [isPremium, attempts, refetchPlan]);

  // プレミアム確認後、2秒で自動的にホームへ（試合作成シートを開く）
  useEffect(() => {
    if (!confirmed) return;
    const t = setTimeout(() => {
      window.location.href = '/?create=true';
    }, 2000);
    return () => clearTimeout(t);
  }, [confirmed]);

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center px-6 gap-6">

      {/* アイコン */}
      <div className="w-24 h-24 bg-amber-500/15 rounded-3xl flex items-center justify-center">
        {polling ? (
          <Loader2 size={44} className="text-amber-400 animate-spin" />
        ) : (
          <Crown size={44} className="text-amber-400" />
        )}
      </div>

      {/* メッセージ */}
      <div className="text-center">
        {polling ? (
          <>
            <h1 className="text-white font-black text-2xl mb-2">プレミアムを有効化中...</h1>
            <p className="text-white/40 text-sm leading-relaxed">
              決済を確認しています。<br />
              そのままお待ちください。
            </p>
          </>
        ) : confirmed ? (
          <>
            <h1 className="text-white font-black text-2xl mb-2">プレミアム登録完了！</h1>
            <p className="text-white/40 text-sm leading-relaxed">
              ありがとうございます。<br />
              すべての機能が使えるようになりました。
            </p>
            <p className="text-white/20 text-xs mt-3">2秒後に試合作成画面へ移動します...</p>
          </>
        ) : (
          <>
            <h1 className="text-white font-black text-xl mb-2">有効化に時間がかかっています</h1>
            <p className="text-white/40 text-sm leading-relaxed">
              決済は完了しています。<br />
              数分後にホームページで確認してください。
            </p>
          </>
        )}
      </div>

      {/* 手動ボタン */}
      {!polling && (
        <button
          onClick={() => { window.location.href = '/?create=true'; }}
          className="flex items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl px-6 py-3.5 transition-colors"
        >
          試合を作成する
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
