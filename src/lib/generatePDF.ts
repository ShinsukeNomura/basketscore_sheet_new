import { Game, Team, Player, StatsLog } from '@/types';
import { periodLabel } from '@/lib/period';
import type { Dictionary } from '@/i18n/DictionaryProvider';
import { fillTemplate, formatLocaleDateTime } from '@/lib/localeFormat';
import { filterActivePeriods, getEffectiveRegularQuarters, isPracticeGame } from '@/lib/gameFormat';
import { buildRunningScorePdfHtml, RUNNING_SCORE_PDF_STYLE, type RunningScorePdfAi } from '@/lib/runningScorePdf';

export type ScoreSheetLabels = Dictionary['pdf']['scoreSheet'];

export const SCORE_SHEET_FIT_SCRIPT = `
(function(){
  function fitScoreSheetToA4(){
    var root=document.getElementById('print-root');
    if(!root)return;
    root.style.transform='none';
    root.style.width='100%';
    document.body.style.height='';
    document.body.style.overflow='';
    var mm=function(v){return v*96/25.4;};
    var maxH=mm(297-8);
    var maxW=mm(210-10);
    var h=root.getBoundingClientRect().height;
    var w=root.getBoundingClientRect().width;
    if(!h)return;
    var scale=Math.min(1,maxH/h,maxW/w);
    if(scale<0.999){
      root.style.transformOrigin='top left';
      root.style.transform='scale('+scale.toFixed(4)+')';
      root.style.width=(100/scale).toFixed(2)+'%';
      document.body.style.height=Math.ceil(h*scale)+'px';
      document.body.style.overflow='hidden';
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',fitScoreSheetToA4);
  }else{
    fitScoreSheetToA4();
  }
})();
`;

const BASE_STYLE = `
  @page { size: A4 portrait; margin: 4mm; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Hiragino Sans', 'Meiryo', 'Yu Gothic', sans-serif; color: #1a1a1a; font-size: 7.5pt; line-height: 1.2; }
  #print-root { box-sizing: border-box; padding: 2mm 3mm; }
  h1 { font-size: 10pt; text-align: center; margin: 0 0 1px; line-height: 1.15; }
  .meta { text-align: center; color: #4b5563; font-size: 6.5pt; margin-bottom: 2px; line-height: 1.2; }
  .score-box { display: flex; align-items: center; justify-content: center; gap: 8px; border-top: 1px solid #1e40af; border-bottom: 1px solid #1e40af; padding: 2px 0; margin: 2px 0; }
  .team-name { font-size: 8.5pt; font-weight: 900; min-width: 48px; text-align: center; }
  .score-num { font-size: 14pt; font-weight: 900; color: #1e40af; min-width: 24px; text-align: center; line-height: 1; }
  .score-sep { font-size: 10pt; font-weight: 700; color: #6b7280; }
  h2 { font-size: 7pt; color: #1e40af; border-left: 2px solid #1e40af; padding-left: 4px; margin: 3px 0 1px; line-height: 1.1; }
  table { width: 100%; border-collapse: collapse; font-size: 6pt; margin: 0 0 2px; }
  th { background: #1e40af; color: white; padding: 0 2px; text-align: center; font-weight: bold; line-height: 1.1; }
  th.left, td.left { text-align: left; }
  td { padding: 0 1px; border-bottom: 1px solid #e5e7eb; text-align: center; line-height: 1.1; }
  tr:nth-child(even) { background: #f9fafb; }
  .stats-pair { display: flex; flex-direction: row; gap: 1.5mm; align-items: flex-start; margin-bottom: 1px; }
  .stats-pair .stats-block { flex: 1; min-width: 0; }
  .stats-pair h2 { margin-top: 2px; font-size: 6.5pt; }
  .stats-pair table { font-size: 5pt; margin-bottom: 0; }
  .stats-pair th, .stats-pair td { padding: 0; line-height: 1.05; }
  .abbr { font-size: 5pt; color: #6b7280; margin-top: 1px; line-height: 1.15; }
  .footer { font-size: 5pt; color: #9ca3af; text-align: center; margin-top: 1px; padding-top: 1px; }
  .format-note { font-size: 5.5pt; color: #6b7280; margin: 0 0 1px; }
  ${RUNNING_SCORE_PDF_STYLE}
  @media print {
    html, body { height: auto !important; min-height: 0 !important; overflow: hidden !important; }
    #print-root { page-break-inside: avoid; page-break-after: avoid; }
  }
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
    <div class="stats-block">
      <h2>${teamName} — ${escapeHtml(labels.playerStats)}</h2>
      <table>${header}${body}</table>
    </div>`;
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
    <div id="print-root">
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

    <div class="stats-pair">
      ${playerStatsTable(ourTeam, allPlayers, logs, labels)}
      ${playerStatsTable(theirTeam, allPlayers, logs, labels)}
    </div>

    <div class="abbr">
      <strong>${escapeHtml(labels.abbrevTitle)}:</strong>
      ${escapeHtml(labels.abbrev)}
    </div>
    ${runningHtml}
    <div class="footer">Basketball Score App — ${formatLocaleDateTime(htmlLang)}</div>
    </div>
  `;

  const title = `${game.game_name}_${game.date}`;
  const fullHtml =
    `<!DOCTYPE html><html lang="${escapeHtml(htmlLang)}"><head><meta charset="UTF-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escapeHtml(title)}</title><style>${BASE_STYLE}</style></head>` +
    `<body>${bodyHtml}<script>${SCORE_SHEET_FIT_SCRIPT}<\/script></body></html>`;

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
  const triggerPrint = () => {
    win.focus();
    win.print();
  };
  // レイアウト・A4フィット後に印刷ダイアログを開く
  setTimeout(triggerPrint, 150);
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
