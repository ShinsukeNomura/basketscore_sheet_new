'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Crown, Loader2, ChevronRight } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { useLocale } from '@/i18n/navigation';

export default function PremiumSuccessPage() {
  const { isPremium, refetchPlan } = useAuth();
  const dict = useDictionary();
  const locale = useLocale();
  const [polling,   setPolling]   = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [attempts,  setAttempts]  = useState(0);

  useEffect(() => {
    if (isPremium) { setConfirmed(true); setPolling(false); return; }
    if (attempts >= 10) { setPolling(false); return; }
    const t = setTimeout(async () => {
      await refetchPlan();
      setAttempts((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [isPremium, attempts, refetchPlan]);

  useEffect(() => {
    if (!confirmed) return;
    const t = setTimeout(() => {
      window.location.href = `/${locale}?create=true`;
    }, 2000);
    return () => clearTimeout(t);
  }, [confirmed, locale]);

  const p = dict.premium;

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center px-6 gap-6">
      <div className="w-24 h-24 bg-amber-500/15 rounded-3xl flex items-center justify-center">
        {polling ? (
          <Loader2 size={44} className="text-amber-400 animate-spin" />
        ) : (
          <Crown size={44} className="text-amber-400" />
        )}
      </div>

      <div className="text-center">
        {polling ? (
          <>
            <h1 className="text-white font-black text-2xl mb-2">
              {locale === 'ja' ? 'プレミアムを有効化中...' : locale === 'zh' ? '正在激活高级版...' : 'Activating Premium...'}
            </h1>
            <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">
              {locale === 'ja'
                ? '決済を確認しています。\nそのままお待ちください。'
                : locale === 'zh'
                ? '正在验证支付。\n请稍候。'
                : 'Verifying your payment.\nPlease wait a moment.'}
            </p>
          </>
        ) : confirmed ? (
          <>
            <h1 className="text-white font-black text-2xl mb-2">
              {locale === 'ja' ? 'プレミアム登録完了！' : locale === 'zh' ? '高级版激活成功！' : 'Premium Activated!'}
            </h1>
            <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">
              {locale === 'ja'
                ? 'ありがとうございます。\nすべての機能が使えるようになりました。'
                : locale === 'zh'
                ? '感谢您的支持。\n所有高级功能现已解锁。'
                : 'Thank you!\nAll premium features are now unlocked.'}
            </p>
            <p className="text-white/20 text-xs mt-3">
              {locale === 'ja' ? '2秒後に試合作成画面へ移動します...' : locale === 'zh' ? '2秒后跳转至创建比赛页面...' : 'Redirecting in 2 seconds...'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-white font-black text-xl mb-2">
              {locale === 'ja' ? '有効化に時間がかかっています' : locale === 'zh' ? '激活时间稍长' : 'Taking a bit longer than expected'}
            </h1>
            <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">
              {locale === 'ja'
                ? '決済は完了しています。\n数分後にホームページで確認してください。'
                : locale === 'zh'
                ? '支付已完成。\n请几分钟后在主页确认。'
                : 'Your payment was successful.\nPlease check the home screen in a few minutes.'}
            </p>
          </>
        )}
      </div>

      {!polling && (
        <button
          onClick={() => { window.location.href = `/${locale}?create=true`; }}
          className="flex items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl px-6 py-3.5 transition-colors"
        >
          {locale === 'ja' ? '試合を作成する' : locale === 'zh' ? '创建比赛' : 'Create a game'}
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
