import { getGamesIndex, loadPersistedGame, GameSummary } from './storage';
import { StatsLog } from '@/types';

// ============================================================
// 型定義
// ============================================================

export interface PlayerAnalysis {
  backNumber: string;
  games:  number;
  pts:    number;
  fg2m:   number; fg2a: number;
  fg3m:   number; fg3a: number;
  ftm:    number; fta:  number;
  orbd:   number; drbd: number;
  ast:    number; stl:  number;
  blk:    number; foul: number; tov: number;
}

export interface TeamAnalysis {
  teamName:         string;
  games:            number;
  wins:             number;
  totalPts:         number;
  totalPtsAllowed:  number;
  fg2m: number; fg2a: number;
  fg3m: number; fg3a: number;
  ftm:  number; fta:  number;
  orbd: number; drbd: number;
  ast:  number; stl:  number;
  blk:  number; foul: number; tov: number;
  players: PlayerAnalysis[];
}

// ============================================================
// ユーティリティ
// ============================================================

function cnt(logs: StatsLog[], type: string): number {
  return logs.filter((l) => l.action_type === type).length;
}

/** 全試合履歴からユニークなチーム名一覧を取得 */
export function getAllTeamNamesFromHistory(): string[] {
  const gameIndex = getGamesIndex();
  const names = new Set<string>();
  for (const summary of gameIndex) {
    if (summary.ourTeamName)   names.add(summary.ourTeamName);
    if (summary.theirTeamName) names.add(summary.theirTeamName);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function pct(made: number, attempted: number): string {
  if (attempted === 0) return '—';
  return (made / attempted * 100).toFixed(0) + '%';
}

export function avg(total: number, games: number, decimals = 1): string {
  if (games === 0) return '0';
  return (total / games).toFixed(decimals);
}

// ============================================================
// チーム集計
// ============================================================

export function buildTeamAnalysis(teamName: string): TeamAnalysis {
  const result: TeamAnalysis = {
    teamName,
    games: 0, wins: 0, totalPts: 0, totalPtsAllowed: 0,
    fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0,
    ftm: 0, fta: 0, orbd: 0, drbd: 0,
    ast: 0, stl: 0, blk: 0, foul: 0, tov: 0,
    players: [],
  };

  const playerMap = new Map<string, PlayerAnalysis>();
  const norm = teamName.toLowerCase().trim();
  const gameIndex = getGamesIndex();

  for (const summary of gameIndex) {
    const game = loadPersistedGame(summary.id);
    if (!game) continue;

    const matchedTeam = [game.ourTeam, game.theirTeam].find(
      (t) => t.team_name.toLowerCase().trim() === norm,
    );
    if (!matchedTeam) continue;

    const activeLogs     = game.logs.filter((l) => !l.is_deleted);
    const teamLogs       = activeLogs.filter((l) => l.team_id === matchedTeam.id);
    const opponentLogs   = activeLogs.filter((l) => l.team_id !== matchedTeam.id);
    const pts            = teamLogs.reduce((s, l) => s + l.points, 0);
    const ptsAllowed     = opponentLogs.reduce((s, l) => s + l.points, 0);

    result.games++;
    if (pts > ptsAllowed) result.wins++;
    result.totalPts         += pts;
    result.totalPtsAllowed  += ptsAllowed;
    result.fg2m += cnt(teamLogs, '2PT_MADE');
    result.fg2a += cnt(teamLogs, '2PT_MADE') + cnt(teamLogs, '2PT_MISS');
    result.fg3m += cnt(teamLogs, '3PT_MADE');
    result.fg3a += cnt(teamLogs, '3PT_MADE') + cnt(teamLogs, '3PT_MISS');
    result.ftm  += cnt(teamLogs, 'FT_MADE');
    result.fta  += cnt(teamLogs, 'FT_MADE')  + cnt(teamLogs, 'FT_MISS');
    result.orbd += cnt(teamLogs, 'ORBD');
    result.drbd += cnt(teamLogs, 'DRBD');
    result.ast  += cnt(teamLogs, 'AST');
    result.stl  += cnt(teamLogs, 'STL');
    result.blk  += cnt(teamLogs, 'BLK');
    result.foul += cnt(teamLogs, 'FOUL');
    result.tov  += teamLogs.filter((l) => l.action_type === 'TOV').length;

    // 個人集計
    const teamPlayers = game.allPlayers.filter((p) => p.team_id === matchedTeam.id);
    for (const player of teamPlayers) {
      const pLogs = teamLogs.filter((l) => l.player_id === player.id);
      if (pLogs.length === 0) continue;

      const bn = player.back_number;
      if (!playerMap.has(bn)) {
        playerMap.set(bn, {
          backNumber: bn, games: 0, pts: 0,
          fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0,
          ftm: 0, fta: 0, orbd: 0, drbd: 0,
          ast: 0, stl: 0, blk: 0, foul: 0, tov: 0,
        });
      }
      const ps = playerMap.get(bn)!;
      ps.games++;
      ps.pts  += pLogs.reduce((s, l) => s + l.points, 0);
      ps.fg2m += cnt(pLogs, '2PT_MADE');
      ps.fg2a += cnt(pLogs, '2PT_MADE') + cnt(pLogs, '2PT_MISS');
      ps.fg3m += cnt(pLogs, '3PT_MADE');
      ps.fg3a += cnt(pLogs, '3PT_MADE') + cnt(pLogs, '3PT_MISS');
      ps.ftm  += cnt(pLogs, 'FT_MADE');
      ps.fta  += cnt(pLogs, 'FT_MADE')  + cnt(pLogs, 'FT_MISS');
      ps.orbd += cnt(pLogs, 'ORBD');
      ps.drbd += cnt(pLogs, 'DRBD');
      ps.ast  += cnt(pLogs, 'AST');
      ps.stl  += cnt(pLogs, 'STL');
      ps.blk  += cnt(pLogs, 'BLK');
      ps.foul += cnt(pLogs, 'FOUL');
      ps.tov  += pLogs.filter((l) => l.action_type === 'TOV').length;
    }
  }

  result.players = Array.from(playerMap.values())
    .sort((a, b) => b.pts - a.pts || Number(a.backNumber) - Number(b.backNumber));

  return result;
}
