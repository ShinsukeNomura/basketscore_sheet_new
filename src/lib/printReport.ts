import { TeamAnalysis, PlayerAnalysis, pct, avg } from './analysis';
import type { Dictionary } from '@/i18n/DictionaryProvider';
import { fillTemplate, formatLocaleDateTime } from '@/lib/localeFormat';

type AnalysisDict = Dictionary['analysis'];
type PrintLabels = AnalysisDict['print'];

const BASE_STYLE = `
  body { font-family: 'Hiragino Sans', 'Meiryo', 'Yu Gothic', sans-serif; color: #1a1a1a; padding: 15mm 20mm; font-size: 10pt; line-height: 1.6; }
  h1 { font-size: 16pt; border-bottom: 3px solid #1e40af; padding-bottom: 6px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 8.5pt; margin-bottom: 16px; }
  h2 { font-size: 12pt; color: #1e40af; border-left: 4px solid #1e40af; padding-left: 8px; margin: 18px 0 8px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 10px 0; }
  .stat-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 6px; text-align: center; }
  .stat-value { font-size: 17pt; font-weight: 900; color: #1e40af; }
  .stat-label { font-size: 7.5pt; color: #6b7280; }
  .stat-sub { font-size: 7pt; color: #9ca3af; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 8px 0; }
  th { background: #1e40af; color: white; padding: 5px 8px; text-align: right; font-weight: bold; }
  th:first-child { text-align: left; }
  td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; }
  td:first-child { text-align: left; font-weight: bold; }
  tr:nth-child(even) { background: #f9fafb; }
  .ai-box { background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 14px 16px; margin-top: 10px; }
  .ai-text { white-space: pre-wrap; line-height: 1.8; font-size: 9.5pt; }
  .footer { font-size: 7.5pt; color: #9ca3af; text-align: center; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  @media print { body { padding: 10mm 15mm; } button { display: none; } }
`;

function shootTable(
  fg2m: number, fg2a: number, fg3m: number, fg3a: number, ftm: number, fta: number,
  p: PrintLabels,
) {
  return `
  <table>
    <tr><th>${p.shootType}</th><th>${p.shootMade}</th><th>${p.shootAtt}</th><th>${p.shootPct}</th></tr>
    <tr><td>2PT</td><td>${fg2m}</td><td>${fg2a}</td><td>${pct(fg2m, fg2a)}</td></tr>
    <tr><td>3PT</td><td>${fg3m}</td><td>${fg3a}</td><td>${pct(fg3m, fg3a)}</td></tr>
    <tr><td>FT</td><td>${ftm}</td><td>${fta}</td><td>${pct(ftm, fta)}</td></tr>
  </table>`;
}

function printWindow(title: string, html: string, popupBlocked: string, htmlLang: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert(popupBlocked);
    return;
  }
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  win.document.write(
    `<!DOCTYPE html><html lang="${htmlLang}"><head><meta charset="UTF-8"><title>${safeTitle}</title><style>${BASE_STYLE}</style></head><body>${html}</body></html>`,
  );
  win.document.close();
  win.focus();
}

