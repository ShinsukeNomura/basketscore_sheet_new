import { Game, Team, Player, StatsLog } from '@/types';
import { periodLabel } from '@/lib/period';
import type { Dictionary } from '@/i18n/DictionaryProvider';
import { fillTemplate, formatLocaleDateTime } from '@/lib/localeFormat';
import { filterActivePeriods, getEffectiveRegularQuarters, isPracticeGame } from '@/lib/gameFormat';
import { buildRunningScorePdfHtml, RUNNING_SCORE_PDF_STYLE, type RunningScorePdfAi } from '@/lib/runningScorePdf';

export type ScoreSheetLabels = Dictionary['pdf']['scoreSheet'];

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
  .format-note { font-size: 8pt; color: #6b7280; margin: 4px 0 8px; }
  body.sheet-body { display: flex; flex-direction: column; min-height: 100vh; }
  body.sheet-body .sheet-main { flex: 1 0 auto; }
  ${RUNNING_SCORE_PDF_STYLE}
  @media print { body { padding: 8mm 12mm; } }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function playerStatsTable(
  team: Team,
  allPlayers: Player[],
  logs: StatsLog[],
  labels: ScoreSheetLabels,
): string {
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

  const teamName = escapeHtml(team.team_name || labels.teamFallback);
  return `
    <h2>${teamName} — ${escapeHtml(labels.playerStats)}</h2>
    <table>${header}${body}</table>`;
}

export interface GameScoreSheetDocument {
  title:    string;
  htmlLang: string;
  fullHtml: string;
}

export function buildGameScoreSheetDocument(
  game: Game,
  ourTeam: Team,
  theirTeam: Team,
  allPlayers: Player[],
  logs: StatsLog[],
  ourScore: number,
  theirScore: number,
  labels: ScoreSheetLabels,
  htmlLang: string,
  aiReport?: RunningScorePdfAi | null,
): GameScoreSheetDocument {
  const periods = filterActivePeriods([1, 2, 3, 4, 5, 6], logs, game.game_name);
  const effectiveQ = getEffectiveRegularQuarters(logs, game.game_name);
  const formatNote =
    isPracticeGame(game.game_name) && effectiveQ < 4
      ? fillTemplate(labels.gameFormatNote, { count: String(effectiveQ) })
      : '';

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

  const runningHtml = buildRunningScorePdfHtml(
    logs, allPlayers, ourTeam, theirTeam,
    labels.runningScore,
    labels.runningRange,
    aiReport,
  );

  const bodyHtml = `
    <div class="sheet-main">
    <h1>${escapeHtml(labels.title)}</h1>
    <div class="meta">
      <div>${escapeHtml(game.game_name)}</div>
      <div>${escapeHtml(game.date)}</div>
      ${game.scorekeeper ? `<div>${escapeHtml(labels.recorder)}: ${escapeHtml(game.scorekeeper)}</div>` : ''}
    </div>

    <div class="score-box">
      <span class="team-name">${escapeHtml(ourTeam.team_name || 'A')}</span>
      <span class="score-num">${ourScore}</span>
      <span class="score-sep">-</span>
      <span class="score-num">${theirScore}</span>
      <span class="team-name">${escapeHtml(theirTeam.team_name || 'B')}</span>
    </div>

    <h2>${escapeHtml(labels.quarterScores)}</h2>
    ${formatNote ? `<p class="format-note">${escapeHtml(formatNote)}</p>` : ''}
    <table>
      <tr><th class="left">${escapeHtml(labels.team)}</th>${periodHeaders}<th>${escapeHtml(labels.total)}</th></tr>
      ${quarterRows}
    </table>

    ${playerStatsTable(ourTeam, allPlayers, logs, labels)}
    ${playerStatsTable(theirTeam, allPlayers, logs, labels)}

    <div class="abbr">
      <strong>${escapeHtml(labels.abbrevTitle)}:</strong>
      ${escapeHtml(labels.abbrev)}
    </div>
    </div>
    ${runningHtml}
    <div class="footer">Basketball Score App — ${formatLocaleDateTime(htmlLang)}</div>
  `;

  const title = `${game.game_name}_${game.date}`;
  const fullHtml =
    `<!DOCTYPE html><html lang="${escapeHtml(htmlLang)}"><head><meta charset="UTF-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escapeHtml(title)}</title><style>${BASE_STYLE}</style></head>` +
    `<body class="sheet-body">${bodyHtml}</body></html>`;

  return { title, htmlLang, fullHtml };
}

export function printGameScoreSheet(
  doc: GameScoreSheetDocument,
  popupBlocked: string,
): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert(popupBlocked);
    return;
  }
  win.document.write(doc.fullHtml);
  win.document.close();
  win.focus();
  win.print();
}

/** @deprecated プレビュー経由を推奨。互換用に残す */
export function generateGamePDF(
  game: Game,
  ourTeam: Team,
  theirTeam: Team,
  allPlayers: Player[],
  logs: StatsLog[],
  ourScore: number,
  theirScore: number,
  labels: ScoreSheetLabels,
  popupBlocked: string,
  htmlLang: string,
  aiReport?: RunningScorePdfAi | null,
): void {
  const doc = buildGameScoreSheetDocument(
    game, ourTeam, theirTeam, allPlayers, logs, ourScore, theirScore,
    labels, htmlLang, aiReport,
  );
  printGameScoreSheet(doc, popupBlocked);
}
