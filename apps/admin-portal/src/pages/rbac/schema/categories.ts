import { titleize } from '@/lib/config';
import type { PermissionModel } from '@/lib/types';

/** Accent tints available to a category badge. Mirrors <IconBadge />'s palette. */
export type CategoryAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export type PermissionCategory = {
  /** `permissions.category` value — also the icon lookup key. */
  key: string;
  label: string;
  accent: CategoryAccent;
  /** What granting anything in this group actually lets the holder do. */
  blurb: string;
};

/**
 * Metadata for the categories seeded in `permissions.category`
 * (see supabase/migrations/20260618000012_seed_reference.sql).
 *
 * The catalog is runtime data, so this table is a *decoration* layer, never a
 * gate: a category added to the database later still renders — it just falls
 * back to a humanised label and a neutral tint via `resolveCategory`.
 */
const CATEGORIES: Record<string, PermissionCategory> = {
  finance: {
    key: 'finance',
    label: 'Finance',
    accent: 'success',
    blurb: 'Escrow, payouts, refunds, disputes and the ledger — money leaves the platform here.',
  },
  rbac: {
    key: 'rbac',
    label: 'Roles & access',
    accent: 'error',
    blurb: 'Control over this screen. Granting it lets a role rewrite every other role.',
  },
  users: {
    key: 'users',
    label: 'Users',
    accent: 'primary',
    blurb: 'Viewing and managing platform accounts.',
  },
  vendor: {
    key: 'vendor',
    label: 'Vendors',
    accent: 'info',
    blurb: 'Vendor applications, due diligence and vendor records.',
  },
  operations: {
    key: 'operations',
    label: 'Operations',
    accent: 'primary',
    blurb: 'Bookings, quotations, events and platform discounts.',
  },
  subscription: {
    key: 'subscription',
    label: 'Subscriptions',
    accent: 'secondary',
    blurb: 'Subscriptions and pricing plans.',
  },
  moderation: {
    key: 'moderation',
    label: 'Moderation',
    accent: 'warning',
    blurb: 'Oversight of messages and reviews.',
  },
  system: {
    key: 'system',
    label: 'System',
    accent: 'secondary',
    blurb: 'Platform settings, audit logs, retention and erasure.',
  },
};

/** Catch-all for a permission whose category is null or unrecognised. */
const OTHER: PermissionCategory = {
  key: 'other',
  label: 'Other',
  accent: 'secondary',
  blurb: 'Permissions that declare no category.',
};

/**
 * Display order, most sensitive first, so the groups an admin most needs to
 * scrutinise sit at the top of the pane. Categories absent from this list sort
 * after it, alphabetically.
 */
const ORDER = [
  'rbac',
  'finance',
  'users',
  'vendor',
  'operations',
  'subscription',
  'moderation',
  'system',
];

/** Resolve a raw `permissions.category` to its metadata, never failing. */
export function resolveCategory(key: string | null | undefined): PermissionCategory {
  if (!key) return OTHER;
  return CATEGORIES[key] ?? { ...OTHER, key, label: titleize(key) };
}

export type PermissionGroup = {
  category: PermissionCategory;
  /** The category's permissions, alphabetised by key. */
  permissions: PermissionModel[];
};

function rank(key: string): number {
  const i = ORDER.indexOf(key);
  // Unknown categories sort after every known one, then alphabetically.
  return i === -1 ? ORDER.length : i;
}

/**
 * Bucket the flat catalog into ordered, display-ready category groups. Pure —
 * it knows nothing about which permissions a role holds, so the same grouping
 * serves the editor, the filters and the counts.
 */
export function groupByCategory(permissions: PermissionModel[]): PermissionGroup[] {
  const buckets = new Map<string, PermissionModel[]>();
  for (const permission of permissions) {
    const { key } = resolveCategory(permission.category);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(permission);
    else buckets.set(key, [permission]);
  }

  return [...buckets.entries()]
    .map(([key, list]) => ({
      category: resolveCategory(key === OTHER.key ? null : key),
      permissions: [...list].sort((a, b) => a.key.localeCompare(b.key)),
    }))
    .sort(
      (a, b) =>
        rank(a.category.key) - rank(b.category.key) ||
        a.category.label.localeCompare(b.category.label),
    );
}
