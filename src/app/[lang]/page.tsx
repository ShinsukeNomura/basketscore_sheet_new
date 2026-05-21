'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getGamesIndex, deleteGame, GameSummary, FREE_GAME_LIMIT } from '@/lib/storage';
import { fetchGamesFromCloud, deleteGameFromCloud } from '@/lib/supabaseStorage';
import { CreateGameSheet } from '@/components/CreateGameSheet';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  ChevronRight, ChevronDown, Plus, Trash2, Clock, Crown,
  LogOut, RefreshCw, BookOpen, Users, BarChart2, Tag, ChevronUp, Globe,
} from 'lucide-react';
import { MyTeamsSheet } from '@/components/MyTeamsSheet';
import { GameLabelSheet } from '@/components/GameLabelSheet';
import { setGameLabels } from '@/lib/storage';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { useLocale } from '@/i18n/navigation';

const LOCALES = [
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
] as const;

function formatDate(iso: string, locale: string): string {
  if (locale === 'en') {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  if (locale === 'zh') {
    return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
  }
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function LangSwitcher({ current, basePath }: { current: string; basePath: string }) {
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
              href={`/${l.code}${basePath}`}
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

function GameCard({ game, onDelete, onLabel, locale, dict }: {
  game: GameSummary;
  onDelete: (id: string) => void;
  onLabel: (game: GameSummary) => void;
  locale: string;
  dict: ReturnType<typeof useDictionary>;
}) {
  const isFinished = game.status === 'finished';
  const diff = game.ourScore - game.theirScore;
  const weWon = isFinished && diff > 0;
  const theyWon = isFinished && diff < 0;
  const hasLabels = (game.labels?.length ?? 0) > 0;
  const h = dict.home;

  return (
    <div className="rounded-2xl bg-white/5 transition-colors overflow-hidden">
      <div className="flex items-center gap-2">
        <Link
          href={`/${locale}/game/${game.id}`}
          className="flex items-center gap-4 flex-1 min-w-0 px-4 py-3.5 active:bg-white/5"
        >
          <div className={cn('w-2 h-2 rounded-full shrink-0', isFinished ? 'bg-white/20' : 'bg-emerald-400 animate-pulse')} />
          <div className="flex flex-col flex-1 min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm truncate">{game.game_name}</span>
              {isFinished ? (
                <span className="text-[10px] text-white/30 font-medium shrink-0">{h.statusFinished}</span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-semibold shrink-0">{h.statusInProgress}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn('text-xs truncate max-w-[80px]', weWon ? 'text-blue-300 font-bold' : 'text-white/50')}>{game.ourTeamName}</span>
              <span className="text-white/20 text-xs">{game.ourScore} - {game.theirScore}</span>
              <span className={cn('text-xs truncate max-w-[80px]', theyWon ? 'text-white font-bold' : 'text-white/50')}>{game.theirTeamName}</span>
            </div>
            <span className="text-[11px] text-white/25">{formatDate(game.date, locale)}</span>
          </div>
          <ChevronRight size={16} className="text-white/20 shrink-0" />
        </Link>
        <button
          onClick={() => onLabel(game)}
          className={cn(
            'p-3 rounded-xl transition-colors shrink-0',
            hasLabels ? 'text-amber-400/70 active:text-amber-300' : 'text-white/15 active:text-amber-400 active:bg-amber-950/30',
          )}
          aria-label={h.editLabel}
        >
          <Tag size={14} />
        </button>
        <button
          onClick={() => onDelete(game.id)}
          className="p-3 mr-1 rounded-xl text-white/20 active:text-red-400 active:bg-red-950/40 transition-colors shrink-0"
          aria-label={dict.common.delete}
        >
          <Trash2 size={15} />
        </button>
      </div>
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
  const dict = useDictionary();
  const h = dict.home;
  const locale = useLocale();

  const [games,       setGames]       = useState<GameSummary[]>([]);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [syncMsg,     setSyncMsg]     = useState<string | null>(null);
  const [myTeamsOpen, setMyTeamsOpen] = useState(false);
  const [labelTarget, setLabelTarget] = useState<GameSummary | null>(null);
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [filterOpen,  setFilterOpen]  = useState(false);

  useEffect(() => {
    if (!loading && user && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === 'true') {
        setCreateOpen(true);
        window.history.replaceState({}, '', `/${locale}`);
      }
    }
  }, [loading, user, locale]);

  useEffect(() => {
    if (!loading && !user) window.location.href = `/${locale}/login`;
  }, [user, loading, locale]);

  const loadGames = useCallback(async () => {
    if (!user?.id) {
      setGames(getGamesIndex());
      return;
    }
    const local = getGamesIndex().filter((g) => g.user_id === user.id);
    setGames(local);
    const cloud = await fetchGamesFromCloud(user.id);
    if (cloud !== null) {
      const localIds = new Set(local.map((g) => g.id));
      const cloudOnlyGames = cloud.filter((g) => !localIds.has(g.id));
      if (cloudOnlyGames.length > 0) setGames((prev) => [...prev, ...cloudOnlyGames]);
    }
  }, [user?.id]);

  useEffect(() => { if (!loading) loadGames(); }, [loading, loadGames]);

  useEffect(() => {
    window.addEventListener('focus', loadGames);
    return () => window.removeEventListener('focus', loadGames);
  }, [loadGames]);

  const handleSync = useCallback(async () => {
    if (syncing || !user?.id) return;
    setSyncing(true);
    setSyncMsg(null);
    const local = getGamesIndex().filter((g) => g.user_id === user.id);
    const cloud = await fetchGamesFromCloud(user.id);
    if (cloud !== null) {
      const localIds = new Set(local.map((g) => g.id));
      const cloudOnlyGames = cloud.filter((g) => !localIds.has(g.id));
      const merged = [...local, ...cloudOnlyGames];
      setGames(merged);
      setSyncMsg(h.syncDone.replace('{count}', String(merged.length)));
    } else {
      setGames(local);
      setSyncMsg(h.syncCloudFail);
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 3000);
  }, [syncing, user?.id, h]);

  function handleSaveLabels(labels: string[]) {
    if (!labelTarget) return;
    setGameLabels(labelTarget.id, labels);
    setGames((prev) => prev.map((g) => g.id === labelTarget.id ? { ...g, labels } : g));
  }

  async function handleDelete(id: string) {
    if (!confirm(h.deleteConfirm)) return;
    deleteGame(id);
    if (user?.id) await deleteGameFromCloud(id);
    loadGames();
  }

  const activeGames = games.filter((g) => g.status === 'progress');
  const finishedGames = games.filter((g) => g.status === 'finished');

  const usedLabels = useMemo(() => {
    const set = new Set<string>();
    finishedGames.forEach((g) => g.labels?.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [finishedGames]);

  const filteredFinished = useMemo(() =>
    filterLabel ? finishedGames.filter((g) => g.labels?.includes(filterLabel)) : finishedGames,
    [finishedGames, filterLabel],
  );

  const finishedGrouped = useMemo(() => {
    const yearMap = new Map<number, Map<number, GameSummary[]>>();
    for (const g of filteredFinished) {
      const d = new Date(g.date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      if (!yearMap.has(year)) yearMap.set(year, new Map());
      const mMap = yearMap.get(year)!;
      if (!mMap.has(month)) mMap.set(month, []);
      mMap.get(month)!.push(g);
    }
    return Array.from(yearMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, mMap]) => ({
        year,
        months: Array.from(mMap.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([month, games]) => ({ month, games })),
      }));
  }, [filteredFinished]);

  const currentYear = new Date().getFullYear();
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(
    () => new Set(finishedGrouped.filter((g) => g.year !== currentYear).map((g) => g.year))
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
        <p className="text-white/30 text-sm mt-1">{h.subtitle}</p>

        {/* ユーザー情報 */}
        <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
          {isPremium ? <Crown size={12} className="text-amber-400" /> : <span className="w-2 h-2 rounded-full bg-white/30" />}
          <span className="text-white/40 text-xs truncate max-w-[160px]">{user?.email}</span>
          {isPremium && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">PRO</span>
          )}
          <button onClick={signOut} className="text-white/25 hover:text-white/60 transition-colors ml-1" aria-label="logout">
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
            {syncing ? h.syncing : syncMsg ?? h.cloudSync}
          </button>
          <button
            onClick={() => setMyTeamsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/50 text-xs font-semibold active:bg-white/10 transition-colors"
          >
            <Users size={12} />{h.myTeams}
          </button>
          <Link
            href={`/${locale}/guide`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/50 text-xs font-semibold active:bg-white/10 transition-colors"
          >
            <BookOpen size={12} />{h.guide}
          </Link>
          <Link
            href={`/${locale}/analysis`}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              isPremium
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 active:bg-amber-500/25'
                : 'bg-white/6 border border-white/10 text-white/50 active:bg-white/10',
            )}
          >
            <BarChart2 size={12} />{h.analysis}
            {isPremium && <Crown size={9} className="text-amber-400" />}
          </Link>
          {/* 言語切替 */}
          <LangSwitcher current={locale} basePath="" />
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="px-4 pb-44">

        {activeGames.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">{h.inProgress}</p>
            </div>
            <div className="flex flex-col gap-2">
              {activeGames.map((g) => (
                <GameCard key={g.id} game={g} onDelete={handleDelete} onLabel={setLabelTarget} locale={locale} dict={dict} />
              ))}
            </div>
          </section>
        )}

        {finishedGrouped.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock size={11} className="text-white/30" />
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase flex-1">{h.finished}</p>

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
                    {filterLabel || h.labelFilter}
                    {filterOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-neutral-800 border border-white/10 rounded-xl shadow-xl min-w-[130px] overflow-hidden">
                      <button
                        onClick={() => { setFilterLabel(''); setFilterOpen(false); }}
                        className={cn('w-full text-left px-3 py-2 text-xs font-semibold transition-colors', !filterLabel ? 'text-white bg-white/8' : 'text-white/50 active:bg-white/5')}
                      >
                        {h.allGames}
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
              {finishedGrouped.map(({ year, months }) => {
                const collapsed = collapsedYears.has(year);
                const totalGames = months.reduce((s, m) => s + m.games.length, 0);
                return (
                  <div key={year}>
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center gap-2 px-1 py-1.5 mb-2 active:opacity-70 transition-opacity"
                    >
                      <div className="flex-1 h-px bg-white/8" />
                      <span className="text-white/35 text-xs font-bold tracking-widest shrink-0">
                        {h.yearGroup.replace('{year}', String(year))}
                      </span>
                      <span className="text-white/20 text-[10px] shrink-0">
                        {h.gameCount.replace('{count}', String(totalGames))}
                      </span>
                      <ChevronDown size={12} className={cn('text-white/25 transition-transform shrink-0', collapsed && '-rotate-90')} />
                      <div className="flex-1 h-px bg-white/8" />
                    </button>

                    {!collapsed && (
                      <div className="flex flex-col gap-3">
                        {months.map(({ month, games: mGames }) => (
                          <div key={month}>
                            <div className="flex items-center gap-2 px-1 mb-1.5">
                              <span className="text-white/20 text-[10px] font-bold tracking-wide shrink-0">
                                {h.monthGroup.replace('{month}', String(month))}
                              </span>
                              <div className="flex-1 h-px bg-white/5" />
                              <span className="text-white/15 text-[10px] shrink-0">
                                {h.gameCount.replace('{count}', String(mGames.length))}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {mGames.map((g) => (
                                <GameCard key={g.id} game={g} onDelete={handleDelete} onLabel={setLabelTarget} locale={locale} dict={dict} />
                              ))}
                            </div>
                          </div>
                        ))}
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
            <span className="text-white/30 text-sm">{h.noGames}</span>
            <span className="text-white/15 text-xs">{h.noGamesHint}</span>
          </div>
        )}
      </div>

      {/* ── 新規試合ボタン ── */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-3 pb-safe bg-neutral-950/90 backdrop-blur-md border-t border-white/5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {!isPremium && games.length >= FREE_GAME_LIMIT ? (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center gap-2 w-full bg-amber-500 active:bg-amber-600 text-neutral-900 font-black rounded-2xl py-4 text-base transition-colors"
          >
            <Crown size={18} />{h.upgradeToPremium}
          </button>
        ) : (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl py-4 text-base transition-colors"
          >
            <Plus size={18} />
            {h.createGame}
            {!isPremium && (
              <span className="ml-auto text-[11px] text-blue-300/70 font-semibold">
                {h.remainingFree.replace('{count}', String(Math.max(0, FREE_GAME_LIMIT - games.length)))}
              </span>
            )}
          </button>
        )}
      </div>

      {/* フッター */}
      <div className="fixed bottom-[80px] inset-x-0 flex justify-center gap-4 pb-1 pointer-events-none">
        <Link href={`/${locale}/privacy`} className="text-white/15 text-[10px] pointer-events-auto active:text-white/40">{dict.nav.privacy}</Link>
        <Link href={`/${locale}/terms`}   className="text-white/15 text-[10px] pointer-events-auto active:text-white/40">{dict.nav.terms}</Link>
        <Link href={`/${locale}/legal`}   className="text-white/15 text-[10px] pointer-events-auto active:text-white/40">{dict.nav.legal}</Link>
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
