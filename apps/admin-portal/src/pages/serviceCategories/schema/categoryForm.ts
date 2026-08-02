import { z } from 'zod';
import type { ServiceCategoryModel } from '@/lib/types';

// Matches the DB check-free but effectively enforced slug shape used across the
// catalogue (pricing plans, vendors) — lowercase, digits, single separators.
const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const INT_RE = /^\d{1,6}$/;

/** Sentinel for "no parent" in the parent-category select — `''` reads as top-level. */
export const NO_PARENT = '';

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

export const categoryFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Key is required.')
    .max(60, 'Key must be 60 characters or fewer.')
    .regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens — e.g. photo-video.'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(120, 'Name must be 120 characters or fewer.'),
  parent_id: z.string(),
  icon: z.string().trim().max(60, 'Icon must be 60 characters or fewer.'),
  sort_order: z.string().regex(INT_RE, 'Enter a whole number, e.g. 1.'),
  is_active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const emptyCategoryValues: CategoryFormValues = {
  key: '',
  name: '',
  parent_id: NO_PARENT,
  icon: '',
  sort_order: '0',
  is_active: true,
};

/** Projects a fetched category onto the form's all-strings shape. */
export function toFormValues(c: ServiceCategoryModel): CategoryFormValues {
  return {
    key: c.key ?? '',
    name: c.name ?? '',
    parent_id: c.parent_id ?? NO_PARENT,
    icon: c.icon ?? '',
    sort_order: String(c.sort_order ?? 0),
    is_active: c.is_active ?? true,
  };
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/** Rebuilds the DB row from form values: sentinel/empties become null, numbers coerce. */
export function toWritePayload(values: CategoryFormValues) {
  return {
    key: values.key.trim(),
    name: values.name.trim(),
    parent_id: nullIfEmpty(values.parent_id),
    icon: nullIfEmpty(values.icon),
    sort_order: Number(values.sort_order),
    is_active: values.is_active,
  };
}
