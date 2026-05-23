import { buildRunningScore, RunningCell, ShotType } from '@/lib/runningScore';
import { StatsLog, Player, Team } from '@/types';
import { fillTemplate } from '@/lib/localeFormat';

/** 1列あたりの行数（超えたら横に次列、折り返し可） */
export const RUNNING_SCORE_ROWS_PER_COLUMN = 18;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function playerBadge(num: string, shotType: ShotType | null): string {
  const n = escapeHtml(num);
  if (shotType === '3PT') {
    return `<span class="rs-3pt">${n}</span>`;
  }
  if (shotType === 'FT') {
    return `<span class="rs-ft">●${n}</span>`;
  }
  return n;
}

function renderColumn(
  cells: RunningCell[],
  startN: number,
  rowCount: number,
  ourShort: string,
  theirShort: string,
  rangeLabel: string,
): string {
  const cellMap = new Map(cells.map((c) => [c.n, c]));

  const rows = Array.from({ length: rowCount }, (_, i) => {
    const n = startN + i;
    const cell = cellMap.get(n);
    if (!cell) {
      return `<tr><td></td><td class="rs-n">${n}</td><td class="rs-n">${n}</td><td></td></tr>`;
    }
    const ourNum = cell.ourHasMarking && cell.ourPlayer
      ? playerBadge(cell.ourPlayer, cell.ourShotType)
      : '';
    const theirNum = cell.theirHasMarking && cell.theirPlayer
      ? playerBadge(cell.theirPlayer, cell.theirShotType)
      : '';
    const ourQEnd   = cell.ourQEnd   != null ? ' rs-qend' : '';
    const theirQEnd = cell.theirQEnd != null ? ' rs-qend' : '';
    return `<tr>
      <td class="rs-p">${ourNum}</td>
      <td class="rs-n${ourQEnd}">${n}</td>
      <td class="rs-n${theirQEnd}">${n}</td>
      <td class="rs-p">${theirNum}</td>
    </tr>`;
  }).join('');

  return `
    <div class="rs-col">
      <div class="rs-range">${escapeHtml(rangeLabel)}</div>
      <table>
        <thead>
          <tr>
            <th class="rs-th-team">${escapeHtml(ourShort)}</th>
            <th>A</th><th>B</th>
            <th class="rs-th-team">${escapeHtml(theirShort)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export const RUNNING_SCORE_PDF_STYLE = `
  .sheet-running {
    flex: 0 0 auto; width: auto; max-width: 50mm; height: 100%;
    border-left: 1px solid #d1d5db; padding-left: 2mm;
    display: flex; flex-direction: column;
  }
  .sheet-running h2 { font-size: 6.5pt; margin: 0 0 0.5mm; color: #1e40af; border: none; padding: 0; flex: 0 0 auto; }
  .rs-columns {
    flex: 1 1 auto; min-height: 0;
    display: flex; flex-direction: row; flex-wrap: wrap;
    align-content: space-between; justify-content: flex-start; gap: 1.5mm;
  }
  .rs-col { flex: 0 0 auto; }
  .rs-range { font-size: 5pt; color: #6b7280; text-align: center; margin-bottom: 0.5mm; }
  .rs-col table { border-collapse: collapse; font-size: 5pt; line-height: 1; table-layout: fixed; width: auto; }
  .rs-col th { background: #e5e7eb; color: #374151; font-weight: 700; padding: 0 1px; border: 1px solid #d1d5db; font-size: 4.5pt; }
  .rs-col td { padding: 0 1px; border: 1px solid #e5e7eb; height: 8px; vertical-align: middle; font-size: 4.5pt; }
  .rs-col .rs-th-team { max-width: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 4pt; }
  .rs-col .rs-p { text-align: right; font-weight: 700; }
  .rs-col .rs-n { font-family: ui-monospace, monospace; font-weight: 600; text-align: center; }
  .rs-col td.rs-qend { border-bottom: 1.5px solid #1e40af; }
  .rs-3pt { border: 1px solid #374151; border-radius: 50%; padding: 0 1px; font-size: 4pt; }
  .rs-ft { font-size: 4pt; }
`;

export function buildRunningScorePdfHtml(
  logs: StatsLog[],
  allPlayers: Player[],
  ourTeam: Team,
  theirTeam: Team,
  title: string,
  rangeTemplate: string,
): string {
  const cells = buildRunningScore(logs, allPlayers, ourTeam.id, theirTeam.id);
  if (cells.length === 0) return '';

  const ourShort = (ourTeam.team_name || 'A').slice(0, 4);
  const theirShort = (theirTeam.team_name || 'B').slice(0, 4);
  const maxN = cells[cells.length - 1].n;
  const colCount = Math.ceil(maxN / RUNNING_SCORE_ROWS_PER_COLUMN);
  const columns: string[] = [];

  for (let c = 0; c < colCount; c++) {
    const startN = c * RUNNING_SCORE_ROWS_PER_COLUMN + 1;
    const endN = Math.min(startN + RUNNING_SCORE_ROWS_PER_COLUMN - 1, maxN);
    const rowCount = endN - startN + 1;
    const slice = cells.filter((cell) => cell.n >= startN && cell.n <= endN);
    const rangeLabel = fillTemplate(rangeTemplate, { start: String(startN), end: String(endN) });
    columns.push(renderColumn(slice, startN, rowCount, ourShort, theirShort, rangeLabel));
  }

  return `
    <section class="sheet-running">
      <h2>${escapeHtml(title)}</h2>
      <div class="rs-columns">${columns.join('')}</div>
    </section>`;
}
