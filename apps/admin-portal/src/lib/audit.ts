import type { ComponentType } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import { titleize } from '@/lib/config';

// How an audit entry reads to a human. Shared by the Audit log page and the
// dashboard's activity feed so one change never renders two different ways.

export type OperationKey = 'insert' | 'update' | 'delete' | 'other';

/**
 * How each actor kind reads to a human, and what it should look like.
 *
 * The accents carry meaning rather than decoration. `psp_webhook` and
 * `reconciliation` are `info` and `warning`: a provider telling us something is
 * routine, a reconciliation row means a webhook was lost or a figure did not
 * match and is worth a second look. `system` is deliberately the drabbest —
 * since 20260904000001 it means genuinely unattributed, which after this work
 * should be rare, and a row still wearing it is a gap somebody should close.
 */
export type ActorKindKey = 'user' | 'psp_webhook' | 'cron' | 'reconciliation' | 'system';

export const ACTOR_KINDS: Record<
  ActorKindKey,
  { label: string; description: string; accent: OperationAccent }
> = {
  user: { label: 'Person', description: 'Acted through a portal', accent: 'success' },
  psp_webhook: {
    label: 'Provider webhook',
    description: 'The payment provider told us',
    accent: 'info',
  },
  reconciliation: {
    label: 'Reconciliation',
    description: 'A cross-check found a disagreement',
    accent: 'warning',
  },
  cron: { label: 'Scheduled job', description: 'A timer came due', accent: 'info' },
  system: {
    label: 'System',
    description: 'Unattributed — no actor was recorded',
    accent: 'error',
  },
};

/**
 * Presentation for one actor kind, with its free-text label folded in.
 *
 * `actor_label` names WHICH webhook or WHICH sweep ('pesapal_ipn',
 * 'payment-reconciliation'), which is the difference between "a provider told
 * us" and "Pesapal's IPN told us". It is free text in the database on purpose —
 * a new Edge Function should not need a migration to be attributable — so it is
 * titleized rather than looked up.
 */
export function describeActorKind(
  kind: ActorKindKey | string | null,
  actorLabel: string | null,
): { label: string; description: string; accent: OperationAccent } {
  const base = ACTOR_KINDS[(kind ?? 'system') as ActorKindKey] ?? ACTOR_KINDS.system;
  if (!actorLabel) return base;
  return { ...base, description: titleize(actorLabel) };
}

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
  // Not a table: `entity_type = 'auth'` is what the 0802e logging functions
  // stamp on sign-in, sign-out and signup rows, which have an account behind
  // them rather than a record.
  auth: 'Authentication',
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
