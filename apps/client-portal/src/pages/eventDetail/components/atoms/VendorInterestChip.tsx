import { Chip } from '@sinnapi/ui';
import type { EventVendorModel } from '@/lib/types';

type Status = EventVendorModel['interest_status'];

/**
 * How a vendor came to be on this event, and where the client left them.
 *
 * Its own chip rather than `StatusChip`, for the same reason the budget states
 * are: `statusColor` is keyed by value, and `declined` there means a client
 * rejected a PRICE. Here it means the client passed on a vendor — related, but
 * the card already carries a `StatusChip` for the quote beside this one, and two
 * chips reading "Declined" in the same red would say the price and the vendor
 * were refused as one act.
 *
 * `invited` reads as gold rather than neutral because it is the one state that
 * is waiting on somebody else: the client has asked and the vendor has not
 * answered, which is the row they may want to chase.
 */
export default function VendorInterestChip({ status }: { status: Status }) {
  if (!status) return null;

  switch (status) {
    case 'shortlisted':
      return <Chip size="small" color="secondary" label="Shortlisted" />;
    case 'interested':
      return <Chip size="small" color="info" variant="outlined" label="Interested" />;
    case 'invited':
      return <Chip size="small" color="secondary" variant="outlined" label="Invited" />;
    case 'declined':
      return <Chip size="small" variant="outlined" label="Passed on" />;
    case 'withdrawn':
      return <Chip size="small" variant="outlined" label="Withdrew" />;
    default:
      return null;
  }
}
