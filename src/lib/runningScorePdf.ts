import { buildRunningScore, RunningCell, ShotType } from '@/lib/runningScore';
import { StatsLog, Player, Team } from '@/types';
import { fillTemplate } from '@/lib/localeFormat';

/** 下余白1列に収める行数（超えたら横に次列） */
export const RUNNING_SCORE_ROWS_PER_COLUMN = 26;

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

function rowClass(cell: RunningCell): string {
  const parts: string[] = [];
  if (cell.ourQEnd != null || cell.theirQEnd != null) parts.push('rs-qend');
  return parts.join(' ');
}

function renderColumn(
  cells: RunningCell[],
  startN: number,
  ourShort: string,
  theirShort: string,
  rangeLabel: string,
): string {
  const endN = startN + RUNNING_SCORE_ROWS_PER_COLUMN - 1;
  const cellMap = new Map(cells.map((c) => [c.n, c]));

  const rows = Array.from({ length: RUNNING_SCORE_ROWS_PER_COLUMN }, (_, i) => {
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
    return `<tr class="${rowClass(cell)}">
      <td class="rs-p">${ourNum}</td>
      <td class="rs-n">${n}</td>
      <td class="rs-n">${n}</td>
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

export interface RunningScorePdfAi {
  title: string;
  body: string;
  generatedLabel?: string;
}

function buildAiReportPanel(ai: RunningScorePdfAi): string {
  const body = escapeHtml(ai.body);
  return `
    <div class="rs-ai-panel">
      <div class="rs-ai-title">${escapeHtml(ai.title)}</div>
      ${ai.generatedLabel ? `<div class="rs-ai-meta">${escapeHtml(ai.generatedLabel)}</div>` : ''}
      <div class="rs-ai-text">${body}</div>
    </div>`;
}

export const RUNNING_SCORE_PDF_STYLE = `
  .running-footer { margin-top: 2mm; padding-top: 2px; border-top: 1px solid #d1d5db; }
  .running-footer-row { display: flex; flex-direction: row; align-items: flex-end; gap: 3mm; }
  .rs-left { flex: 0 1 auto; min-width: 0; }
  .running-footer h2 { font-size: 7pt; margin: 0 0 2px; color: #1e40af; border: none; padding: 0; line-height: 1.2; }
  .rs-columns { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: flex-end; gap: 2mm; overflow: visible; }
  .rs-ai-panel {
    flex: 1 1 auto; min-width: 42mm; max-width: 78mm; align-self: stretch;
    border: 1px solid #7dd3fc; background: #f0f9ff; border-radius: 3px;
    padding: 2px 4px; box-sizing: border-box; max-height: 58mm; overflow: hidden;
  }
  .rs-ai-title { font-size: 6pt; font-weight: 800; color: #1e40af; margin-bottom: 1px; line-height: 1.2; }
  .rs-ai-meta { font-size: 4.5pt; color: #6b7280; margin-bottom: 2px; }
  .rs-ai-text { font-size: 4.5pt; line-height: 1.28; white-space: pre-wrap; word-break: break-word; color: #1f2937; }
  .rs-col { flex: 0 0 auto; min-width: 0; }
  .rs-range { font-size: 5pt; color: #6b7280; text-align: center; margin-bottom: 1px; line-height: 1.1; }
  .rs-col table { border-collapse: collapse; font-size: 5.5pt; line-height: 1; }
  .rs-col th { background: #e5e7eb; color: #374151; font-weight: 700; padding: 0 2px; text-align: center; border: 1px solid #d1d5db; font-size: 5pt; }
  .rs-col td { padding: 0 2px; text-align: center; border: 1px solid #e5e7eb; height: 8px; vertical-align: middle; }
  .rs-col .rs-th-team { max-width: 22px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 4.5pt; }
  .rs-col .rs-p { text-align: right; font-weight: 700; font-size: 5pt; min-width: 11px; }
  .rs-col .rs-n { font-family: ui-monospace, monospace; font-weight: 600; min-width: 11px; font-size: 5pt; }
  .rs-col tr.rs-qend td { border-bottom-width: 1.5px; border-bottom-color: #1e40af; }
  .rs-3pt { border: 1px solid #374151; border-radius: 50%; padding: 0 1px; font-size: 4.5pt; }
  .rs-ft { font-size: 4.5pt; }
  @media print {
    .running-footer { page-break-inside: avoid; }
  }
`;

export function buildRunningScorePdfHtml(
  logs: StatsLog[],
  allPlayers: Player[],
  ourTeam: Team,
  theirTeam: Team,
  title: string,
  rangeTemplate: string,
  aiReport?: RunningScorePdfAi | null,
): string {
  const cells = buildRunningScore(logs, allPlayers, ourTeam.id, theirTeam.id);
  if (cells.length === 0) return '';

  const ourShort = (ourTeam.team_name || 'A').slice(0, 4);
  const theirShort = (theirTeam.team_name || 'B').slice(0, 4);

  const colCount = Math.ceil(cells.length / RUNNING_SCORE_ROWS_PER_COLUMN);
  const columns: string[] = [];

  for (let c = 0; c < colCount; c++) {
    const startN = c * RUNNING_SCORE_ROWS_PER_COLUMN + 1;
    const endN = startN + RUNNING_SCORE_ROWS_PER_COLUMN - 1;
    const slice = cells.filter((cell) => cell.n >= startN && cell.n <= endN);
    const rangeLabel = fillTemplate(rangeTemplate, { start: String(startN), end: String(endN) });
    columns.push(renderColumn(slice, startN, ourShort, theirShort, rangeLabel));
  }

  const aiHtml = aiReport?.body.trim() ? buildAiReportPanel(aiReport) : '';

  return `
    <div class="running-footer">
      <div class="running-footer-row">
        <div class="rs-left">
          <h2>${escapeHtml(title)}</h2>
          <div class="rs-columns">${columns.join('')}</div>
        </div>
        ${aiHtml}
      </div>
    </div>`;
}
