import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { IntakeCounts } from '@/hooks/queries';
import { INTAKE_STATUSES, type IntakeStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type IntakeTabValue = StatusFilterValue<IntakeStatus>;

// Tab captions default to `titleize(status)`; only statuses whose stored value
// reads poorly as a caption need an entry here.
const LABELS: Partial<Record<IntakeStatus, string>> = {
  reviewing: 'In review',
};

/**
 * Build the review queue's tabs — `All` first, then the intake lifecycle in
 * workflow order — hanging each status' count off the counts query. Counts stay
 * `undefined` until that query resolves so the tabs render immediately with
 * badge placeholders rather than a flash of zeros.
 */
export function getStatusTabs(counts?: IntakeCounts): StatusTabOption<IntakeTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...INTAKE_STATUSES.map((status) => ({
      value: status,
      label: LABELS[status] ?? titleize(status),
      count: counts?.[status],
    })),
  ];
}

// An empty tab is a normal state, not an error — say which queue is empty
// rather than implying no applications exist at all.
const EMPTY_MESSAGES: Record<IntakeTabValue, string> = {
  [ALL_STATUSES]: 'No applications yet. New vendor applications will appear here.',
  submitted: 'No applications are awaiting review.',
  reviewing: 'No applications are currently in review.',
  approved: 'No applications have been approved yet.',
  rejected: 'No applications have been rejected.',
};

/**
 * Empty-state copy for the current tab. When a search is narrowing the list,
 * say so — otherwise a searched-to-nothing table reads as "no applications at
 * all", which is misleading.
 */
export function getEmptyMessage(status: IntakeTabValue, filtered = false): string {
  if (filtered) return 'No applications match your search.';
  return EMPTY_MESSAGES[status];
}
