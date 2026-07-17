import { EVENT_SOURCES } from '@/lib/status';
import { titleize } from '@/lib/config';

export type FilterOption = { value: string; label: string };

/** `event_source` values as dropdown options (admin / client). */
export const SOURCE_OPTIONS: FilterOption[] = EVENT_SOURCES.map((source) => ({
  value: source,
  label: titleize(source),
}));

/** `is_public` tri-state as dropdown options — value maps to the query below. */
export const PUBLIC_OPTIONS: FilterOption[] = [
  { value: 'true', label: 'Public' },
  { value: 'false', label: 'Not public' },
];

/** Source values the query will accept; anything else is treated as "any". */
const VALID_SOURCES = new Set<string>(EVENT_SOURCES);

export function isValidSource(value: string): boolean {
  return VALID_SOURCES.has(value);
}

/** `is_public` filter values the query accepts. */
export function isValidPublic(value: string): value is 'true' | 'false' {
  return value === 'true' || value === 'false';
}
