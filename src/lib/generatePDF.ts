import { Game, Team, Player, StatsLog } from '@/types';
import { periodLabel } from '@/lib/period';
import type { Dictionary } from '@/i18n/DictionaryProvider';
import { fillTemplate, formatLocaleDateTime } from '@/lib/localeFormat';
import { filterActivePeriods, getEffectiveRegularQuarters, isPracticeGame } from '@/lib/gameFormat';
import { buildRunningScorePdfHtml, RUNNING_SCORE_PDF_STYLE } from '@/lib/runningScorePdf';
import { formatAiReportBody, AI_REPORT_PDF_STYLE, type ScoreSheetAiReport } from '@/lib/scoreSheetAiHtml';
import { printGameScoreSheet } from '@/lib/scoreSheetExport';

export { printGameScoreSheet } from '@/lib/scoreSheetExport';

export type ScoreSheetLabels = Dictionary['pdf']['scoreSheet'];
export type { ScoreSheetAiReport };

/** A4用スタイル */
const PAGE_H = '287mm';

const BASE_STYLE = `
  @page { size: A4 portrait; margin: 2mm 4mm 4mm 4mm; }
  * { box-sizing: border-box; }
  html, body {
    width: 210mm; max-width: 210mm; margin: 0; padding: 0;
    font-family: 'Hiragino Sans', 'Meiryo', 'Yu Gothic', sans-serif;
    color: #1a1a1a; font-size: 7pt; line-height: 1.2;
    overflow: hidden;
  }
  .a4-sheet {
    width: 202mm; max-width: 202mm; margin: 0 auto;
    display: flex; flex-direction: column;
    gap: 1.5mm;
    height: auto;
    max-height: ${PAGE_H};
  }
  .sheet-top {
    flex: 0 0 auto;
    display: block;
    padding-top: 1mm;
  }
  .sheet-head { flex: 0 0 auto; }
  h1 { font-size: 10pt; text-align: center; margin: 0; padding: 0; line-height: 1.15; }
  .meta-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 2mm; margin-top: 0.5mm;
  }
  .meta { flex: 1; text-align: left; color: #4b5563; font-size: 6.5pt; line-height: 1.25; }
  .score-box {
    flex: 0 0 auto;
    display: flex; align-items: center; justify-content: center; gap: 4mm;
    border: 1.5px solid #1e40af; border-radius: 3px;
    padding: 1.5mm 3mm;
  }
  .team-name { font-size: 8.5pt; font-weight: 900; text-align: center; max-width: 28mm; }
  .score-num { font-size: 14pt; font-weight: 900; color: #1e40af; line-height: 1; }
  .score-sep { font-size: 9pt; font-weight: 700; color: #6b7280; }
  .sheet-quarter { margin-top: 1mm; }
  h2 { font-size: 7pt; color: #1e40af; border-left: 2px solid #1e40af; padding-left: 3px; margin: 0 0 0.5mm; line-height: 1.1; }
  .quarter-table { width: 100%; border-collapse: collapse; font-size: 6.5pt; margin: 0; }
  .quarter-table th { background: #1e40af; color: white; padding: 1px 3px; }
  .quarter-table td { padding: 1px 3px; border-bottom: 1px solid #e5e7eb; line-height: 1.2; }
  .format-note { font-size: 5.5pt; color: #6b7280; margin: 0 0 0.5mm; }
  .sheet-stats { margin: 1mm 0 0; }
  .stats-pair {
    display: flex;
    gap: 2mm;
    align-items: flex-start;
  }
  .stats-pair .stats-block {
    flex: 1;
    min-width: 0;
  }
  .stats-pair h2 { font-size: 7pt; margin: 0 0 0.5mm; }
  .stats-pair table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    font-size: 6pt;
    margin: 0;
  }
  .stats-pair th {
    background: #1e40af;
    color: white;
    padding: 1px 3px;
    line-height: 1.15;
    height: auto;
    white-space: nowrap;
    text-align: center;
    font-weight: 700;
    vertical-align: middle;
  }
  .stats-pair td {
    padding: 1px 3px;
    line-height: 1.15;
    height: auto;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
    text-align: center;
    vertical-align: middle;
  }
  .stats-pair th.left, .stats-pair td.left { text-align: left; }
  .stats-pair tr:nth-child(even) { background: #f9fafb; }
  .sheet-bottom {
    flex: 0 0 auto;
    border-top: 1px solid #d1d5db;
    padding-top: 1.5mm;
  }
  .sheet-bottom.has-ai {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 2mm;
  }
  .a4-sheet.no-ai .sheet-running {
    width: 100%;
    max-width: none;
    height: auto;
    border-left: none;
    padding-left: 0;
  }
  .a4-sheet.has-ai {
    height: ${PAGE_H};
    max-height: ${PAGE_H};
  }
  .a4-sheet.has-ai .sheet-top {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 1.5mm;
  }
  .a4-sheet.has-ai .sheet-stats {
    flex: 0 0 auto;
    margin-top: auto;
  }
  .sheet-foot {
    flex: 0 0 auto;
    font-size: 5pt; color: #6b7280; line-height: 1.15;
    border-top: 1px solid #e5e7eb; padding-top: 0.5mm;
  }
  .sheet-foot .abbr { margin: 0 0 0.3mm; }
  .sheet-foot .app-line { text-align: center; color: #9ca3af; font-size: 5pt; margin: 0; }
  ${RUNNING_SCORE_PDF_STYLE}
  ${AI_REPORT_PDF_STYLE}
  @media screen and (max-width: 480px) {
    html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
    .a4-sheet {
      width: 100%; max-width: 100%; height: auto; min-height: auto;
      max-height: none; gap: 2mm; padding: 0 1mm;
    }
    .sheet-top { flex: 0 0 auto; }
    .a4-sheet.no-ai .sheet-bottom { flex: 0 0 auto; min-height: auto; }
    .sheet-bottom.has-ai { flex-direction: column; }
    .sheet-running { max-width: 100%; border-left: none; padding-left: 0; height: auto; }
    .sheet-ai .ai-body { column-count: 1; }
  }
  @media print {
    html, body { overflow: hidden; }
    .a4-sheet { page-break-inside: avoid; width: 202mm; max-width: 202mm; }
    .a4-sheet.has-ai { height: ${PAGE_H}; max-height: ${PAGE_H}; }
    .a4-sheet.no-ai { height: auto; max-height: ${PAGE_H}; }
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

function buildAiPanelHtml(ai: ScoreSheetAiReport): string {
  return `
    <aside class="sheet-ai">
      <h2>${escapeHtml(ai.title)}</h2>
      ${ai.generatedLabel ? `<div class="ai-meta">${escapeHtml(ai.generatedLabel)}</div>` : ''}
      <div class="ai-body">${formatAiReportBody(ai.body)}</div>
    </aside>`;
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
  aiReport?: ScoreSheetAiReport | null,
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
  );

  const hasAi = Boolean(aiReport?.body.trim());
  const aiHtml = hasAi && aiReport ? buildAiPanelHtml(aiReport) : '';

  const bodyHtml = `
    <div class="a4-sheet${hasAi ? ' has-ai' : ' no-ai'}">
      <div class="sheet-top">
        <div class="sheet-head">
          <h1>${escapeHtml(labels.title)}</h1>
          <div class="meta-row">
            <div class="meta">
              <div>${escapeHtml(game.game_name)} · ${escapeHtml(game.date)}</div>
              ${game.scorekeeper ? `<div>${escapeHtml(labels.recorder)}: ${escapeHtml(game.scorekeeper)}</div>` : ''}
            </div>
            <div class="score-box">
              <span class="team-name">${escapeHtml(ourTeam.team_name || 'A')}</span>
              <span class="score-num">${ourScore}</span>
              <span class="score-sep">-</span>
              <span class="score-num">${theirScore}</span>
              <span class="team-name">${escapeHtml(theirTeam.team_name || 'B')}</span>
            </div>
          </div>
        </div>

        <section class="sheet-quarter">
          <h2>${escapeHtml(labels.quarterScores)}</h2>
          ${formatNote ? `<p class="format-note">${escapeHtml(formatNote)}</p>` : ''}
          <table class="quarter-table">
            <tr><th class="left">${escapeHtml(labels.team)}</th>${periodHeaders}<th>${escapeHtml(labels.total)}</th></tr>
            ${quarterRows}
          </table>
        </section>

        <section class="sheet-stats">
          <div class="stats-pair">
            ${playerStatsTable(ourTeam, allPlayers, logs, labels)}
            ${playerStatsTable(theirTeam, allPlayers, logs, labels)}
          </div>
        </section>
      </div>

      <div class="sheet-bottom${hasAi ? ' has-ai' : ''}">
        ${aiHtml}
        ${runningHtml || ''}
      </div>

      <footer class="sheet-foot">
        <p class="abbr"><strong>${escapeHtml(labels.abbrevTitle)}:</strong> ${escapeHtml(labels.abbrev)}</p>
        <p class="app-line">Basketball Score App — ${formatLocaleDateTime(htmlLang)}</p>
      </footer>
    </div>
  `;

  const title = `${game.game_name}_${game.date}`;
  const fullHtml =
    `<!DOCTYPE html><html lang="${escapeHtml(htmlLang)}"><head><meta charset="UTF-8">` +
    `<title>${escapeHtml(title)}</title><style>${BASE_STYLE}</style></head>` +
    `<body>${bodyHtml}</body></html>`;

  return { title, htmlLang, fullHtml };
}

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
  aiReport?: ScoreSheetAiReport | null,
): void {
  const doc = buildGameScoreSheetDocument(
    game, ourTeam, theirTeam, allPlayers, logs, ourScore, theirScore,
    labels, htmlLang, aiReport,
  );
  printGameScoreSheet(doc, popupBlocked);
}
