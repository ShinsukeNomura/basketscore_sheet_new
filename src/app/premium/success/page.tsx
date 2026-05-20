'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';

export default function PremiumSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push('/'), 4000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center px-6 gap-6">
      <div className="w-24 h-24 bg-amber-500/15 rounded-3xl flex items-center justify-center">
        <Crown size={44} className="text-amber-400" />
      </div>
      <div className="text-center">
        <h1 className="text-white font-black text-2xl mb-2">プレミアム登録完了！</h1>
        <p className="text-white/40 text-sm leading-relaxed">
          ありがとうございます。<br />
          すべての機能が使えるようになりました。
        </p>
      </div>
      <p className="text-white/20 text-xs">4秒後にホームへ移動します...</p>
    </div>
  );
}
