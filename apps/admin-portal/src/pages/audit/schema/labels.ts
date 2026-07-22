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

export const ACTOR_FILTER_OPTIONS: FilterOption[] = [
  { value: 'people', label: 'People' },
  { value: 'system', label: 'System / automated' },
];
