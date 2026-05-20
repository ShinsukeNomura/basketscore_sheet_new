'use client';

import { TimelineEntry, Player } from '@/types';
import { ACTION_LABEL_JA } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { X, Link } from 'lucide-react';

interface TimelineProps {
  entries:    TimelineEntry[];
  allPlayers: Player[];
  onUndo:     (primaryLogId: string) => void;   // link_id ごと一括削除
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

export function Timeline({ entries, allPlayers, onUndo }: TimelineProps) {
  const playerMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));

  return (
    <div className="shrink-0 bg-neutral-950 border-t border-white/5 px-2 py-1 pb-safe flex flex-col gap-1">
      {entries.length === 0 ? (
        <div className="flex items-center justify-center h-10">
          <span className="text-white/15 text-xs">記録がまだありません</span>
        </div>
      ) : (
        entries.map(({ primary, linked }) => {
          const player  = primary.player_id ? playerMap[primary.player_id] : null;
          const isPoint = primary.points > 0;

          // 連動 TOV が存在するか（STL と紐づいた自動 TOV）
          const hasLinkedTov = linked.some((l) => l.action_type === 'TOV');

          return (
            <div
              key={primary.id}
              className="flex items-center gap-2 bg-white/4 rounded-xl px-3 py-2 min-h-[36px]"
            >
              {/* 時刻 */}
              <span className="text-white/25 text-[11px] tabular-nums shrink-0">
                {fmt(primary.timestamp)}
              </span>

              {/* クォーター */}
              <span className="text-white/30 text-[11px] tabular-nums shrink-0">
                {primary.period}Q
              </span>

              {/* 選手番号 or チーム */}
              <span className="text-white/60 text-[11px] font-bold tabular-nums shrink-0">
                {player ? `#${player.back_number}` : 'チーム'}
              </span>

              {/* アクション名 */}
              <span className={cn(
                'text-[11px] font-bold truncate',
                isPoint ? 'text-emerald-400' : 'text-white/55',
              )}>
                {ACTION_LABEL_JA[primary.action_type]}
                {isPoint && ` +${primary.points}`}
              </span>

              {/* 連動バッジ（STL → 相手 TOV 自動追加） */}
              {hasLinkedTov && (
                <span className="flex items-center gap-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-semibold rounded-md px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                  <Link size={8} />
                  相手TOV
                </span>
              )}

              {/* アンドゥボタン（44px相当タップ領域） */}
              <button
                onPointerDown={() => {
                  if (navigator.vibrate) navigator.vibrate([25, 15, 25]);
                  onUndo(primary.id);
                }}
                className="shrink-0 -mr-1 p-2.5 rounded-lg text-white/25 active:text-red-400 active:bg-red-950/50 transition-colors"
                aria-label="取り消し"
              >
                <X size={13} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
