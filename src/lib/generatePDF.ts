import jsPDF from 'jspdf';
import { Game, Team, Player, StatsLog } from '@/types';
import { periodLabel } from '@/lib/period';

// ── 日本語→英語マッピング（jsPDFはCJK非対応のため変換）
const JP_GAME_TYPE: Record<string, string> = {
  '練習試合': 'Practice Game',
  '公式戦':   'Official Game',
  'カップ戦': 'Cup Game',
  'その他':   'Other',
};

function safePDF(text: string): string {
  let s = text;
  for (const [jp, en] of Object.entries(JP_GAME_TYPE)) {
    s = s.split(jp).join(en);
  }
  // 残った非ASCII文字を除去
  return Array.from(s).filter((c) => c.charCodeAt(0) < 128).join('').trim() || '-';
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

export function generateGamePDF(
  game: Game,
  ourTeam: Team,
  theirTeam: Team,
  allPlayers: Player[],
  logs: StatsLog[],
  ourScore: number,
  theirScore: number,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 15;

  const line  = (x1: number, y1: number, x2: number, y2: number) =>
    doc.line(x1, y1, x2, y2);
  const text  = (t: string, x: number, ty: number, size = 10, style: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.text(safePDF(t), x, ty);
  };
  const ctext = (t: string, ty: number, size = 10, style: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.text(safePDF(t), W / 2, ty, { align: 'center' });
  };

  // ── タイトル ──
  ctext('BASKETBALL GAME STATS REPORT', y, 14, 'bold');
  ctext(game.game_name, y + 7, 10);
  ctext(game.date, y + 13, 10);
  if (game.scorekeeper) {
    ctext(`Recorder: ${game.scorekeeper}`, y + 19, 9);
    y += 6;
  }
  y += 22;

  // ── スコア ──
  line(10, y, W - 10, y); y += 8;
  text(ourTeam.team_name || 'A',  22, y, 11, 'bold');
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text(safePDF(`${ourScore}`), 78, y, { align: 'right' });
  ctext('-', y, 14, 'bold');
  doc.text(safePDF(`${theirScore}`), 132, y, { align: 'left' });
  text(theirTeam.team_name || 'B', W - 22, y, 11, 'bold');
  y += 12;
  line(10, y, W - 10, y); y += 6;

  // ── クォーター別（OTは得点があるときのみ含める） ──
  const otWithScore = new Set(
    logs.filter((l) => !l.is_deleted && l.points > 0 && l.period >= 5).map((l) => l.period as number)
  );
  const periods = ([1, 2, 3, 4, 5, 6] as const).filter((p) => p <= 4 || otWithScore.has(p));
  text('Quarter', 12, y, 9, 'bold');
  periods.forEach((p, i) => text(periodLabel(p), 50 + i * 17, y, 9, 'bold'));
  text('Total', 50 + periods.length * 17, y, 9, 'bold');
  y += 5;

  [ourTeam, theirTeam].forEach((team, ti) => {
    const scores = periods.map((p) => periodScore(logs, team.id, p));
    const total  = ti === 0 ? ourScore : theirScore;
    text(team.team_name || (ti === 0 ? 'A' : 'B'), 12, y, 9);
    scores.forEach((s, i) => text(`${s}`, 50 + i * 17, y, 9));
    text(`${total}`, 50 + periods.length * 17, y, 9, 'bold');
    y += 6;
  });
  y += 4;

  // ── プレイヤースタッツ ──
  const cols = ['#', 'PTS', '2PM', '2PA', '3PM', '3PA', 'FTM', 'FTA', 'OR', 'DR', 'AST', 'STL', 'BLK', 'TOV', 'FOUL'];
  const xs   = [12,  25,   38,   48,   58,   68,   78,   88,   98,   106,  114,  122,  130,  138,  148];

  const drawTeamStats = (team: Team) => {
    const rows = buildPlayerRows(allPlayers, logs, team.id);
    if (rows.length === 0) return;

    line(10, y, W - 10, y); y += 6;
    text(`${team.team_name || 'Team'} — Player Stats`, 12, y, 10, 'bold');
    y += 6;

    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    cols.forEach((c, i) => doc.text(c, xs[i], y));
    y += 1; line(10, y, W - 10, y); y += 4;

    rows.forEach((r) => {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const vals = [r.num, r.pts, r.fg2, r.fg2a, r.fg3, r.fg3a, r.ft, r.fta, r.orbd, r.drbd, r.ast, r.stl, r.blk, r.tov, r.foul];
      vals.forEach((v, i) => doc.text(String(v), xs[i], y));
      y += 5;
    });
    y += 4;
  };

  drawTeamStats(ourTeam);
  drawTeamStats(theirTeam);

  // ── 略語注釈 ──
  line(10, y, W - 10, y); y += 5;
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('Abbreviations:', 12, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  const abbrs = [
    'PTS: Points',
    '2PM/2PA: 2PT Made / Attempted',
    '3PM/3PA: 3PT Made / Attempted',
    'FTM/FTA: Free Throw Made / Attempted',
    'OR: Off. Rebound',
    'DR: Def. Rebound',
    'AST: Assist',
    'STL: Steal',
    'BLK: Block',
    'TOV: Turnover',
    'FOUL: Foul',
  ];
  // 3列で並べる
  const colW = 60;
  abbrs.forEach((a, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    doc.text(a, 12 + col * colW, y + row * 4);
  });
  y += Math.ceil(abbrs.length / 3) * 4 + 4;

  // ── フッター ──
  line(10, y, W - 10, y); y += 5;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(`Generated by Basketball Score App — ${isoNow()}`, W / 2, y, { align: 'center' });

  doc.save(`${safePDF(game.game_name)}_${game.date}.pdf`);
}
