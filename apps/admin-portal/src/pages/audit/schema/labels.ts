import { ENTITY_LABELS } from '@/lib/audit';

// The operation/entity vocabulary itself lives in `@/lib/audit` — the dashboard's
// activity feed renders the same entries. Re-exported so audit modules keep one
// import; the filter option lists below are this page's own concern.
export { ENTITY_LABELS, OPERATIONS, type OperationAccent, type OperationKey } from '@/lib/audit';

export type FilterOption = { value: string; label: string };

export const OPERATION_FILTER_OPTIONS: FilterOption[] = [
  { value: 'insert', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
];

export const ENTITY_FILTER_OPTIONS: FilterOption[] = Object.entries(ENTITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

/**
 * The real breakdown, replacing the old two-value people-vs-system list.
 *
 * That list was not a filter on anything: "system" meant `actor_id is null`,
 * which is true of a Pesapal IPN, the hourly reconciliation sweep, every cron
 * in the database and an unattributable sign-in attempt — one bucket for four
 * completely different explanations of the same row. `actor_kind` is a real
 * column (20260904000001), so these are the values it can hold.
 *
 * Order is by how often an investigator wants them, not alphabetical: a person
 * first, then the two that mean "money moved without a person", then the
 * schedules.
 */
export const ACTOR_KIND_FILTER_OPTIONS: FilterOption[] = [
  { value: 'user', label: 'A person' },
  { value: 'psp_webhook', label: 'Payment provider (webhook)' },
  { value: 'reconciliation', label: 'Reconciliation sweep' },
  { value: 'cron', label: 'Scheduled job' },
  { value: 'system', label: 'System (unattributed)' },
];
