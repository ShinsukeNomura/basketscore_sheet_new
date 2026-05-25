import type { PersistedGameState, Player } from '@/types';
import { normalizeBackNumber } from '@/lib/backNumber';

/** 同一チーム内で正規化背番号が重複する選手を1人に統合し、ログを付け替える */
export function mergeDuplicateBackNumbersInState(state: PersistedGameState): PersistedGameState {
  const teamIds = [...new Set(state.allPlayers.map((p) => p.team_id))];
  const remap = new Map<string, string>();
  let allPlayers = [...state.allPlayers];

  for (const teamId of teamIds) {
    const onTeam = allPlayers.filter((p) => p.team_id === teamId);
    const byNorm = new Map<string, Player[]>();

    for (const p of onTeam) {
      const norm = normalizeBackNumber(p.back_number);
      const list = byNorm.get(norm) ?? [];
      list.push(p);
      byNorm.set(norm, list);
    }

    for (const [norm, group] of byNorm) {
      if (group.length < 2) {
        const only = group[0];
        if (only && only.back_number !== norm) {
          allPlayers = allPlayers.map((p) =>
            p.id === only.id ? { ...p, back_number: norm } : p,
          );
        }
        continue;
      }

      const logCount = (id: string) =>
        state.logs.filter((l) => !l.is_deleted && l.player_id === id).length;

      const sorted = [...group].sort((a, b) => {
        const ca = logCount(a.id);
        const cb = logCount(b.id);
        if (cb !== ca) return cb - ca;
        if (a.back_number === norm) return -1;
        if (b.back_number === norm) return 1;
        return a.id.localeCompare(b.id);
      });

      const keeper = sorted[0]!;
      for (const dup of sorted.slice(1)) {
        remap.set(dup.id, keeper.id);
        allPlayers = allPlayers.filter((p) => p.id !== dup.id);
      }
      allPlayers = allPlayers.map((p) =>
        p.id === keeper.id ? { ...p, back_number: norm } : p,
      );
    }
  }

  if (remap.size === 0) {
    const needsNorm = allPlayers.some(
      (p) => p.back_number !== normalizeBackNumber(p.back_number),
    );
    if (!needsNorm) return state;
    return { ...state, allPlayers };
  }

  const logs = state.logs.map((l) => {
    if (!l.player_id) return l;
    const next = remap.get(l.player_id);
    return next ? { ...l, player_id: next } : l;
  });

  return { ...state, allPlayers, logs };
}
