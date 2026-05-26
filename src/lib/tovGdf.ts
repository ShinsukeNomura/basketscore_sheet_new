import { TovReason } from '@/types';

/**
 * ディフェンスが能動的に引き起こしたターンオーバー（チームGDF対象）かどうかを判定する。
 *
 * GDF対象：
 *   steal          — 直接スチール
 *   bad-pass       — ディフェンスプレッシャーによるパスミス誘発
 *   offensive-foul — チャージング（ディフェンスが位置取り）
 *   5sec           — クローズリー・ガードド違反（密着ディフェンスが強制）
 *
 * 自滅系（GDF対象外）：
 *   traveling / lost-ball / double-dribble / out-of-bounds /
 *   backcourt / 3sec / 24sec / 8sec / violation / other
 */
const GDF_REASONS = new Set<TovReason>([
  'steal',
  'bad-pass',
  'offensive-foul',
  '5sec',
]);

export function isGoodDefenseReason(reason: TovReason | undefined): boolean {
  return reason != null && GDF_REASONS.has(reason);
}
