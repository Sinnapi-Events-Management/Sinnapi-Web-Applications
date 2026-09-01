import { z } from 'zod';
import { offerDateWindow, type OfferDateWindow, type OfferModel } from '@sinnapi/ui/offers';
import { requiredDateField } from '@/lib/schema';

/**
 * Ordering a published package tier.
 *
 * Notice what is NOT here, and it is the same absence as
 * `bookingFromQuotation`: no amount, no tier price, no saving. The client is
 * buying a tier whose price is published, and `request_package_quotation`
 * recomputes every figure from the tier's own rows. A total that travelled
 * through this form would be a total this form could have edited, and this one
 * is binding the moment the vendor approves it.
 *
 * What the client supplies is the four things the package cannot know: when the
 * event is, where it is, what kind of event it is, and anything else the vendor
 * needs to turn up prepared.
 *
 * The address is its own field rather than a line in the brief because a vendor
 * approving a date is agreeing to a place as much as to a day — and an address
 * buried in prose is one the approval panel cannot show and the booking cannot
 * inherit.
 */

/** The shape a discount code is allowed to take, matching the column's own. */
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,23}$/;

export const packageOrderSchema = z.object({
  eventDate: requiredDateField('Event date'),

  // A select, so this is an id and never prose. `event_types` has been the
  // reference table behind every other event picker since 0814a — putting
  // "birthday party" through as free text would make this the one place on the
  // platform where an event's kind is not something a vendor can filter on.
  eventTypeId: z.string().min(1, 'Tell them what kind of event this is.'),

  // 160 rather than a rounder number: it is the cap the booking form already
  // puts on `bookings.location`, which is where this value ends up. Allowing a
  // longer address here would produce one the booking step could not accept.
  eventAddress: z
    .string()
    .trim()
    .min(1, 'Tell them where the event is.')
    .max(160, 'Please keep the address under 160 characters.'),

  details: z
    .string()
    .trim()
    .min(20, 'Give them at least a sentence — guest count, timings, anything unusual.')
    .max(2000, 'Please keep the description under 2000 characters.'),

  // Shape only, exactly as `quoteRequestSchema` validates it, and for the
  // reason stated there: whether a code exists, is in date and covers this tier
  // is the server's answer and only the server's.
  discountCode: z.union([
    z.string().trim().regex(CODE_RE, 'A code is 2–24 letters, numbers or hyphens.'),
    z.literal(''),
  ]),
});

export type PackageOrderValues = z.infer<typeof packageOrderSchema>;

export const emptyPackageOrderValues: PackageOrderValues = {
  eventDate: '',
  eventTypeId: '',
  eventAddress: '',
  details: '',
  discountCode: '',
};

/**
 * The days the picker will accept.
 *
 * An offer constrains BOTH ends; without one the only rule is that the event
 * has not already happened. Returned as bounds rather than as a validator
 * because the calendar can simply grey out the days it will not take, which is
 * a better answer than letting someone pick a date and then refusing it.
 *
 * `min` is never earlier than today even when the offer opened last month: an
 * offer running since August does not make August bookable.
 */
export function packageOrderDateBounds(
  offer: OfferModel | null,
  today: string,
): { minDate: string; maxDate?: string; window: OfferDateWindow | null } {
  const window = offerDateWindow(offer);
  if (!window) return { minDate: today, window: null };
  return {
    minDate: window.startsOn > today ? window.startsOn : today,
    maxDate: window.endsOn,
    window,
  };
}

/** Arguments for `request_package_quotation`. */
export function toPackageOrderArgs(
  values: PackageOrderValues,
  vendorId: string,
  templateId: string,
  tierId: string,
) {
  return {
    p_vendor_id: vendorId,
    p_template_id: templateId,
    p_tier_id: tierId,
    p_event_date: values.eventDate,
    p_event_type_id: values.eventTypeId,
    p_details: values.details.trim(),
    p_event_address: values.eventAddress.trim(),
    // Empty collapses to null, so "no code" and "a code I cleared" reach the
    // server as the same thing.
    p_discount_code: values.discountCode.trim() || null,
  };
}
