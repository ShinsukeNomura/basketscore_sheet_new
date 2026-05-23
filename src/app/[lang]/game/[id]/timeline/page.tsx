'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { Timeline } from '@/components/game/Timeline';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function TimelinePage() {
  const params = useParams();
  const gameId = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? 'demo');
  const lang   = typeof params.lang === 'string' ? params.lang : 'ja';
  const router = useRouter();
  const dict = useDictionary();
  const tl = dict.timeline;
  const c = dict.common;

  const {
    game,
    allPlayers,
    allTimelineEntries,
    undoLog,
    isLoaded,
    saveToCloud,
  } = useGameState(gameId);

  if (!isLoaded) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-950">
        <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  const count = allTimelineEntries.length;

  return (
    <div className="h-dvh flex flex-col bg-neutral-950">
      <header className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-white/8 bg-neutral-950 pt-safe">
        <button
          type="button"
          onClick={() => { void saveToCloud(); router.push(`/${lang}/game/${gameId}`); }}
          className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 -ml-1 min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft size={22} />
          <span className="text-xs font-medium">{c.back}</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-sm font-bold truncate">{tl.pageTitle}</h1>
          <p className="text-white/40 text-[11px] truncate">
            {game.game_name} · {tl.entryCount.replace('{count}', String(count))}
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pb-safe">
        <Timeline
          entries={allTimelineEntries}
          allPlayers={allPlayers}
          onUndo={undoLog}
        />
      </div>
    </div>
  );
}
