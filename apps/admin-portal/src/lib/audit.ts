import type { ComponentType } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import { titleize } from '@/lib/config';

// How an audit entry reads to a human. Shared by the Audit log page and the
// dashboard's activity feed so one change never renders two different ways.

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

export function entityLabel(entityType: string | null | undefined): string {
  if (!entityType) return 'Record';
  return ENTITY_LABELS[entityType] ?? titleize(entityType.replace(/s$/, ''));
}

/** Which database operation an auto-generated `${op}_${table}` action encodes. */
export function operationOf(action: string): OperationKey {
  if (action.startsWith('insert_')) return 'insert';
  if (action.startsWith('update_')) return 'update';
  if (action.startsWith('delete_')) return 'delete';
  return 'other';
}

function article(word: string): 'a' | 'an' {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** Everything the UI needs to render an action in plain language. */
export type ActionInfo = {
  op: OperationKey;
  verb: string;
  /** Full sentence, e.g. "Updated a pricing plan". */
  label: string;
  accent: OperationAccent;
  Icon: OperationConfig['Icon'];
};

/** Map an audit action + entity to human copy, colour, and icon. */
export function describeAction(action: string, entityType: string | null): ActionInfo {
  const op = operationOf(action);
  const cfg = OPERATIONS[op];
  const noun = entityLabel(entityType).toLowerCase();
  const label = op === 'other' ? titleize(action) : `${cfg.verb} ${article(noun)} ${noun}`;
  return { op, verb: cfg.verb, label, accent: cfg.accent, Icon: cfg.Icon };
}
