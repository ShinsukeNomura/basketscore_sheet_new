'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getGamesIndex, deleteGame, GameSummary, FREE_GAME_LIMIT } from '@/lib/storage';
import { fetchGamesFromCloud, deleteGameFromCloud } from '@/lib/supabaseStorage';
import { CreateGameSheet } from '@/components/CreateGameSheet';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ChevronRight, Plus, Trophy, Trash2, Clock, Crown, LogOut, RefreshCw, BookOpen, Users, BarChart2 } from 'lucide-react';
import { MyTeamsSheet } from '@/components/MyTeamsSheet';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function GameCard({ game, onDelete }: { game: GameSummary; onDelete: (id: string) => void }) {
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
        <div className={cn('w-2 h-2 rounded-full shrink-0', isFinished ? 'bg-white/20' : 'bg-emerald-400 animate-pulse')} />
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm truncate">{game.game_name}</span>
            {isFinished ? (
              <span className="text-[10px] text-white/30 font-medium shrink-0">終了</span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold shrink-0">進行中</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs truncate max-w-[80px]', weWon ? 'text-blue-300 font-bold' : 'text-white/50')}>{game.ourTeamName}</span>
            <span className="text-white/20 text-xs">{game.ourScore} - {game.theirScore}</span>
            <span className={cn('text-xs truncate max-w-[80px]', theyWon ? 'text-white font-bold' : 'text-white/50')}>{game.theirTeamName}</span>
          </div>
          <span className="text-[11px] text-white/25">{formatDate(game.date)}</span>
        </div>
        <ChevronRight size={16} className="text-white/20 shrink-0" />
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onDelete(game.id); }}
        className="absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="削除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function HomePage() {
  const { user, isPremium, signOut, loading } = useAuth();
  const [games,      setGames]      = useState<GameSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState<string | null>(null);
  const [myTeamsOpen,   setMyTeamsOpen]   = useState(false);

  // プレミアム登録後に自動で試合作成シートを開く
  useEffect(() => {
    if (!loading && user && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === 'true') {
        setCreateOpen(true);
        window.history.replaceState({}, '', '/');
      }
    }
  }, [loading, user]);

  // 未ログイン時はログインページへ
  useEffect(() => {
    if (!loading && !user) window.location.href = '/login';
  }, [user, loading]);

  // ゲーム一覧ロード
  const loadGames = useCallback(async () => {
    if (user?.id) {
      const cloud = await fetchGamesFromCloud(user.id);
      if (cloud !== null) { setGames(cloud); return; }
    }
    setGames(getGamesIndex());
  }, [user?.id]);

  useEffect(() => { if (!loading) loadGames(); }, [loading, loadGames]);

  useEffect(() => {
    window.addEventListener('focus', loadGames);
    return () => window.removeEventListener('focus', loadGames);
  }, [loadGames]);

  // 手動同期
  const handleSync = useCallback(async () => {
    if (syncing || !user?.id) return;
    setSyncing(true);
    setSyncMsg(null);
    const cloud = await fetchGamesFromCloud(user.id);
    if (cloud !== null) {
      setGames(cloud);
      setSyncMsg(`${cloud.length}件を同期しました`);
    } else {
      setSyncMsg('同期に失敗しました');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 3000);
  }, [syncing, user?.id]);

  async function handleDelete(id: string) {
    if (!confirm('この試合を削除しますか？')) return;
    deleteGame(id);
    if (user?.id) await deleteGameFromCloud(id);
    loadGames();
  }

  const activeGames   = games.filter((g) => g.status === 'progress');
  const finishedGames = games.filter((g) => g.status === 'finished');

  if (loading || !user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-950">
        <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">

      {/* ── ヘッダー ── */}
      <div className="flex flex-col items-center pt-14 pb-6 px-6">
        <div className="w-14 h-14 bg-blue-500/15 rounded-2xl flex items-center justify-center mb-4">
          <Trophy size={26} className="text-blue-400" />
        </div>
        <h1 className="text-white font-black text-2xl tracking-tight">Basketball Score</h1>
        <p className="text-white/30 text-sm mt-1">片手でリアルタイム記録</p>

        {/* ユーザー情報 */}
        <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
          {isPremium ? <Crown size={12} className="text-amber-400" /> : <span className="w-2 h-2 rounded-full bg-white/30" />}
          <span className="text-white/40 text-xs truncate max-w-[160px]">{user?.email}</span>
          {isPremium && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">PRO</span>
          )}
          <button onClick={signOut} className="text-white/25 hover:text-white/60 transition-colors ml-1" aria-label="ログアウト">
            <LogOut size={12} />
          </button>
        </div>

        {/* アクションボタン行 */}
        <div className="flex gap-2 mt-3 flex-wrap justify-center">
          <button
            onClick={handleSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/50 text-xs font-semibold active:bg-white/10 transition-colors"
          >
            <RefreshCw size={12} className={cn(syncing && 'animate-spin')} />
            {syncing ? '同期中...' : syncMsg ?? 'クラウド同期'}
          </button>
          <button
            onClick={() => setMyTeamsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/50 text-xs font-semibold active:bg-white/10 transition-colors"
          >
            <Users size={12} />登録チーム
          </button>
          <Link
            href="/guide"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/50 text-xs font-semibold active:bg-white/10 transition-colors"
          >
            <BookOpen size={12} />使い方
          </Link>
          <Link
            href="/analysis"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              isPremium
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 active:bg-amber-500/25'
                : 'bg-white/6 border border-white/10 text-white/50 active:bg-white/10',
            )}
          >
            <BarChart2 size={12} />分析
            {isPremium && <Crown size={9} className="text-amber-400" />}
          </Link>
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="flex-1 px-4 pb-32">

        {activeGames.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">進行中</p>
            </div>
            <div className="flex flex-col gap-2">
              {activeGames.map((g) => <GameCard key={g.id} game={g} onDelete={handleDelete} />)}
            </div>
          </section>
        )}

        {finishedGames.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock size={11} className="text-white/30" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">終了した試合</p>
            </div>
            <div className="flex flex-col gap-2">
              {finishedGames.map((g) => <GameCard key={g.id} game={g} onDelete={handleDelete} />)}
            </div>
          </section>
        )}

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
            <Crown size={18} />プレミアムで続ける
          </button>
        ) : (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl py-4 text-base transition-colors"
          >
            <Plus size={18} />
            新しい試合を作成
            {!isPremium && (
              <span className="ml-auto text-[11px] text-blue-300/70 font-semibold">
                残り{Math.max(0, FREE_GAME_LIMIT - games.length)}試合（無料）
              </span>
            )}
          </button>
        )}
      </div>

      <CreateGameSheet
        open={createOpen}
        onClose={() => { setCreateOpen(false); loadGames(); }}
      />
      {user && (
        <MyTeamsSheet
          open={myTeamsOpen}
          userId={user.id}
          userEmail={user.email}
          isPremium={isPremium}
          onClose={() => setMyTeamsOpen(false)}
        />
      )}
    </div>
  );
}
