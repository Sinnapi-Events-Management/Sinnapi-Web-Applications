import { StatusChip } from '@sinnapi/ui';

type Props = {
  /** `vendor_status` — active, suspended or hidden. */
  status: string;
  /** `vendor_visibility` — public or hidden. */
  visibility: string;
};

/**
 * The listing's two state chips, as one unit.
 *
 * They are always read together — a listing that is `active` but `hidden` is live
 * yet undiscoverable, and neither chip means much without the other — so they are
 * composed here rather than assembled inline wherever a card happens to want them.
 *
 * Both come from the shared `StatusChip`, which is what keeps `Active` the same
 * green a vendor sees on their bookings list and in the admin console. Ordering is
 * status then visibility, matching the rows in `ListingFactsCard` below the card.
 */
export default function ListingBadges({ status, visibility }: Props) {
  return (
    <>
      <StatusChip status={status} />
      <StatusChip status={visibility} />
    </>
  );
}
