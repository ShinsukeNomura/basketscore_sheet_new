/** クォーター番号を表示ラベルに変換 */
export function periodLabel(p: number): string {
  if (p === 5) return 'OT1';
  if (p === 6) return 'OT2';
  return `${p}Q`;
}

/** OT かどうか */
export function isOT(p: number): boolean {
  return p >= 5;
}
