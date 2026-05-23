'use client';

import { TimelineEntry, Player } from '@/types';
import { useDictionary } from '@/i18n/DictionaryProvider';
import type { ActionType } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronRight, Link, X } from 'lucide-react';

interface TimelineProps {
  entries:     TimelineEntry[];
  allPlayers:  Player[];
  onUndo:      (primaryLogId: string) => void;
  totalCount?: number;
  onViewAll?:  () => void;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function TimelineRow({
  entry,
  playerMap,
  actions,
  tl,
  onUndo,
}: {
  entry: TimelineEntry;
  playerMap: Record<string, Player>;
  actions: Record<ActionType, string>;
  tl: ReturnType<typeof useDictionary>['timeline'];
  onUndo: (id: string) => void;
}) {
  const { primary, linked } = entry;
  const player = primary.player_id ? playerMap[primary.player_id] : null;
  const isPoint = primary.points > 0;
  const hasLinkedTov = linked.some((l) => l.action_type === 'TOV');

  return (
    <div className="flex items-center gap-2 bg-white/4 rounded-xl px-3 py-2.5 min-h-[44px]">
      <span className="text-white/25 text-[11px] tabular-nums shrink-0 w-[52px]">
        {fmt(primary.timestamp)}
      </span>
      <span className="text-white/30 text-[11px] tabular-nums shrink-0">
        {primary.period}Q
      </span>
      <span className="text-white/60 text-[11px] font-bold tabular-nums shrink-0">
        {player ? `#${player.back_number}` : tl.team}
      </span>
      <span
        className={cn(
          'text-[11px] font-bold truncate flex-1 min-w-0',
          isPoint ? 'text-emerald-400' : 'text-white/55',
        )}
      >
        {actions[primary.action_type]}
        {isPoint && ` +${primary.points}`}
      </span>
      {hasLinkedTov && (
        <span className="flex items-center gap-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-semibold rounded-md px-1.5 py-0.5 shrink-0 whitespace-nowrap">
          <Link size={8} />
          {tl.oppTov}
        </span>
      )}
      <button
        type="button"
        onPointerDown={() => {
          if (navigator.vibrate) navigator.vibrate([25, 15, 25]);
          onUndo(primary.id);
        }}
        className="shrink-0 -mr-1 p-2.5 rounded-lg text-white/25 active:text-red-400 active:bg-red-950/50 transition-colors"
        aria-label={tl.undo}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function Timeline({ entries, allPlayers, onUndo, totalCount, onViewAll }: TimelineProps) {
  const dict = useDictionary();
  const tl = dict.timeline;
  const actions = dict.actions as Record<ActionType, string>;
  const playerMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));

  const total = totalCount ?? entries.length;
  const hasMore = total > entries.length && onViewAll;

  return (
    <div className="bg-neutral-950 px-2 py-1.5 flex flex-col gap-1.5 shrink-0">
      {hasMore && (
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 active:bg-white/8 text-left"
        >
          <span className="text-white/50 text-[11px]">
            {tl.previewHint.replace('{shown}', String(entries.length)).replace('{total}', String(total))}
          </span>
          <span className="flex items-center gap-0.5 text-sky-400 text-xs font-semibold shrink-0">
            {tl.viewAll}
            <ChevronRight size={14} />
          </span>
        </button>
      )}

      {entries.length === 0 ? (
        <div className="flex items-center justify-center h-10">
          <span className="text-white/15 text-xs">{tl.empty}</span>
        </div>
      ) : (
        entries.map((entry) => (
          <TimelineRow
            key={entry.primary.id}
            entry={entry}
            playerMap={playerMap}
            actions={actions}
            tl={tl}
            onUndo={onUndo}
          />
        ))
      )}
    </div>
  );
}
