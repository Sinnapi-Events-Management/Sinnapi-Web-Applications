import type { StatusTabOption } from '@/components/ui/StatusTabs';

/** The moderation queue is filtered one status at a time (plus an "all" view). */
export type FlagTab = 'open' | 'actioned' | 'dismissed' | 'all';

/** Only open flags can be actioned, so selection/bulk actions key off this. */
export const ACTIONABLE_STATUS = 'open';

/**
 * Static tab definitions. Row-count badges are merged in by the page from the
 * hook's live counts, keeping this list presentation-agnostic.
 */
export const FLAG_TAB_DEFS: { value: FlagTab; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
];

export type FlagCounts = Record<FlagTab, number>;

/** Merge live counts into the static tab defs for <StatusTabs />. */
export function buildTabs(counts: FlagCounts): StatusTabOption<FlagTab>[] {
  return FLAG_TAB_DEFS.map((t) => ({ ...t, count: counts[t.value] }));
}
