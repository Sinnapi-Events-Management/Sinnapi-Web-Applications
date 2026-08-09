/**
 * Which booking statuses still have a vendor-side status write available.
 *
 * Kept beside `BookingResponseActions` rather than inside it so hosts can ask
 * the question without importing a component — and so the answer has exactly one
 * definition instead of a status list re-typed at every call site.
 */
const ACTIONABLE = ['requested', 'confirmed', 'in_progress'];

/**
 * Whether a booking in `status` has any action left in the response panel. Hosts
 * use it to skip the surrounding chrome — a heading and a divider around
 * nothing — for settled bookings.
 */
export function hasBookingResponseActions(status: string): boolean {
  return ACTIONABLE.includes(status);
}
