import { Player } from '@/types';

/** 背番号の数値順（同チームのコート5人表示用） */
export function compareBackNumber(a: Player, b: Player): number {
  const na = parseInt(a.back_number, 10);
  const nb = parseInt(b.back_number, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.back_number.localeCompare(b.back_number, undefined, { numeric: true });
}

export function sortPlayersByBackNumber(players: Player[]): Player[] {
  return [...players].sort(compareBackNumber);
}
