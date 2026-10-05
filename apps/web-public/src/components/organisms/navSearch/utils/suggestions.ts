import type { SuggestionRow } from '@/lib/types';

/**
 * Where a suggestion takes the visitor. Vendors route by slug (a readable,
 * shareable segment); events have no slug, so they route by id — the same
 * split `VendorCard` and `EventCard` already make, kept in one place so a
 * route change has one edit site rather than three.
 */
export function suggestionHref(row: SuggestionRow): string {
  return row.kind === 'vendor' && row.slug ? `/vendors/${row.slug}` : `/events/${row.id}`;
}

/** Where the raw text goes when the visitor ignores the list and just submits. */
export function searchHref(q: string): string {
  const term = q.trim();
  return term ? `/vendors?q=${encodeURIComponent(term)}` : '/vendors';
}

/** Stable DOM id per option, so `aria-activedescendant` has something to point at. */
export function optionId(listboxId: string, index: number): string {
  return `${listboxId}-option-${index}`;
}

export type SuggestionGroup = {
  kind: SuggestionRow['kind'];
  heading: string;
  rows: SuggestionRow[];
  /** Index of this group's first row in the flat list the keyboard walks. */
  offset: number;
};

/**
 * The flat list, cut into its two labelled sections — while keeping each row's
 * position in the *flat* list, because that is the sequence arrow keys move
 * through and the number `aria-activedescendant` is built from. Rendering from
 * a nested structure and navigating a flat one is how the highlight and the
 * selection drift apart.
 *
 * Order follows the RPC's, which already returns vendors before events;
 * grouping here only inserts the headings.
 */
export function groupSuggestions(rows: SuggestionRow[]): SuggestionGroup[] {
  const vendors = rows.filter((row) => row.kind === 'vendor');
  const events = rows.filter((row) => row.kind === 'event');

  return [
    { kind: 'vendor' as const, heading: 'Vendors', rows: vendors, offset: 0 },
    { kind: 'event' as const, heading: 'Events', rows: events, offset: vendors.length },
  ].filter((group) => group.rows.length > 0);
}

/**
 * The typed text located inside a label, as `[before, match, after]`.
 *
 * Baymard's finding is that the *suggested* part should be emphasised rather
 * than the part the visitor already typed — so the caller renders `match`
 * plain and the rest bold, not the other way round.
 *
 * Returns null when the text is not literally present, which is the normal
 * outcome for a fuzzy row: "photographer" produced "Nungi Photography" through
 * trigram similarity, and there is no honest substring to mark. Callers render
 * the label unstyled in that case rather than inventing a match.
 */
export function splitMatch(label: string, term: string): [string, string, string] | null {
  const needle = term.trim();
  if (!needle) return null;
  const at = label.toLowerCase().indexOf(needle.toLowerCase());
  if (at < 0) return null;
  return [label.slice(0, at), label.slice(at, at + needle.length), label.slice(at + needle.length)];
}
