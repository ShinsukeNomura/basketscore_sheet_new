/** 記録UIの色分け（他アプリにない操作を視覚的に区別） */
export type StatUiTier = 'standard' | 'linked' | 'gesture' | 'signature';

export function getStatButtonClasses(tier: StatUiTier, selected: boolean): string {
  if (tier === 'standard') {
    return selected
      ? 'bg-blue-700/80 text-white border-2 border-blue-400'
      : 'bg-neutral-800/80 text-neutral-200 border border-neutral-700/40 active:bg-neutral-700/80';
  }
  if (tier === 'linked') {
    return selected
      ? 'bg-violet-700/80 text-white border-2 border-violet-400 ring-2 ring-violet-300/40'
      : 'bg-neutral-800/60 text-violet-200/90 border border-violet-900/40 active:bg-neutral-700/70';
  }
  if (tier === 'gesture') {
    return selected
      ? 'bg-amber-700/80 text-white border-2 border-amber-400 ring-2 ring-amber-300/50'
      : 'bg-neutral-800/60 text-amber-200/90 border border-amber-900/40 active:bg-neutral-700/70';
  }
  // signature: チーム守備（長押し→右スワイプ）
  return selected
    ? 'bg-cyan-800/80 text-white border-2 border-cyan-400 ring-2 ring-cyan-300/40'
    : 'bg-neutral-800/50 text-cyan-200/90 border border-dashed border-cyan-600/45 active:bg-neutral-700/70';
}

export function getNegativeStatButtonClasses(selected: boolean): string {
  return selected
    ? 'bg-amber-700/80 text-white border-2 border-amber-400'
    : 'bg-neutral-800/60 text-amber-200/90 border border-amber-900/40 active:bg-neutral-700/70';
}
