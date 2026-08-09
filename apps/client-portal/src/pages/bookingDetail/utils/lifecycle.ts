/**
 * The path a booking is expected to walk when nothing goes wrong. Used to show
 * the steps still ahead of a live booking, greyed out beneath the ones that have
 * actually happened — a request sitting at `requested` reads very differently
 * when you can see that "confirmed" is the vendor's move next.
 *
 * Mirrors the `booking_status` enum's happy path. `cancelled` and `declined` are
 * deliberately absent: they are exits from the path, not steps along it, so a
 * booking that reaches either has nothing left to project.
 */
export const BOOKING_LIFECYCLE = ['requested', 'confirmed', 'in_progress', 'completed'] as const;

/** Statuses after `status` on the happy path; empty once the booking has exited it. */
export function remainingLifecycle(status: string): string[] {
  const at = BOOKING_LIFECYCLE.indexOf(status as (typeof BOOKING_LIFECYCLE)[number]);
  return at === -1 ? [] : BOOKING_LIFECYCLE.slice(at + 1);
}
