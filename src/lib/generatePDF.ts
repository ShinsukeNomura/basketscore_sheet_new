import { Game, Team, Player, StatsLog } from '@/types';
import { periodLabel } from '@/lib/period';

const BASE_STYLE = `
  body { font-family: 'Hiragino Sans', 'Meiryo', 'Yu Gothic', sans-serif; color: #1a1a1a; padding: 12mm 15mm; font-size: 10pt; line-height: 1.5; }
  h1 { font-size: 14pt; text-align: center; margin: 0 0 4px; letter-spacing: 0.05em; }
  .meta { text-align: center; color: #4b5563; font-size: 9.5pt; margin-bottom: 14px; }
  .score-box { display: flex; align-items: center; justify-content: center; gap: 16px; border-top: 2px solid #1e40af; border-bottom: 2px solid #1e40af; padding: 10px 0; margin: 12px 0; }
  .team-name { font-size: 13pt; font-weight: 900; min-width: 80px; text-align: center; }
  .score-num { font-size: 22pt; font-weight: 900; color: #1e40af; min-width: 36px; text-align: center; }
  .score-sep { font-size: 16pt; font-weight: 700; color: #6b7280; }
  h2 { font-size: 11pt; color: #1e40af; border-left: 4px solid #1e40af; padding-left: 8px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 6px 0 12px; }
  th { background: #1e40af; color: white; padding: 4px 6px; text-align: center; font-weight: bold; }
  th.left, td.left { text-align: left; }
  td { padding: 3px 6px; border-bottom: 1px solid #e5e7eb; text-align: center; }
  tr:nth-child(even) { background: #f9fafb; }
  .abbr { font-size: 7.5pt; color: #6b7280; margin-top: 12px; line-height: 1.6; }
  .footer { font-size: 7.5pt; color: #9ca3af; text-align: center; margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  @media print { body { padding: 8mm 12mm; } }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isoNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface PlayerRow {
  num:   string;
  pts:   number;
  fg2:   number; fg2a: number;
  fg3:   number; fg3a: number;
  ft:    number; fta:  number;
  orbd:  number; drbd: number;
  ast:   number; stl:  number;
  blk:   number; tov:  number;
  foul:  number;
}

function buildPlayerRows(
  players: Player[],
  logs: StatsLog[],
  teamId: string,
): PlayerRow[] {
  return players
    .filter((p) => p.team_id === teamId)
    .map((p) => {
      const pl = logs.filter((l) => l.player_id === p.id && !l.is_deleted);
      const count = (t: string) => pl.filter((l) => l.action_type === t).length;
      return {
        num:  p.back_number,
        pts:  count('2PT_MADE') * 2 + count('3PT_MADE') * 3 + count('FT_MADE'),
        fg2:  count('2PT_MADE'), fg2a: count('2PT_MADE') + count('2PT_MISS'),
        fg3:  count('3PT_MADE'), fg3a: count('3PT_MADE') + count('3PT_MISS'),
        ft:   count('FT_MADE'),  fta:  count('FT_MADE')  + count('FT_MISS'),
        orbd: count('ORBD'),     drbd: count('DRBD'),
        ast:  count('AST'),      stl:  count('STL'),
        blk:  count('BLK'),      tov:  count('TOV'),
        foul: count('FOUL'),
      };
    })
    .filter((r) => r.pts + r.fg2a + r.fg3a + r.fta + r.orbd + r.drbd + r.ast + r.stl + r.blk + r.tov + r.foul > 0)
    .sort((a, b) => Number(a.num) - Number(b.num));
}

function periodScore(logs: StatsLog[], teamId: string, period: number): number {
  return logs
    .filter((l) => l.team_id === teamId && l.period === period && !l.is_deleted)
    .reduce((s, l) => s + l.points, 0);
}

function playerStatsTable(team: Team, allPlayers: Player[], logs: StatsLog[]): string {
  const rows = buildPlayerRows(allPlayers, logs, team.id);
  if (rows.length === 0) return '';

  const header = `
    <tr>
      <th class="left">#</th><th>PTS</th><th>2PM</th><th>2PA</th><th>3PM</th><th>3PA</th>
      <th>FTM</th><th>FTA</th><th>OR</th><th>DR</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>FOUL</th>
    </tr>`;

  const body = rows.map((r) => `
    <tr>
      <td class="left">${escapeHtml(r.num)}</td>
      <td>${r.pts}</td><td>${r.fg2}</td><td>${r.fg2a}</td><td>${r.fg3}</td><td>${r.fg3a}</td>
      <td>${r.ft}</td><td>${r.fta}</td><td>${r.orbd}</td><td>${r.drbd}</td>
      <td>${r.ast}</td><td>${r.stl}</td><td>${r.blk}</td><td>${r.tov}</td><td>${r.foul}</td>
    </tr>`).join('');

  return `
    <h2>${escapeHtml(team.team_name || 'Team')} — 選手スタッツ</h2>
    <table>${header}${body}</table>`;
}

export function generateGamePDF(
  game: Game,
  ourTeam: Team,
  theirTeam: Team,
  allPlayers: Player[],
  logs: StatsLog[],
  ourScore: number,
  theirScore: number,
): void {
  const otWithScore = new Set(
    logs.filter((l) => !l.is_deleted && l.points > 0 && l.period >= 5).map((l) => l.period as number),
  );
  const periods = ([1, 2, 3, 4, 5, 6] as const).filter((p) => p <= 4 || otWithScore.has(p));

  const periodHeaders = periods.map((p) => `<th>${periodLabel(p)}</th>`).join('');
  const quarterRows = [ourTeam, theirTeam].map((team, ti) => {
    const scores = periods.map((p) => periodScore(logs, team.id, p));
    const total  = ti === 0 ? ourScore : theirScore;
    return `
    <tr>
      <td class="left">${escapeHtml(team.team_name || (ti === 0 ? 'A' : 'B'))}</td>
      ${scores.map((s) => `<td>${s}</td>`).join('')}
      <td><strong>${total}</strong></td>
    </tr>`;
  }).join('');

  const html = `
    <h1>バスケットボール スコアシート</h1>
    <div class="meta">
      <div>${escapeHtml(game.game_name)}</div>
      <div>${escapeHtml(game.date)}</div>
      ${game.scorekeeper ? `<div>記録者: ${escapeHtml(game.scorekeeper)}</div>` : ''}
    </div>

    <div class="score-box">
      <span class="team-name">${escapeHtml(ourTeam.team_name || 'A')}</span>
      <span class="score-num">${ourScore}</span>
      <span class="score-sep">-</span>
      <span class="score-num">${theirScore}</span>
      <span class="team-name">${escapeHtml(theirTeam.team_name || 'B')}</span>
    </div>

    <h2>クォーター別スコア</h2>
    <table>
      <tr><th class="left">チーム</th>${periodHeaders}<th>合計</th></tr>
      ${quarterRows}
    </table>

    ${playerStatsTable(ourTeam, allPlayers, logs)}
    ${playerStatsTable(theirTeam, allPlayers, logs)}

    <div class="abbr">
      <strong>略語:</strong>
      PTS=得点 / 2PM・2PA=2P成功・試投 / 3PM・3PA=3P成功・試投 / FTM・FTA=FT成功・試投 /
      OR=オフェンスリバウンド / DR=ディフェンスリバウンド / AST=アシスト / STL=スティール /
      BLK=ブロック / TOV=ターンオーバー / FOUL=ファウル
    </div>
    <div class="footer">Basketball Score App — ${isoNow()}</div>
  `;

  const title = `${game.game_name}_${game.date}`;
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('ポップアップがブロックされました。許可してから再試行してください。');
    return;
  }
  win.document.write(
    `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${BASE_STYLE}</style></head><body>${html}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
}
