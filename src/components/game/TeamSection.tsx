'use client';

import { useState, useRef, useCallback } from 'react';
import { Player, Team } from '@/types';
import { getColorConfig } from '@/lib/colors';
import { PlayerCard } from './PlayerCard';
import type { PlayerGesture } from '@/lib/playerGesture';
import { cn } from '@/lib/utils';
import { Pencil, Check } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface TeamSectionProps {
  team:             Team;
  courtPlayers:     Player[];
  totalPlayerCount: number;
  playerFouls:      Record<string, number>;
  teamFoulCount:    number;
  pendingPlayerId:     string | null;
  shotPhase:           'type' | 'result' | null;
  flashPlayerId:       string | null;
  /** チーム守備で背番号選択中 */
  teamDefPickActive?: boolean;
  /** マイチーム（自チーム） */
  isMyTeam?:           boolean;
  onPlayerTap:      (player: Player) => void;
  onPlayerGesture:  (player: Player, gesture: PlayerGesture) => void;
  onSubstitute:     (team: Team) => void;
  onRenameTeam:     (teamId: string, name: string) => void;
}

export function TeamSection({
  team, courtPlayers, totalPlayerCount, playerFouls, teamFoulCount,
  pendingPlayerId, shotPhase, flashPlayerId, teamDefPickActive = false, isMyTeam = false,
  onPlayerTap, onPlayerGesture, onSubstitute, onRenameTeam,
}: TeamSectionProps) {
  const teamDefPick = teamDefPickActive;
  const ts = useDictionary().teamSection;
  const g = useDictionary().game;
  const cfg = getColorConfig(team.color);

  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(team.team_name);
  const inputRef              = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setEditVal(team.team_name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [team.team_name]);

  const commitEdit = useCallback(() => {
    const v = editVal.trim();
    if (v) onRenameTeam(team.id, v);
    setEditing(false);
  }, [editVal, onRenameTeam, team.id]);

  return (
    <div className={cn(
      'flex flex-col shrink-0 px-2 pt-1 pb-1.5 rounded-xl mx-1 border-2 transition-colors',
      isMyTeam
        ? 'border-sky-500/60 bg-sky-950/35 shadow-[0_0_12px_rgba(14,165,233,0.15)]'
        : 'border-transparent bg-black/20',
      cfg.sectionBg,
      teamDefPick && 'ring-2 ring-white/35',
    )}>

      <div className="flex items-center justify-between mb-0.5 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
          <div className={cn(
            'w-1 h-3.5 rounded-full shrink-0',
            isMyTeam ? 'bg-sky-400' : cfg.accentDot,
          )} />
          <span className={cn(
            'shrink-0 text-[8px] font-black px-1 py-0.5 rounded leading-none',
            isMyTeam
              ? 'bg-sky-500 text-white'
              : 'bg-neutral-700/80 text-neutral-400 border border-neutral-600/50',
          )}>
            {isMyTeam ? g.myTeamBadge : g.opponentBadge}
          </span>

          {editing ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                ref={inputRef}
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                maxLength={20}
                className="flex-1 min-w-0 bg-white/10 text-white text-xs font-bold rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-white/30"
              />
              <button type="button" onPointerDown={(e) => { e.preventDefault(); commitEdit(); }} className="text-white/50 p-1">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <button type="button" onPointerDown={startEdit} className="flex items-center gap-1 min-w-0 group py-0.5">
              <span className={cn('text-xs font-bold truncate', cfg.nameText)}>{team.team_name}</span>
              <Pencil size={9} className="shrink-0 opacity-0 group-active:opacity-60 transition-opacity text-white/40" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSubstitute(team)}
          className={cn(
            'shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-lg transition-colors min-h-[22px]',
            cfg.btnText, cfg.btnBg,
          )}
        >
          {ts.substitute}
        </button>
      </div>

      {(() => {
        const isRedZone = teamFoulCount >= 4;
        return (
          <div className="flex items-center justify-between shrink-0 px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-white/25 text-[10px] font-semibold tracking-wide">{ts.teamFouls}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(teamFoulCount, 7) }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-2.5 rounded-sm',
                      isRedZone ? 'bg-red-500' : 'bg-white/25',
                    )}
                  />
                ))}
                {teamFoulCount > 7 && (
                  <span className="text-red-400 text-[10px] font-black">+{teamFoulCount - 7}</span>
                )}
              </div>
            </div>
            <span className={cn(
              'text-sm font-black tabular-nums',
              isRedZone ? 'text-red-400' : 'text-white/30',
            )}>
              {teamFoulCount}
            </span>
          </div>
        );
      })()}

      {totalPlayerCount === 0 ? (
        <button
          type="button"
          onClick={() => onSubstitute(team)}
          className={cn(
            'flex-1 min-h-0 flex flex-col items-center justify-center gap-1.5 rounded-xl',
            'border-2 border-dashed active:opacity-70 transition-opacity',
            cfg.emptyBorder,
          )}
        >
          <span className="text-white/55 text-xs font-bold">{ts.noMembers}</span>
          <span className={cn('text-[11px] font-semibold underline underline-offset-2', cfg.nameText)}>
            {ts.noMembersHint}
          </span>
        </button>
      ) : (
        <div className="flex gap-1.5 min-h-[62px] shrink-0 mt-1 pb-0.5">
          {courtPlayers.slice(0, 5).map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              fouls={playerFouls[player.id] ?? 0}
              colorConfig={cfg}
              isSelected={flashPlayerId === player.id}
              isPending={pendingPlayerId === player.id}
              shotPhase={pendingPlayerId === player.id ? shotPhase : null}
              onTap={onPlayerTap}
              onGesture={onPlayerGesture}
            />
          ))}
          {Array.from({ length: Math.max(0, 5 - courtPlayers.length) }).map((_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => onSubstitute(team)}
              className={cn(
                'flex-1 rounded-xl border border-dashed flex items-center justify-center min-h-[62px]',
                'active:opacity-60 transition-opacity',
                cfg.emptyBorder,
              )}
            >
              <span className="text-white/20 text-lg">+</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
