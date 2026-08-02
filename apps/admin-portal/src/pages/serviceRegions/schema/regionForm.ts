import { z } from 'zod';
import type { ServiceRegionModel } from '@/lib/types';

// Mirrors the Postgres check on `service_regions.scope`
// (20260618000003_identity_and_reference.sql).
const SCOPES = ['city', 'region', 'national', 'continental', 'international'] as const;

const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const INT_RE = /^\d{1,6}$/;

export type SelectOption = { value: string; label: string };

export const SCOPE_OPTIONS: SelectOption[] = SCOPES.map((s) => ({
  value: s,
  label: s[0].toUpperCase() + s.slice(1),
}));

/**
 * Derives a DB-safe key from a display name: lowercase, spaces/punctuation
 * collapsed to single hyphens, leading/trailing hyphens trimmed. Matches
 * `SLUG_RE` below by construction.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const regionFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Key is required.')
    .max(60, 'Key must be 60 characters or fewer.')
    .regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens — e.g. kampala-central.'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(120, 'Name must be 120 characters or fewer.'),
  scope: z.enum(SCOPES),
  sort_order: z.string().regex(INT_RE, 'Enter a whole number, e.g. 1.'),
  is_active: z.boolean(),
});

export type RegionFormValues = z.infer<typeof regionFormSchema>;

export const emptyRegionValues: RegionFormValues = {
  key: '',
  name: '',
  scope: 'city',
  sort_order: '0',
  is_active: true,
};

function asOption<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Projects a fetched region onto the form's all-strings shape. */
export function toFormValues(r: ServiceRegionModel): RegionFormValues {
  return {
    key: r.key ?? '',
    name: r.name ?? '',
    scope: asOption(r.scope, SCOPES, 'city'),
    sort_order: String(r.sort_order ?? 0),
    is_active: r.is_active ?? true,
  };
}

/** Rebuilds the DB row from form values. */
export function toWritePayload(values: RegionFormValues) {
  return {
    key: values.key.trim(),
    name: values.name.trim(),
    scope: values.scope,
    sort_order: Number(values.sort_order),
    is_active: values.is_active,
  };
}
