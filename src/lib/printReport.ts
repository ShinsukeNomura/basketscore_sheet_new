import { TeamAnalysis, PlayerAnalysis, pct, avg } from './analysis';

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
  .section-chip { display:inline-block; background:#dbeafe; color:#1e40af; border-radius:4px; padding:1px 6px; font-size:8pt; font-weight:bold; margin-right:6px; }
  @media print { body { padding: 10mm 15mm; } button { display: none; } }
`;

function shootTable(fg2m: number, fg2a: number, fg3m: number, fg3a: number, ftm: number, fta: number) {
  return `
  <table>
    <tr><th>種別</th><th>成功</th><th>試投</th><th>成功率</th></tr>
    <tr><td>2PT</td><td>${fg2m}</td><td>${fg2a}</td><td>${pct(fg2m, fg2a)}</td></tr>
    <tr><td>3PT</td><td>${fg3m}</td><td>${fg3a}</td><td>${pct(fg3m, fg3a)}</td></tr>
    <tr><td>FT</td><td>${ftm}</td><td>${fta}</td><td>${pct(ftm, fta)}</td></tr>
  </table>`;
}

function printWindow(title: string, html: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('ポップアップがブロックされました。許可してから再試行してください。'); return; }
  win.document.write(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${title}</title><style>${BASE_STYLE}</style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 800);
}

export function printTeamReport(
  analysis: TeamAnalysis,
  aiReport: string,
) {
  const { teamName, games: g, wins } = analysis;
  const losses  = g - wins;
  const winRate = g > 0 ? Math.round(wins / g * 100) : 0;

  const html = `
  <h1>チーム分析レポート — ${teamName}</h1>
  <p class="meta">分析期間: ${g}試合 ／ 生成: ${new Date().toLocaleString('ja-JP')}</p>

  <h2>📊 チームサマリー</h2>
  <div class="stats-grid">
    <div class="stat-box"><div class="stat-value">${g}</div><div class="stat-label">試合数</div></div>
    <div class="stat-box"><div class="stat-value">${winRate}%</div><div class="stat-label">勝率</div><div class="stat-sub">${wins}勝${losses}敗</div></div>
    <div class="stat-box"><div class="stat-value">${avg(analysis.totalPts, g)}</div><div class="stat-label">平均得点</div></div>
    <div class="stat-box"><div class="stat-value">${avg(analysis.totalPtsAllowed, g)}</div><div class="stat-label">平均失点</div></div>
  </div>

  <h2>🎯 シュート効率</h2>
  ${shootTable(analysis.fg2m, analysis.fg2a, analysis.fg3m, analysis.fg3a, analysis.ftm, analysis.fta)}

  <h2>📈 試合平均スタッツ</h2>
  <table>
    <tr><th>OR</th><th>DR</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>FOUL</th></tr>
    <tr>
      <td>${avg(analysis.orbd, g)}</td><td>${avg(analysis.drbd, g)}</td>
      <td>${avg(analysis.ast, g)}</td><td>${avg(analysis.stl, g)}</td>
      <td>${avg(analysis.blk, g)}</td><td>${avg(analysis.tov, g)}</td>
      <td>${avg(analysis.foul, g)}</td>
    </tr>
  </table>

  <h2>👥 個人スタッツ（累計）</h2>
  <table>
    <tr><th>#</th><th>PTS</th><th>2PM</th><th>2PA</th><th>2P%</th><th>3PM</th><th>3PA</th><th>3P%</th><th>FTM</th><th>FTA</th><th>OR</th><th>DR</th><th>AST</th><th>STL</th><th>TOV</th></tr>
    ${analysis.players.map((p) => `<tr>
      <td>#${p.backNumber}</td><td>${p.pts}</td>
      <td>${p.fg2m}</td><td>${p.fg2a}</td><td>${pct(p.fg2m, p.fg2a)}</td>
      <td>${p.fg3m}</td><td>${p.fg3a}</td><td>${pct(p.fg3m, p.fg3a)}</td>
      <td>${p.ftm}</td><td>${p.fta}</td>
      <td>${p.orbd}</td><td>${p.drbd}</td><td>${p.ast}</td><td>${p.stl}</td><td>${p.tov}</td>
    </tr>`).join('')}
  </table>

  <h2>🤖 AI分析レポート（Gemini）</h2>
  <div class="ai-box"><div class="ai-text">${aiReport.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>

  <div class="footer">Basketball Score App — AI分析レポート ／ ${new Date().toLocaleString('ja-JP')}</div>
  `;

  printWindow(`${teamName} — チーム分析レポート`, html);
}

export function printPlayerReport(
  player: PlayerAnalysis,
  teamName: string,
  aiReport: string,
) {
  const { backNumber, games: g, pts } = player;

  const html = `
  <h1>個人分析レポート — #${backNumber}（${teamName}）</h1>
  <p class="meta">出場: ${g}試合 ／ 生成: ${new Date().toLocaleString('ja-JP')}</p>

  <h2>📊 スタッツサマリー</h2>
  <div class="stats-grid">
    <div class="stat-box"><div class="stat-value">${pts}</div><div class="stat-label">総得点</div></div>
    <div class="stat-box"><div class="stat-value">${avg(pts, g)}</div><div class="stat-label">平均得点/試合</div></div>
    <div class="stat-box"><div class="stat-value">${g}</div><div class="stat-label">出場試合数</div></div>
    <div class="stat-box"><div class="stat-value">${pct(player.fg2m + player.fg3m, player.fg2a + player.fg3a)}</div><div class="stat-label">FG%</div></div>
  </div>

  <h2>🎯 シュート効率</h2>
  ${shootTable(player.fg2m, player.fg2a, player.fg3m, player.fg3a, player.ftm, player.fta)}

  <h2>📈 試合平均スタッツ</h2>
  <table>
    <tr><th>OR</th><th>DR</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>FOUL</th></tr>
    <tr>
      <td>${avg(player.orbd, g)}</td><td>${avg(player.drbd, g)}</td>
      <td>${avg(player.ast, g)}</td><td>${avg(player.stl, g)}</td>
      <td>${avg(player.blk, g)}</td><td>${avg(player.tov, g)}</td>
      <td>${avg(player.foul, g)}</td>
    </tr>
  </table>

  <h2>🤖 AI分析レポート（Gemini）</h2>
  <div class="ai-box"><div class="ai-text">${aiReport.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>

  <div class="footer">Basketball Score App — AI個人分析レポート ／ ${new Date().toLocaleString('ja-JP')}</div>
  `;

  printWindow(`#${backNumber} — 個人分析レポート`, html);
}
