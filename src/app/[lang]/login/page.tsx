'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, Loader2, Globe } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { useLocale } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';

const LOCALES = [
  { code: 'ja',    label: '日本語',  flag: '🇯🇵' },
  { code: 'en',    label: 'English', flag: '🇺🇸' },
  { code: 'zh',    label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
] as const;

function LangSwitcher({ current, path }: { current: string; path: string }) {
  const [open, setOpen] = useState(false);
  const cur = LOCALES.find((l) => l.code === current) ?? LOCALES[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/40 text-xs font-semibold active:bg-white/10 transition-colors"
      >
        <Globe size={12} />
        <span>{cur.flag} {cur.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-neutral-800 border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[120px]">
          {LOCALES.filter((l) => l.code !== current).map((l) => (
            <a
              key={l.code}
              href={`/${l.code}${path}`}
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setOpen(false)}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const { signIn, signUp, resetPassword, enterGuestMode } = useAuth();
  const dict = useDictionary();
  const d = dict.login;
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [mode,         setMode]         = useState<Mode>('signup');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [done,         setDone]         = useState(false);
  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const guest = searchParams.get('guest');
    if (guest !== '1') return;
    enterGuestMode();
    window.location.href = `/${locale}`;
  }, [enterGuestMode, locale, searchParams]);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError(locale === 'ja' ? 'メールアドレスとパスワードを入力してください' : 'Please enter your email and password');
      return;
    }
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      setLoading(false);
      setError(d.timeout);
    }, 10000);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        clearTimeout(timeout);
        if (error) setError(error);
        else setDone(true);
      } else {
        const { error } = await signIn(email, password);
        clearTimeout(timeout);
        if (error) {
          setError(`${dict.common.error}: ${error}`);
        } else {
          window.location.href = `/${locale}`;
        }
      }
    } catch (e) {
      clearTimeout(timeout);
      setError(`${dict.common.error}: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(false);
  }, [mode, email, password, signIn, signUp, d, dict.common.error, locale]);

  const handleReset = useCallback(async () => {
    if (!email.trim()) { setError(d.resetEmailRequired); return; }
    setResetLoading(true); setError(null);
    const { error } = await resetPassword(email.trim());
    setResetLoading(false);
    if (error) setError(`${dict.common.error}: ${error}`);
    else setResetSent(true);
  }, [email, resetPassword, d, dict.common.error]);


  if (done) {
    return (
      <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-16 h-16 bg-emerald-500/15 rounded-3xl flex items-center justify-center">
          <Mail size={28} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-xl mb-2">{d.confirmSentTitle}</h1>
          <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">
            {d.confirmSentBody.replace('{email}', email)}
          </p>
        </div>
        <button
          onClick={() => { setDone(false); setMode('signin'); }}
          className="text-blue-400 text-sm font-semibold"
        >
          {d.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col px-6 pt-safe">

      {/* 言語切替 */}
      <div className="flex justify-end pt-4">
        <LangSwitcher current={locale} path="/login" />
      </div>

      {/* ヘッダー */}
      <div className="flex flex-col items-center pt-6 pb-8 gap-5">
        <div className="w-36 h-36 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/40">
          <Image src="/icon-512.png" alt="Basketball Score" width={144} height={144} className="w-full h-full object-cover" priority />
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-3xl tracking-tight">Basketball Score</h1>
          <p className="text-white/30 text-sm mt-1.5">
            {mode === 'signin' ? d.subtitleSignIn : d.subtitleSignUp}
          </p>
        </div>
      </div>

      {/* フォーム */}
      <div className="flex flex-col gap-4">

        {/* モード切り替え */}
        <div className="flex bg-white/6 rounded-2xl p-1 gap-1">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
                mode === m ? 'bg-white text-neutral-900' : 'text-white/40',
              )}
            >
              {m === 'signin' ? d.signIn : d.signUp}
            </button>
          ))}
        </div>

        {/* メール */}
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={d.email}
            autoComplete="email"
            className="w-full bg-white/8 text-white rounded-2xl pl-11 pr-4 py-4 text-base placeholder:text-white/25 outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
          />
        </div>

        {/* パスワード */}
        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={mode === 'signup' ? d.passwordNew : d.password}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full bg-white/8 text-white rounded-2xl pl-11 pr-12 py-4 text-base placeholder:text-white/25 outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 p-1"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm px-1">{error}</p>}

        {resetSent && (
          <p className="text-emerald-400 text-sm px-1 text-center">{d.resetSent}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl py-4 text-base transition-colors mt-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {mode === 'signin' ? d.signIn : d.createAccount}
        </button>

        {mode === 'signin' && !resetSent && (
          <button
            onClick={handleReset}
            disabled={resetLoading}
            className="text-white/30 text-xs text-center active:text-white/60 transition-colors flex items-center justify-center gap-1"
          >
            {resetLoading && <Loader2 size={11} className="animate-spin" />}
            {d.forgotPassword}
          </button>
        )}

        <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/8">
          <button
            type="button"
            onClick={() => {
              enterGuestMode();
              window.location.href = `/${locale}`;
            }}
            className="w-full py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white/80 text-sm font-bold active:bg-white/10 transition-colors"
          >
            {d.guestTry}
          </button>
          <p className="text-white/25 text-[11px] text-center leading-relaxed px-2">{d.guestHint}</p>
        </div>
      </div>

      {mode === 'signup' && (
        <p
          className="text-white/20 text-xs text-center mt-6 leading-relaxed px-4"
          dangerouslySetInnerHTML={{
            __html: d.agreementText
              .replace('{terms}',   `<a href="/${locale}/terms" class="text-sky-400/70 underline underline-offset-2 mx-0.5">${d.terms}</a>`)
              .replace('{privacy}', `<a href="/${locale}/privacy" class="text-sky-400/70 underline underline-offset-2 mx-0.5">${d.privacy}</a>`),
          }}
        />
      )}
    </div>
  );
}
