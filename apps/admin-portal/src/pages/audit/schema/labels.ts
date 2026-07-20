import type { ComponentType } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';

export type OperationKey = 'insert' | 'update' | 'delete' | 'other';

/** Accent hues understood by IconBadge / MUI colour props. */
export type OperationAccent = 'success' | 'warning' | 'error' | 'info';

type OperationConfig = {
  /** Non-technical past-tense verb shown to admins. */
  verb: string;
  accent: OperationAccent;
  Icon: ComponentType<{ sx?: object }>;
};

/**
 * How each database operation reads to a human. Actions are auto-generated as
 * `${op}_${table}` by the audit trigger, so mapping the prefix covers them all;
 * `other` catches any custom action label.
 */
export const OPERATIONS: Record<OperationKey, OperationConfig> = {
  insert: { verb: 'Created', accent: 'success', Icon: AddCircleOutlineIcon },
  update: { verb: 'Updated', accent: 'warning', Icon: EditOutlinedIcon },
  delete: { verb: 'Deleted', accent: 'error', Icon: DeleteOutlineIcon },
  other: { verb: 'Changed', accent: 'info', Icon: BoltOutlinedIcon },
};

/**
 * Human, singular label for each audited table (`entity_type`). Keeps the
 * "Affected record" column readable instead of exposing raw table names.
 */
export const ENTITY_LABELS: Record<string, string> = {
  profiles: 'User profile',
  roles: 'Role',
  role_permissions: 'Role permission',
  user_roles: 'Role assignment',
  platform_settings: 'Platform setting',
  vendor_bank_accounts: 'Vendor bank account',
  vendor_documents: 'Vendor document',
  subscriptions: 'Subscription',
  escrow_transactions: 'Escrow transaction',
  payouts: 'Payout',
  refunds: 'Refund',
  disputes: 'Dispute',
  payments: 'Payment',
  pricing_plans: 'Pricing plan',
  data_retention_policies: 'Data retention policy',
  erasure_requests: 'Erasure request',
};

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
