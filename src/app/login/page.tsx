'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Trophy, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode,     setMode]     = useState<Mode>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false); // サインアップ完了

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    setError(null);

    if (mode === 'signup') {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        setDone(true);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        router.push('/');
      }
    }
    setLoading(false);
  }, [mode, email, password, signIn, signUp, router]);

  // サインアップ完了画面
  if (done) {
    return (
      <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-16 h-16 bg-emerald-500/15 rounded-3xl flex items-center justify-center">
          <Mail size={28} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-xl mb-2">確認メールを送信しました</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            {email} に確認メールを送りました。<br />
            メール内のリンクをクリックしてログインしてください。
          </p>
        </div>
        <button
          onClick={() => { setDone(false); setMode('signin'); }}
          className="text-blue-400 text-sm font-semibold"
        >
          ログイン画面へ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col px-6 pt-safe">

      {/* ヘッダー */}
      <div className="flex flex-col items-center pt-16 pb-10 gap-4">
        <div className="w-16 h-16 bg-blue-500/15 rounded-3xl flex items-center justify-center">
          <Trophy size={28} className="text-blue-400" />
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-2xl tracking-tight">Basketball Score</h1>
          <p className="text-white/30 text-sm mt-1">
            {mode === 'signin' ? 'ログインして記録を続ける' : '無料アカウントを作成'}
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
              {m === 'signin' ? 'ログイン' : '新規登録'}
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
            placeholder="メールアドレス"
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
            placeholder={mode === 'signup' ? 'パスワード（6文字以上）' : 'パスワード'}
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

        {/* エラー */}
        {error && (
          <p className="text-red-400 text-sm px-1">{error}</p>
        )}

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl py-4 text-base transition-colors mt-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {mode === 'signin' ? 'ログイン' : 'アカウントを作成'}
        </button>

      </div>

      {/* 注意書き */}
      {mode === 'signup' && (
        <p className="text-white/20 text-xs text-center mt-6 leading-relaxed px-4">
          登録することで利用規約およびプライバシーポリシーに同意したものとみなします。
        </p>
      )}
    </div>
  );
}