export function printTeamReport(
  analysis: TeamAnalysis,
  aiReport: string,
  a: AnalysisDict,
  popupBlocked: string,
  locale: string,
) {
  const p = a.print;
  const { teamName, games: g, wins } = analysis;
  const losses  = g - wins;
  const winRate = g > 0 ? Math.round(wins / g * 100) : 0;
  const date = formatLocaleDateTime(locale);
  const winsLabel = fillTemplate(a.wins, { wins, losses });

  const html = `
  <h1>${fillTemplate(p.teamTitle, { team: teamName })}</h1>
  <p class="meta">${fillTemplate(p.metaTeam, { games: g, date })}</p>

  <h2>${p.teamSummary}</h2>
  <div class="stats-grid">
    <div class="stat-box"><div class="stat-value">${g}</div><div class="stat-label">${a.games}</div></div>
    <div class="stat-box"><div class="stat-value">${winRate}%</div><div class="stat-label">${a.winRate}</div><div class="stat-sub">${winsLabel}</div></div>
    <div class="stat-box"><div class="stat-value">${avg(analysis.totalPts, g)}</div><div class="stat-label">${a.avgPts}</div></div>
    <div class="stat-box"><div class="stat-value">${avg(analysis.totalPtsAllowed, g)}</div><div class="stat-label">${a.avgPtsAllowed}</div></div>
  </div>

  <h2>${p.shootEff}</h2>
  ${shootTable(analysis.fg2m, analysis.fg2a, analysis.fg3m, analysis.fg3a, analysis.ftm, analysis.fta, p)}

  <h2>${p.avgStats}</h2>
  <table>
    <tr><th>OR</th><th>DR</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>FOUL</th></tr>
    <tr>
      <td>${avg(analysis.orbd, g)}</td><td>${avg(analysis.drbd, g)}</td>
      <td>${avg(analysis.ast, g)}</td><td>${avg(analysis.stl, g)}</td>
      <td>${avg(analysis.blk, g)}</td><td>${avg(analysis.tov, g)}</td>
      <td>${avg(analysis.foul, g)}</td>
    </tr>
  </table>

  <h2>${p.playerStatsCumulative}</h2>
  <table>
    <tr><th>#</th><th>PTS</th><th>2PM</th><th>2PA</th><th>2P%</th><th>3PM</th><th>3PA</th><th>3P%</th><th>FTM</th><th>FTA</th><th>OR</th><th>DR</th><th>AST</th><th>STL</th><th>TOV</th></tr>
    ${analysis.players.map((pl) => `<tr>
      <td>#${pl.backNumber}</td><td>${pl.pts}</td>
      <td>${pl.fg2m}</td><td>${pl.fg2a}</td><td>${pct(pl.fg2m, pl.fg2a)}</td>
      <td>${pl.fg3m}</td><td>${pl.fg3a}</td><td>${pct(pl.fg3m, pl.fg3a)}</td>
      <td>${pl.ftm}</td><td>${pl.fta}</td>
      <td>${pl.orbd}</td><td>${pl.drbd}</td><td>${pl.ast}</td><td>${pl.stl}</td><td>${pl.tov}</td>
    </tr>`).join('')}
  </table>

  <h2>${p.aiReport}</h2>
  <div class="ai-box"><div class="ai-text">${aiReport.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>

  <div class="footer">${fillTemplate(p.footerTeam, { date })}</div>
  `;

  printWindow(fillTemplate(p.teamTitle, { team: teamName }), html, popupBlocked, locale);
}

export function printPlayerReport(
  player: PlayerAnalysis,
  teamName: string,
  aiReport: string,
  a: AnalysisDict,
  popupBlocked: string,
  locale: string,
) {
  const p = a.print;
  const { backNumber, games: g, pts } = player;
  const date = formatLocaleDateTime(locale);

  const html = `
  <h1>${fillTemplate(p.playerTitle, { num: backNumber, team: teamName })}</h1>
  <p class="meta">${fillTemplate(p.metaPlayer, { games: g, date })}</p>

  <h2>${p.statsSummary}</h2>
  <div class="stats-grid">
    <div class="stat-box"><div class="stat-value">${pts}</div><div class="stat-label">${p.totalPts}</div></div>
    <div class="stat-box"><div class="stat-value">${avg(pts, g)}</div><div class="stat-label">${p.avgPtsPerGame}</div></div>
    <div class="stat-box"><div class="stat-value">${g}</div><div class="stat-label">${p.gamesPlayed}</div></div>
    <div class="stat-box"><div class="stat-value">${pct(player.fg2m + player.fg3m, player.fg2a + player.fg3a)}</div><div class="stat-label">FG%</div></div>
  </div>

  <h2>${p.shootEff}</h2>
  ${shootTable(player.fg2m, player.fg2a, player.fg3m, player.fg3a, player.ftm, player.fta, p)}

  <h2>${p.avgStats}</h2>
  <table>
    <tr><th>OR</th><th>DR</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>FOUL</th></tr>
    <tr>
      <td>${avg(player.orbd, g)}</td><td>${avg(player.drbd, g)}</td>
      <td>${avg(player.ast, g)}</td><td>${avg(player.stl, g)}</td>
      <td>${avg(player.blk, g)}</td><td>${avg(player.tov, g)}</td>
      <td>${avg(player.foul, g)}</td>
    </tr>
  </table>

  <h2>${p.aiReport}</h2>
  <div class="ai-box"><div class="ai-text">${aiReport.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>

  <div class="footer">${fillTemplate(p.footerPlayer, { date })}</div>
  `;

  printWindow(
    fillTemplate(p.playerTitle, { num: backNumber, team: teamName }),
    html,
    popupBlocked,
    locale,
  );
}
