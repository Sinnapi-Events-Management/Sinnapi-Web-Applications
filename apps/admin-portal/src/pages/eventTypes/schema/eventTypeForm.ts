import { z } from 'zod';
import type { EventTypeModel } from '@/lib/types';

// The token shape the rest of the platform keys off: lowercase, digits, single
// separators. `search_events_public` compares it exactly and the public site
// carries it in the URL, so it has to stay URL- and SQL-safe.
const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const INT_RE = /^\d{1,6}$/;

/**
 * Derives a DB-safe key from a display name. Underscores rather than hyphens,
 * matching the seeded vocabulary (`baby_shower`, `company_event`) — the tokens
 * already live in bookmarked URLs, so a new type has to be spelled the same way
 * the existing ones are.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const eventTypeFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Key is required.')
    .max(60, 'Key must be 60 characters or fewer.')
    .regex(SLUG_RE, 'Use lowercase letters, numbers and single underscores — e.g. baby_shower.'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(120, 'Name must be 120 characters or fewer.'),
  icon: z.string().trim().max(60, 'Icon must be 60 characters or fewer.'),
  sort_order: z.string().regex(INT_RE, 'Enter a whole number, e.g. 1.'),
  is_active: z.boolean(),
});

export type EventTypeFormValues = z.infer<typeof eventTypeFormSchema>;

export const emptyEventTypeValues: EventTypeFormValues = {
  key: '',
  name: '',
  icon: '',
  sort_order: '0',
  is_active: true,
};

/** Projects a fetched event type onto the form's all-strings shape. */
export function toFormValues(t: EventTypeModel): EventTypeFormValues {
  return {
    key: t.key ?? '',
    name: t.name ?? '',
    icon: t.icon ?? '',
    sort_order: String(t.sort_order ?? 0),
    is_active: t.is_active ?? true,
  };
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/** Rebuilds the DB row from form values: empties become null, numbers coerce. */
export function toWritePayload(values: EventTypeFormValues) {
  return {
    key: values.key.trim(),
    name: values.name.trim(),
    icon: nullIfEmpty(values.icon),
    sort_order: Number(values.sort_order),
    is_active: values.is_active,
  };
}
