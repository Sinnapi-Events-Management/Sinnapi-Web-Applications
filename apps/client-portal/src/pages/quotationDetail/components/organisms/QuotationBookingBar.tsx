import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, SectionCard, Skeleton, Stack, StatusChip, Typography } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatDate } from '@/lib/config';
import { formatTimeWindow } from '@/pages/bookingDetail/utils/timeWindow';
import type { QuotationBookingState } from '../../hooks/useQuotationBooking';

type Props = { booking: QuotationBookingState };

/**
 * The one thing left to do once a quote is agreed, pinned above the tabs.
 *
 * IT IS HERE BECAUSE CLIENTS COULD NOT FIND IT. "Create booking" lived on a
 * card in Progress — the fifth and last tab, the one furthest right on a bar
 * that scrolls on a phone, and the only tab described to the client as a
 * record. So the single step between an accepted quote and a date on the
 * vendor's calendar was two taps behind a label that says "history". Accepting
 * a quote is not the end of the flow; it is the middle of it, and the page has
 * to say so where the client is already looking.
 *
 * It takes the slot the response bar vacates, which is what makes the sequence
 * read. Accepting is the last client action a quote offers — `accepted` is
 * settled, so `QuotationActionBar` renders nothing from that moment — and this
 * bar appears in the same place at the same moment. "Your response" becomes
 * "Your booking": one bar above the tabs that always holds whatever is
 * outstanding.
 *
 * Both routes to `accepted` land here, which is the point of gating on the
 * status rather than on who moved it. A bespoke quote reaches it when the
 * client accepts the vendor's price; a package order reaches it when the vendor
 * confirms the client's order. Two different parties act, the same step is
 * owed, and the client should not have to know which flow they are in to find
 * it.
 *
 * Deliberately NOT the whole booking card. The card in Progress keeps the
 * record — the reference, the status chip, the released-booking warning — and
 * this bar keeps only what is outstanding, so the page has one primary button
 * and not two shouting at each other. The booked state is a quiet link here
 * rather than a call to action, because at that point the outstanding thing is
 * payment and that has a tab of its own.
 *
 * Layout only — `useQuotationBooking` owns the reads, the gating and the
 * dialog's open state, and the page mounts the dialog itself.
 */
export default function QuotationBookingBar({ booking }: Props) {
  const { booking: made, stage, isLoading, canCreate, blockedBy, openDialog } = booking;

  // Nothing is owed on a quote nobody has agreed to, and a bar that says so
  // would be a heading over an explanation of a state the client is not in.
  if (stage === 'not-accepted') return null;

  // A cancelled booking cannot be re-made — the partial unique index still
  // counts it — so there is no action to pin. The card in Progress carries that
  // explanation, where it belongs with the dead booking it is about.
  if (stage === 'released') return null;

  // Still resolving whether a booking exists. A button here would flash and
  // then be replaced by a link to a booking that already existed.
  if (isLoading) {
    return <Skeleton variant="rounded" height={132} sx={{ mb: 3, borderRadius: 3 }} />;
  }

  if (made) {
    return (
      <SectionCard
        title="Your booking"
        icon={<EventAvailableIcon />}
        accent="primary"
        subtitle="This quote is scheduled"
        action={<StatusChip status={made.status} />}
        sx={{ mb: 3 }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
            {[
              made.reference_no,
              formatDate(made.event_date),
              formatTimeWindow(made.start_time, made.end_time),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<OpenInNewIcon />}
            component={RouterLink}
            to={`/bookings/${made.id}`}
            sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
          >
            Open booking
          </Button>
        </Stack>
      </SectionCard>
    );
  }

  /* An accepted quote with no price on it. Surfaced up here rather than left in
     the tab, because from the client's side this looks identical to the case
     above — the quote is agreed and nothing is being asked of them — and the
     difference is that this one needs them to go back to the vendor. */
  if (blockedBy === 'unpriced') {
    return (
      <SectionCard
        title="Your booking"
        icon={<EventAvailableIcon />}
        accent="warning"
        sx={{ mb: 3 }}
      >
        <Alert severity="warning">
          This quote has no price on it, so there is nothing to book yet. Ask your vendor to send
          the priced quote and you can schedule it then.
        </Alert>
      </SectionCard>
    );
  }

  if (!canCreate) return null;

  return (
    <SectionCard
      title="Your booking"
      icon={<EventAvailableIcon />}
      accent="success"
      subtitle="The price is agreed — now pick a date"
      sx={{ mb: 3 }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
          This quote is settled but not yet scheduled. Creating the booking sends the vendor your
          date and how you want to pay, so they can confirm all three.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="large"
          disableElevation
          startIcon={<EventAvailableIcon />}
          onClick={openDialog}
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
        >
          Create booking
        </Button>
      </Stack>
    </SectionCard>
  );
}
