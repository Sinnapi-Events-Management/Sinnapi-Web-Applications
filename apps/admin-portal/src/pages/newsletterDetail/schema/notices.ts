import type { ContactListSaveResult } from '@/lib/types';

/**
 * What the composer says back to the operator, as pure functions.
 *
 * Copy assembled inside JSX is copy nobody can read: the address-book
 * confirmation was a four-way nested template literal in the middle of an
 * `<Alert>`, and the lock banner was a conditional sentence spliced from two
 * halves. Both are statements about a state, so both are computed from that
 * state here — a component's job is to decide where a sentence goes, not to
 * build it.
 */

/** Why the composer is read-only, or null while it is still a draft. */
export function lockNotice(status: string): string | null {
  if (status === 'scheduled') {
    return (
      'This campaign has been scheduled, so its content and audience are fixed. ' +
      'Cancel the schedule to return it to a draft and keep editing.'
    );
  }
  if (status === 'draft') return null;
  return 'This campaign has been sent, so its content and audience are fixed.';
}

/**
 * What a save actually did to an address book.
 *
 * The counts are the confirmation: "saved" alone cannot tell an operator
 * whether the 12 rows they expected to be new actually were.
 */
export function savedListNotice(result: ContactListSaveResult): string {
  const n = (value: number) => value.toLocaleString();
  const skipped =
    result.skipped > 0 ? `, ${n(result.skipped)} skipped for a missing name or address` : '';
  return (
    `“${result.title}” now holds ${n(result.total)} contacts — ` +
    `${n(result.inserted)} added, ${n(result.updated)} already there${skipped}.`
  );
}
