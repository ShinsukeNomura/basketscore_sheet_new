'use client';

import { useState, useRef, useCallback } from 'react';
import { Player, Team, ActionType } from '@/types';
import { getColorConfig } from '@/lib/colors';
import { PlayerCard } from './PlayerCard';
import { cn } from '@/lib/utils';
import { Pencil, Check } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface TeamSectionProps {
  team:             Team;
  courtPlayers:     Player[];
  totalPlayerCount: number;        // コート + ベンチ合計（未登録アラート用）
  playerFouls:      Record<string, number>;
  teamTovCount:     number;
  teamFoulCount:    number;
  selectedStat:     ActionType | null;
  flashPlayerId:    string | null;
  onPlayerClick:    (player: Player) => void;
  onSubstitute:     (team: Team) => void;
  onRenameTeam:     (teamId: string, name: string) => void;
}

export function TeamSection({
  team, courtPlayers, totalPlayerCount, playerFouls, teamFoulCount,
  selectedStat, flashPlayerId,
  onPlayerClick, onSubstitute, onRenameTeam,
}: TeamSectionProps) {
  const ts = useDictionary().teamSection;
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
    <div className={cn('flex flex-col h-full px-2 py-0.5', cfg.sectionBg)}>

      {/* チーム名行 */}
      <div className="flex items-center justify-between mb-0.5 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
          <div className={cn('w-1 h-3.5 rounded-full shrink-0', cfg.accentDot)} />

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
              <button onPointerDown={(e) => { e.preventDefault(); commitEdit(); }} className="text-white/50 p-1">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <button onPointerDown={startEdit} className="flex items-center gap-1 min-w-0 group py-0.5">
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

      {/* チームファウル帯 */}
      {(() => {
        const isBonus = teamFoulCount >= 5;
        return (
          <div className="flex items-center justify-between shrink-0 px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-white/25 text-[10px] font-semibold tracking-wide">{ts.teamFouls}</span>
              <div className="flex gap-0.5 items-center">
                {Array.from({ length: Math.min(teamFoulCount, 7) }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-1 h-1 rounded-full',
                      i < 4
                        ? 'bg-white/30'          // 1〜4: 通常
                        : i < 6
                        ? 'bg-orange-400'         // 5〜6: ペナルティ
                        : 'bg-red-500',           // 7+:   ダブルボーナス
                    )}
                  />
                ))}
                {teamFoulCount > 7 && (
                  <span className="text-red-400 text-[10px] font-black">+{teamFoulCount - 7}</span>
                )}
              </div>
            </div>
            <span
              className={cn(
                'text-[10px] font-black tabular-nums',
                isBonus ? 'text-orange-400' : 'text-white/25',
              )}
            >
              {teamFoulCount}
              {isBonus && <span className="text-[8px] font-semibold ml-0.5">{ts.penalty}</span>}
            </span>
          </div>
        );
      })()}

      {/* メンバー未登録アラート */}
      {totalPlayerCount === 0 ? (
        <button
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
        /* プレイヤーカード行 — 固定高さで間延びを防止 */
        <div className="flex gap-1.5 h-[52px] shrink-0 overflow-hidden mt-0.5">
          {courtPlayers.slice(0, 5).map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              fouls={playerFouls[player.id] ?? 0}
              colorConfig={cfg}
              isSelected={flashPlayerId === player.id}
              hasStatSelected={selectedStat !== null}
              onClick={onPlayerClick}
            />
          ))}
          {Array.from({ length: Math.max(0, 5 - courtPlayers.length) }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => onSubstitute(team)}
              className={cn(
                'flex-1 rounded-xl border border-dashed flex items-center justify-center min-h-[52px]',
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
