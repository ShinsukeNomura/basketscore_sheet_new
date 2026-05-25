'use client';

import { TimelineEntry, Player, Team, StatsLog } from '@/types';
import { useDictionary } from '@/i18n/DictionaryProvider';
import type { ActionType } from '@/types';
import { getColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { ChevronRight, X } from 'lucide-react';

interface TimelineProps {
  entries:     TimelineEntry[];
  allPlayers:  Player[];
  ourTeam:     Team;
  theirTeam:   Team;
  onUndo:      (primaryLogId: string) => void;
  totalCount?: number;
  onViewAll?:  () => void;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function teamShortLabel(
  teamId: string,
  ourTeam: Team,
  theirTeam: Team,
  ourFallback: string,
  theirFallback: string,
): string {
  const team = teamId === ourTeam.id ? ourTeam : theirTeam;
  const name = team.team_name?.trim();
  if (name) return name.length > 8 ? `${name.slice(0, 8)}…` : name;
  return teamId === ourTeam.id ? ourFallback : theirFallback;
}

function LogLine({
  log,
  playerMap,
  actions,
  ourTeam,
  theirTeam,
  ourFallback,
  theirFallback,
  isLinked,
}: {
  log: StatsLog;
  playerMap: Record<string, Player>;
  actions: Record<ActionType, string>;
  ourTeam: Team;
  theirTeam: Team;
  ourFallback: string;
  theirFallback: string;
  isLinked?: boolean;
}) {
  const isOurs = log.team_id === ourTeam.id;
  const team = isOurs ? ourTeam : theirTeam;
  const cfg = getColorConfig(team.color);
  const player = log.player_id ? playerMap[log.player_id] : null;
  const isPoint = log.points > 0;
  const teamLabel = teamShortLabel(log.team_id, ourTeam, theirTeam, ourFallback, theirFallback);

  return (
    <div
      className={cn(
        'flex items-center gap-2 min-h-[36px]',
        isLinked ? 'pl-3 opacity-90' : '',
      )}
    >
      {!isLinked && (
        <>
          <span className="text-white/25 text-[11px] tabular-nums shrink-0 w-[52px]">
            {fmt(log.timestamp)}
          </span>
          <span className="text-white/30 text-[11px] tabular-nums shrink-0">
            {log.period}Q
          </span>
        </>
      )}
      {isLinked && <span className="text-white/20 text-[11px] shrink-0 w-[52px]">↳</span>}
      <span
        className={cn(
          'text-[10px] font-bold rounded-md px-1.5 py-0.5 shrink-0 max-w-[72px] truncate',
          cfg.cardBg,
          isOurs ? 'text-white' : 'text-white/80',
        )}
        title={team.team_name}
      >
        {teamLabel}
      </span>
      <span className="text-white/60 text-[11px] font-bold tabular-nums shrink-0">
        {player ? `#${player.back_number}` : '—'}
      </span>
      <span
        className={cn(
          'text-[11px] font-bold truncate flex-1 min-w-0',
          isPoint ? 'text-emerald-400' : 'text-white/55',
        )}
      >
        {actions[log.action_type]}
        {isPoint && ` +${log.points}`}
      </span>
    </div>
  );
}

function TimelineRow({
  entry,
  playerMap,
  actions,
  tl,
  ourTeam,
  theirTeam,
  onUndo,
}: {
  entry: TimelineEntry;
  playerMap: Record<string, Player>;
  actions: Record<ActionType, string>;
  tl: ReturnType<typeof useDictionary>['timeline'];
  ourTeam: Team;
  theirTeam: Team;
  onUndo: (id: string) => void;
}) {
  const { primary, linked } = entry;

  return (
    <div className="bg-white/4 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <LogLine
            log={primary}
            playerMap={playerMap}
            actions={actions}
            ourTeam={ourTeam}
            theirTeam={theirTeam}
            ourFallback={tl.ourShort}
            theirFallback={tl.theirShort}
          />
          {linked.map((l) => (
            <LogLine
              key={l.id}
              log={l}
              playerMap={playerMap}
              actions={actions}
              ourTeam={ourTeam}
              theirTeam={theirTeam}
              ourFallback={tl.ourShort}
              theirFallback={tl.theirShort}
              isLinked
            />
          ))}
        </div>
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
    </div>
  );
}

export function Timeline({
  entries,
  allPlayers,
  ourTeam,
  theirTeam,
  onUndo,
  totalCount,
  onViewAll,
}: TimelineProps) {
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
            ourTeam={ourTeam}
            theirTeam={theirTeam}
            onUndo={onUndo}
          />
        ))
      )}
    </div>
  );
}
