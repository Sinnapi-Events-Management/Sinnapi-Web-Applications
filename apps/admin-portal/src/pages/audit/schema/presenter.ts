import { titleize } from '@/lib/config';
import { one } from '@/lib/rel';
import type { AuditLogModel, RoleKeyRef } from '@/lib/types';
import { ENTITY_LABELS, OPERATIONS, type OperationKey, type OperationAccent } from './labels';

/** Everything the UI needs to render an action in plain language. */
export type ActionInfo = {
  op: OperationKey;
  verb: string;
  /** Full sentence, e.g. "Updated a pricing plan". */
  label: string;
  accent: OperationAccent;
  Icon: (typeof OPERATIONS)[OperationKey]['Icon'];
};

/** Details for the "Performed by" column and the detail drawer. */
export type ActorInfo = {
  isSystem: boolean;
  name: string;
  /** Secondary line (email) when a name is present; otherwise null. */
  email: string | null;
  roles: RoleKeyRef[];
};

/** A single before → after difference, ready to render. */
export type FieldChange = { key: string; label: string; before: string; after: string };

export function entityLabel(entityType: string | null): string {
  if (!entityType) return 'Record';
  return ENTITY_LABELS[entityType] ?? titleize(entityType.replace(/s$/, ''));
}

function article(word: string): 'a' | 'an' {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** Map an audit action to human copy, colour, and icon. */
export function describeAction(log: AuditLogModel): ActionInfo {
  const op: OperationKey = log.action.startsWith('insert_')
    ? 'insert'
    : log.action.startsWith('update_')
      ? 'update'
      : log.action.startsWith('delete_')
        ? 'delete'
        : 'other';
  const cfg = OPERATIONS[op];
  const noun = entityLabel(log.entity_type).toLowerCase();
  const label = op === 'other' ? titleize(log.action) : `${cfg.verb} ${article(noun)} ${noun}`;
  return { op, verb: cfg.verb, label, accent: cfg.accent, Icon: cfg.Icon };
}

// Field names, in priority order, that best identify a record to a human.
const LABEL_KEYS = [
  'name',
  'title',
  'full_name',
  'display_name',
  'label',
  'plan_name',
  'data_category',
  'reference',
  'code',
  'key',
  'slug',
  'email',
];

function snapshot(log: AuditLogModel): Record<string, unknown> {
  return log.after ?? log.before ?? {};
}

/**
 * A recognisable label for the affected record, pulled from the stored row
 * snapshot (no extra queries). Returns null when nothing human-friendly exists.
 */
export function entitySummary(log: AuditLogModel): string | null {
  const snap = snapshot(log);
  for (const key of LABEL_KEYS) {
    const value = snap[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** First 8 chars of a UUID with an ellipsis, for a compact reference. */
export function shortId(id: string | null): string | null {
  return id ? `${id.slice(0, 8)}…` : null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const chars = parts.map((w) => w[0]?.toUpperCase() ?? '').join('');
  return chars || '?';
}

/** Resolve the embedded actor into name, email, and flattened roles. */
export function actorInfo(log: AuditLogModel): ActorInfo {
  const actor = one(log.actor);
  if (!actor) return { isSystem: true, name: 'System', email: null, roles: [] };

  const roles: RoleKeyRef[] = [];
  for (const ur of actor.user_roles ?? []) {
    const role = one(ur.roles);
    if (role) roles.push(role);
  }

  const name = actor.full_name ?? actor.email ?? 'Unknown user';
  return { isSystem: false, name, email: actor.full_name ? actor.email : null, roles };
}

// Bookkeeping columns that add noise rather than meaning in a change list.
const HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'lock_version', 'search_vector']);

function toText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Diff the before/after snapshots into the fields that actually changed. For
 * inserts every field reads "— → value"; for deletes, "value → —".
 */
export function changedFields(log: AuditLogModel): FieldChange[] {
  const before = log.before ?? {};
  const after = log.after ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  const changes: FieldChange[] = [];
  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    const from = toText(before[key]);
    const to = toText(after[key]);
    if (from === to) continue;
    changes.push({ key, label: titleize(key), before: from, after: to });
  }
  return changes.sort((a, b) => a.label.localeCompare(b.label));
}
