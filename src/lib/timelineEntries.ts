import type { StatsLog, TimelineEntry } from '@/types';

/** タイムライン表示用（手動記録を新しい順、連動ログを付帯） */
export function buildTimelineEntries(logs: StatsLog[]): TimelineEntry[] {
  const active = logs.filter((l) => !l.is_deleted);
  const primaries = [...active]
    .filter((l) => !l.is_auto)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return primaries.map((primary) => ({
    primary,
    linked: primary.link_id
      ? active.filter((l) => l.link_id === primary.link_id && l.is_auto)
      : [],
  }));
}
