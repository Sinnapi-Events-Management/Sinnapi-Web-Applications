import { one } from '@/lib/rel';
import type { ReconciliationExceptionModel } from '@/lib/types';

export type ExceptionLink = {
  key: 'payment' | 'escrow' | 'payout';
  label: string;
  to: string;
  /** The raw id, for the copy affordance beside the link. */
  id: string;
};

/**
 * Where each id on an exception leads.
 *
 * A finding names up to three records and used to show their ids as text
 * that resolved to nothing clickable. Each now goes to the page that shows
 * the record: the payment to its investigation page, the escrow to the money
 * tab of its booking (there is no escrow page; the booking is where an escrow
 * is read), the payout to the queue narrowed to that one row.
 *
 * The escrow link needs the booking id, which rides along as an embed and is
 * null for a reader without `escrow.read` — in which case that link simply
 * does not appear, rather than pointing at a page that would refuse them.
 */
export function exceptionLinks(r: ReconciliationExceptionModel): ExceptionLink[] {
  const links: ExceptionLink[] = [];
  if (r.payment_id) {
    links.push({
      key: 'payment',
      label: 'Payment',
      to: `/payments/${r.payment_id}`,
      id: r.payment_id,
    });
  }
  const bookingId = one(r.escrow_transactions)?.booking_id;
  if (r.escrow_id && bookingId) {
    links.push({
      key: 'escrow',
      label: 'Escrow',
      to: `/bookings/${bookingId}?tab=money`,
      id: r.escrow_id,
    });
  }
  if (r.payout_id) {
    links.push({
      key: 'payout',
      label: 'Payout',
      to: `/payouts?q=${r.payout_id}`,
      id: r.payout_id,
    });
  }
  return links;
}
