'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getGamesIndex, deleteGame, GameSummary, FREE_GAME_LIMIT } from '@/lib/storage';
import { CreateGameSheet } from '@/components/CreateGameSheet';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ChevronRight, Plus, Trophy, Trash2, Clock, Crown, LogOut } from 'lucide-react';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function GameCard({
  game,
  onDelete,
}: {
  game: GameSummary;
  onDelete: (id: string) => void;
}) {
  const isFinished = game.status === 'finished';
  const diff       = game.ourScore - game.theirScore;
  const weWon      = isFinished && diff > 0;
  const theyWon    = isFinished && diff < 0;

  return (
    <div className="relative group">
      <Link
        href={`/game/${game.id}`}
        className={cn(
          'flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors',
          'bg-white/5 hover:bg-white/8 active:bg-white/10',
        )}
      >
        {/* ステータスインジケーター */}
        <div
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            isFinished ? 'bg-white/20' : 'bg-emerald-400 animate-pulse',
          )}
        />

        {/* 試合情報 */}
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm truncate">{game.game_name}</span>
            {isFinished ? (
              <span className="text-[10px] text-white/30 font-medium shrink-0">終了</span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold shrink-0">進行中</span>
            )}
          </div>

          {/* チーム名とスコア */}
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs truncate max-w-[80px]', weWon ? 'text-blue-300 font-bold' : 'text-white/50')}>
              {game.ourTeamName}
            </span>
            <span className="text-white/20 text-xs">
              {game.ourScore} - {game.theirScore}
            </span>
            <span className={cn('text-xs truncate max-w-[80px]', theyWon ? 'text-white font-bold' : 'text-white/50')}>
              {game.theirTeamName}
            </span>
          </div>

          <span className="text-[11px] text-white/25">{formatDate(game.date)}</span>
        </div>

        <ChevronRight size={16} className="text-white/20 shrink-0" />
      </Link>

      {/* 削除ボタン（長押しではなくスワイプ相当として右端に常時表示） */}
      <button
        onClick={(e) => { e.preventDefault(); onDelete(game.id); }}
        className={cn(
          'absolute right-12 top-1/2 -translate-y-1/2',
          'p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-950/40',
          'opacity-0 group-hover:opacity-100 transition-all',
        )}
        aria-label="削除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function HomePage() {
  const { user, isPremium, signOut } = useAuth();
  const [games, setGames]       = useState<GameSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // クライアントサイドで localStorage から読み込む
  useEffect(() => {
    setGames(getGamesIndex());
  }, []);

  // ウィンドウフォーカス時に更新（試合から戻ったとき）
  useEffect(() => {
    const handler = () => setGames(getGamesIndex());
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);

  function handleDelete(id: string) {
    if (!confirm('この試合を削除しますか？')) return;
    deleteGame(id);
    setGames(getGamesIndex());
  }

  const activeGames   = games.filter((g) => g.status === 'progress');
  const finishedGames = games.filter((g) => g.status === 'finished');

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">
      {/* ── ヘッダー ── */}
      <div className="flex flex-col items-center pt-14 pb-8 px-6">
        <div className="w-14 h-14 bg-blue-500/15 rounded-2xl flex items-center justify-center mb-4">
          <Trophy size={26} className="text-blue-400" />
        </div>
        <h1 className="text-white font-black text-2xl tracking-tight">Basketball Score</h1>
        <p className="text-white/30 text-sm mt-1">片手でリアルタイム記録</p>

        {/* ユーザー情報 */}
        <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
          {isPremium ? (
            <Crown size={12} className="text-amber-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-white/30" />
          )}
          <span className="text-white/40 text-xs truncate max-w-[160px]">{user?.email}</span>
          {isPremium && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
              PRO
            </span>
          )}
          <button
            onClick={signOut}
            className="text-white/25 hover:text-white/60 transition-colors ml-1"
            aria-label="ログアウト"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="flex-1 px-4 pb-32">

        {/* 進行中 */}
        {activeGames.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">
                進行中
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {activeGames.map((g) => (
                <GameCard key={g.id} game={g} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        )}

        {/* 過去の試合 */}
        {finishedGames.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock size={11} className="text-white/30" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">
                終了した試合
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {finishedGames.map((g) => (
                <GameCard key={g.id} game={g} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        )}

        {/* 試合なし */}
        {games.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-white/15 text-4xl">🏀</span>
            <span className="text-white/30 text-sm">試合がまだありません</span>
            <span className="text-white/15 text-xs">下のボタンから最初の試合を作成してください</span>
          </div>
        )}
      </div>

      {/* ── 新規試合ボタン（固定フッター） ── */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-neutral-950/90 backdrop-blur-md border-t border-white/5">
        {!isPremium && games.length >= FREE_GAME_LIMIT ? (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center gap-2 w-full bg-amber-500 active:bg-amber-600 text-neutral-900 font-black rounded-2xl py-4 text-base transition-colors"
          >
            <Crown size={18} />
            プレミアムで続ける
          </button>
        ) : (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl py-4 text-base transition-colors"
          >
            <Plus size={18} />
            新しい試合を作成
            <span className="ml-auto text-[11px] text-blue-300/70 font-semibold">
              残り{FREE_GAME_LIMIT - games.length}試合（無料）
            </span>
          </button>
        )}
      </div>

      {/* 試合作成シート */}
      <CreateGameSheet
        open={createOpen}
        onClose={() => { setCreateOpen(false); setGames(getGamesIndex()); }}
      />
    </div>
  );
}
