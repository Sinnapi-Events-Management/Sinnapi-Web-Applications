import { titleize } from '@/lib/config';
import { one } from '@/lib/rel';
import * as audit from '@/lib/audit';
import type { ActorKind, AuditLogModel, RoleKeyRef } from '@/lib/types';

export type { ActionInfo } from '@/lib/audit';

/** Details for the "Performed by" column and the detail drawer. */
export type ActorInfo = {
  /**
   * True when no person is behind the row — a webhook, a sweep, a cron.
   *
   * Kept as a boolean because the cell still branches on "is there a face to
   * show", but it is now derived from `actor_kind` rather than from
   * `actor_id is null`. That distinction is the whole point: the old test was
   * true for an IPN, a cron and an unattributable sign-in attempt alike, and
   * the cell rendered all three as the same grey "System".
   */
  isSystem: boolean;
  kind: ActorKind;
  /** How the kind reads, and which one it was ('pesapal_ipn'). */
  kindLabel: string;
  kindDescription: string;
  kindAccent: audit.OperationAccent;
  name: string;
  /** Secondary line (email) when a name is present; otherwise null. */
  email: string | null;
  roles: RoleKeyRef[];
};

/** A single before → after difference, ready to render. */
export type FieldChange = { key: string; label: string; before: string; after: string };

export const entityLabel = audit.entityLabel;

/** Map an audit log row to human copy, colour, and icon. */
export function describeAction(log: AuditLogModel): audit.ActionInfo {
  return audit.describeAction(log.action, log.entity_type);
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

/**
 * Resolve the actor into a name, an email, flattened roles, and — since
 * 20260904000001 — what KIND of thing it was.
 *
 * A row can be `actor_kind: 'user'` with no resolvable profile: an
 * authentication attempt for an address that does not exist is a person acting
 * and deliberately carries no `actor_id`, because inventing one would render
 * a failed sign-in as a real account. Those show the kind without a face.
 */
export function actorInfo(log: AuditLogModel): ActorInfo {
  const kind = log.actor_kind ?? 'system';
  const described = audit.describeActorKind(kind, log.actor_label);
  const base = {
    kind,
    kindLabel: described.label,
    kindDescription: described.description,
    kindAccent: described.accent,
  };

  const actor = one(log.actor);
  if (!actor) {
    return {
      ...base,
      isSystem: true,
      // The kind IS the name when there is no person: "Pesapal webhook" rather
      // than a uniform "System" that means nothing.
      name: described.label,
      email: null,
      roles: [],
    };
  }

  const roles: RoleKeyRef[] = [];
  for (const ur of actor.user_roles ?? []) {
    const role = one(ur.roles);
    if (role) roles.push(role);
  }

  const name = actor.full_name ?? actor.email ?? 'Unknown user';
  return {
    ...base,
    isSystem: false,
    name,
    email: actor.full_name ? actor.email : null,
    roles,
  };
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
