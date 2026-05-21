'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getGamesIndex, deleteGame, GameSummary, FREE_GAME_LIMIT } from '@/lib/storage';
import { fetchGamesFromCloud, deleteGameFromCloud } from '@/lib/supabaseStorage';
import { CreateGameSheet } from '@/components/CreateGameSheet';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ChevronRight, ChevronDown, Plus, Trash2, Clock, Crown, LogOut, RefreshCw, BookOpen, Users, BarChart2, Tag, ChevronUp } from 'lucide-react';
import { MyTeamsSheet } from '@/components/MyTeamsSheet';
import { GameLabelSheet } from '@/components/GameLabelSheet';
import { setGameLabels, DEFAULT_LABELS, getCustomLabels } from '@/lib/storage';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function GameCard({ game, onDelete, onLabel }: {
  game: GameSummary;
  onDelete: (id: string) => void;
  onLabel:  (game: GameSummary) => void;
}) {
  const isFinished = game.status === 'finished';
  const diff       = game.ourScore - game.theirScore;
  const weWon      = isFinished && diff > 0;
  const theyWon    = isFinished && diff < 0;
  const hasLabels  = (game.labels?.length ?? 0) > 0;

  return (
    <div className="rounded-2xl bg-white/5 transition-colors overflow-hidden">
      <div className="flex items-center gap-2">
        <Link
          href={`/game/${game.id}`}
          className="flex items-center gap-4 flex-1 min-w-0 px-4 py-3.5 active:bg-white/5"
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
        {/* ラベルボタン */}
        <button
          onClick={() => onLabel(game)}
          className={cn(
            'p-3 rounded-xl transition-colors shrink-0',
            hasLabels ? 'text-amber-400/70 active:text-amber-300' : 'text-white/15 active:text-amber-400 active:bg-amber-950/30',
          )}
          aria-label="ラベル"
        >
          <Tag size={14} />
        </button>
        {/* 削除ボタン */}
        <button
          onClick={() => onDelete(game.id)}
          className="p-3 mr-1 rounded-xl text-white/20 active:text-red-400 active:bg-red-950/40 transition-colors shrink-0"
          aria-label="削除"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {/* ラベルピル */}
      {hasLabels && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
          {game.labels!.map((l) => (
            <span key={l} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400/80">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, isPremium, signOut, loading } = useAuth();
  const [games,        setGames]        = useState<GameSummary[]>([]);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [syncMsg,      setSyncMsg]      = useState<string | null>(null);
  const [myTeamsOpen,  setMyTeamsOpen]  = useState(false);
  const [labelTarget,  setLabelTarget]  = useState<GameSummary | null>(null);
  const [filterLabel,  setFilterLabel]  = useState<string>('');
  const [filterOpen,   setFilterOpen]   = useState(false);

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
  // ローカルストレージを即時表示（スコアは300msデバウンスで常に最新）
  // クラウドはローカルにないゲーム（別端末作成分）を補完するためだけに使用
  const loadGames = useCallback(async () => {
    const local = getGamesIndex();
    setGames(local);

    if (!user?.id) return;

    const cloud = await fetchGamesFromCloud(user.id);
    if (!cloud) return; // エラー時はローカルのまま

    const localIds = new Set(local.map((g) => g.id));
    const cloudOnly = cloud.filter((g) => !localIds.has(g.id));
    if (cloudOnly.length > 0) {
      setGames((prev) => [...prev, ...cloudOnly]);
    }
  }, [user?.id]);

  useEffect(() => { if (!loading) loadGames(); }, [loading, loadGames]);

  useEffect(() => {
    window.addEventListener('focus', loadGames);
    return () => window.removeEventListener('focus', loadGames);
  }, [loadGames]);

  // 手動同期: クラウドとローカルをマージ（ローカルのスコアを優先）
  const handleSync = useCallback(async () => {
    if (syncing || !user?.id) return;
    setSyncing(true);
    setSyncMsg(null);
    const cloud = await fetchGamesFromCloud(user.id);
    if (cloud !== null) {
      const local    = getGamesIndex();
      const localMap = new Map(local.map((g) => [g.id, g]));
      // ローカルにあるものはローカルのスコアを優先、ないものはクラウドから補完
      const merged = [
        ...local,
        ...cloud.filter((g) => !localMap.has(g.id)),
      ];
      setGames(merged);
      setSyncMsg(`同期完了（${merged.length}件）`);
    } else {
      setSyncMsg('同期に失敗しました');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 3000);
  }, [syncing, user?.id]);

  function handleSaveLabels(labels: string[]) {
    if (!labelTarget) return;
    setGameLabels(labelTarget.id, labels);
    setGames((prev) => prev.map((g) => g.id === labelTarget.id ? { ...g, labels } : g));
  }

  async function handleDelete(id: string) {
    if (!confirm('この試合を削除しますか？')) return;
    deleteGame(id);
    if (user?.id) await deleteGameFromCloud(id);
    loadGames();
  }

  const activeGames   = games.filter((g) => g.status === 'progress');
  const finishedGames = games.filter((g) => g.status === 'finished');

  // 使用中ラベル一覧（フィルター候補）
  const usedLabels = useMemo(() => {
    const set = new Set<string>();
    finishedGames.forEach((g) => g.labels?.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [finishedGames]);

  // フィルター適用済みの終了試合
  const filteredFinished = useMemo(() =>
    filterLabel ? finishedGames.filter((g) => g.labels?.includes(filterLabel)) : finishedGames,
    [finishedGames, filterLabel],
  );

  // 終了試合を年別にグループ化（フィルター済み・新しい年が先頭）
  const finishedByYear = useMemo(() => {
    const map = new Map<number, GameSummary[]>();
    for (const g of filteredFinished) {
      const year = new Date(g.date).getFullYear();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(g);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [finishedGames]);

  // 現在年以外はデフォルトで折りたたむ
  const currentYear = new Date().getFullYear();
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(
    () => new Set(finishedByYear.filter(([y]) => y !== currentYear).map(([y]) => y))
  );
  const toggleYear = (year: number) =>
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });

  if (loading || !user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-950">
        <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 min-h-dvh">

      {/* ── ヘッダー ── */}
      <div className="flex flex-col items-center pt-safe pt-8 pb-5 px-6">
        <div className="w-28 h-28 rounded-3xl overflow-hidden mb-4 shadow-2xl shadow-blue-900/40">
          <Image src="/icon-512.png" alt="Basketball Score" width={112} height={112} className="w-full h-full object-cover" priority />
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
      <div className="px-4 pb-44">

        {activeGames.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">進行中</p>
            </div>
            <div className="flex flex-col gap-2">
              {activeGames.map((g) => <GameCard key={g.id} game={g} onDelete={handleDelete} onLabel={setLabelTarget} />)}
            </div>
          </section>
        )}

        {finishedByYear.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock size={11} className="text-white/30" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase flex-1">終了した試合</p>

              {/* ラベルフィルター */}
              {usedLabels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen((v) => !v)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
                      filterLabel
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/35 active:bg-white/10',
                    )}
                  >
                    <Tag size={10} />
                    {filterLabel || 'ラベル'}
                    {filterOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-neutral-800 border border-white/10 rounded-xl shadow-xl min-w-[130px] overflow-hidden">
                      <button
                        onClick={() => { setFilterLabel(''); setFilterOpen(false); }}
                        className={cn('w-full text-left px-3 py-2 text-xs font-semibold transition-colors', !filterLabel ? 'text-white bg-white/8' : 'text-white/50 active:bg-white/5')}
                      >
                        すべての試合
                      </button>
                      {usedLabels.map((l) => (
                        <button
                          key={l}
                          onClick={() => { setFilterLabel(l); setFilterOpen(false); }}
                          className={cn('w-full text-left px-3 py-2 text-xs font-semibold transition-colors', filterLabel === l ? 'text-amber-300 bg-amber-500/15' : 'text-white/50 active:bg-white/5')}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {finishedByYear.map(([year, yearGames]) => {
                const collapsed = collapsedYears.has(year);
                return (
                  <div key={year}>
                    {/* 年ヘッダー */}
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center gap-2 px-1 py-1.5 mb-2 active:opacity-70 transition-opacity"
                    >
                      <div className="flex-1 h-px bg-white/8" />
                      <span className="text-white/35 text-xs font-bold tracking-widest shrink-0">{year}年</span>
                      <span className="text-white/20 text-[10px] shrink-0">{yearGames.length}試合</span>
                      <ChevronDown
                        size={12}
                        className={cn('text-white/25 transition-transform shrink-0', collapsed && '-rotate-90')}
                      />
                      <div className="flex-1 h-px bg-white/8" />
                    </button>
                    {/* 試合カード */}
                    {!collapsed && (
                      <div className="flex flex-col gap-2">
                        {yearGames.map((g) => <GameCard key={g.id} game={g} onDelete={handleDelete} onLabel={setLabelTarget} />)}
                      </div>
                    )}
                  </div>
                );
              })}
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
      <div className="fixed bottom-0 inset-x-0 px-4 pt-3 pb-safe bg-neutral-950/90 backdrop-blur-md border-t border-white/5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
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
      {labelTarget && (
        <GameLabelSheet
          gameName={labelTarget.game_name}
          current={labelTarget.labels ?? []}
          onSave={handleSaveLabels}
          onClose={() => setLabelTarget(null)}
        />
      )}
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
