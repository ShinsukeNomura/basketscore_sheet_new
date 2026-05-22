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
  const ps = dict.premiumSuccess;

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
            <h1 className="text-white font-black text-2xl mb-2">{ps.activating}</h1>
            <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">{ps.verifying}</p>
          </>
        ) : confirmed ? (
          <>
            <h1 className="text-white font-black text-2xl mb-2">{ps.activated}</h1>
            <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">{ps.thanks}</p>
            <p className="text-white/20 text-xs mt-3">{ps.redirecting}</p>
          </>
        ) : (
          <>
            <h1 className="text-white font-black text-xl mb-2">{ps.delayed}</h1>
            <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">{ps.delayedHint}</p>
          </>
        )}
      </div>

      {!polling && (
        <button
          onClick={() => { window.location.href = `/${locale}?create=true`; }}
          className="flex items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl px-6 py-3.5 transition-colors"
        >
          {ps.createGame}
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
