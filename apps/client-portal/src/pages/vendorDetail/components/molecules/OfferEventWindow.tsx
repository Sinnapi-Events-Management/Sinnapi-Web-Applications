import { Stack, Typography } from '@sinnapi/ui';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { formatOfferWindow, offerDateWindow } from '@sinnapi/ui/offers';
import type { VendorOfferModel } from '@/lib/types';

type Props = { offer: VendorOfferModel };

/**
 * The days an event has to fall on for this offer to hold.
 *
 * NOT THE SAME AS THE DEADLINE ON THE CHIP
 * The chip says when the offer stops being claimable. This says which event
 * dates it covers, and a client planning a December wedding against a campaign
 * that ends in September needs the second sentence rather than the first. Today
 * both come from the same two timestamps — `offerDateWindow` is the browser's
 * mirror of `discount_event_window` in SQL — but they are different questions,
 * and the trigger on `bookings.event_date` enforces this one long after the
 * claim window has closed. A client who books a date the database is going to
 * refuse found that out at the booking screen; now they find out here.
 *
 * Renders nothing when the offer is open-ended at either end. A half-stated
 * window is worse than none: "covers events from 1 September" invites the
 * reader to supply the missing half themselves.
 */
export default function OfferEventWindow({ offer }: Props) {
  const window = offerDateWindow(offer);
  if (!window) return null;

  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-start">
      <EventAvailableOutlinedIcon
        sx={{ fontSize: 15, color: 'text.disabled', mt: '2px', flexShrink: 0 }}
      />
      <Typography variant="caption" color="text.secondary">
        Covers events between {formatOfferWindow(window)}
      </Typography>
    </Stack>
  );
}
