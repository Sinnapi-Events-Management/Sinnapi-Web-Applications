'use client';
import { Stack, Typography } from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlaceIcon from '@mui/icons-material/Place';
import { Alert } from './Alert';
import { InfoRow } from './InfoRow';
import { PaymentTermsChip } from './PaymentTermsChip';
import { formatDay } from './datetime';

/** The event a booking hangs off, as much of it as any portal may read. */
export type EventContextLike = {
  title?: string | null;
  event_date?: string | null;
  location?: string | null;
  /** A rail set across the whole event, which outranks the booking's own. */
  payment_type?: string | null;
  payment_terms_note?: string | null;
};

export type EventContextRowsProps = {
  event: EventContextLike;
  /**
   * `bookings.payment_terms_from_event` — whether this booking's rail was
   * inherited rather than chosen. The one fact on this card that changes what
   * either party can do next, so it is stated rather than implied.
   */
  termsFromEvent?: boolean | null;
  /** Who is reading, which decides only whose freedom the notice describes. */
  perspective: 'client' | 'vendor' | 'admin';
};

/**
 * The event this booking belongs to.
 *
 * A booking made from a marketplace request is one of several a client is
 * arranging for one occasion, and reading it without that context invites the
 * question "which event was this for?" on every visit.
 *
 * Its real weight is the inherited terms. Where an event sets a payment rail,
 * a booking under it cannot renegotiate — the vendor has no counter to offer
 * and the client has no choice to make — and a page that shows the locked
 * outcome without the reason produces exactly one support thread per booking.
 */
export function EventContextRows({ event, termsFromEvent, perspective }: EventContextRowsProps) {
  return (
    <Stack spacing={1.5}>
      <Stack>
        <InfoRow label="Event" icon={<CelebrationIcon />} value={event.title} />
        {event.event_date && (
          <InfoRow
            label="Event date"
            icon={<CalendarMonthIcon />}
            value={formatDay(event.event_date)}
          />
        )}
        {event.location && <InfoRow label="Location" icon={<PlaceIcon />} value={event.location} />}
        {termsFromEvent && event.payment_type && (
          <InfoRow
            label="Terms set by event"
            value={<PaymentTermsChip rail={event.payment_type} status="accepted" />}
          />
        )}
      </Stack>

      {termsFromEvent && (
        <Alert severity="info" variant="outlined">
          {INHERITED_TERMS_NOTE[perspective]}
        </Alert>
      )}

      {event.payment_terms_note && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          &ldquo;{event.payment_terms_note}&rdquo;
        </Typography>
      )}
    </Stack>
  );
}

const INHERITED_TERMS_NOTE: Record<EventContextRowsProps['perspective'], string> = {
  client:
    'You set these payment terms on the event itself, so they apply to every booking under it. ' +
    'Your vendor cannot propose different ones here.',
  vendor:
    'The client set these payment terms on the event, so they apply to every booking under it. ' +
    'There is nothing to counter on this booking — the terms came with the request.',
  admin:
    'The rail was inherited from the event, not negotiated on this booking. Neither party could ' +
    'have chosen otherwise here, which is usually what a complaint about it is really about.',
};
