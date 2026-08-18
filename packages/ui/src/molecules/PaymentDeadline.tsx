'use client';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useNow } from '../data/useNow';
import { formatTimestamp } from './datetime';
import {
  formatDeadlineDistance,
  paymentWindowCopy,
  readPaymentWindow,
  type PaymentWindowAudience,
  type PaymentWindowBooking,
} from './paymentWindow';

export type PaymentDeadlineProps = {
  /** A booking row, in the database's own column names. */
  booking: PaymentWindowBooking;
  audience: PaymentWindowAudience;
  /** `escrow_transactions.status` when the caller has it — see PaymentWindowChip. */
  escrowStatus?: string | null;
  /** Extra controls — a reminder button, a cancel button — laid out beneath. */
  children?: React.ReactNode;
};

/**
 * The payment deadline as a block: what the state is, when the clock runs out,
 * and how long that is from now.
 *
 * One component for all three portals, with the sentences coming from
 * `paymentWindowCopy` rather than from here — see that module for why the
 * audience is a parameter and not a fork.
 *
 * The absolute time and the relative one are both shown, always. A client
 * reading "6 hours left" needs to know whether that lands tonight or during
 * tomorrow's working day before they can act on it, and a vendor deciding
 * whether to release a date needs the timestamp they will later be asked to
 * justify — neither of which a countdown alone gives them.
 */
export function PaymentDeadline({
  booking,
  audience,
  escrowStatus,
  children,
}: PaymentDeadlineProps) {
  const isLive = booking.payment_type === 'escrow' && booking.status === 'confirmed';
  const now = useNow(60_000, isLive);

  const window = readPaymentWindow(booking, { escrowStatus, now });
  if (window.state === 'not_applicable' || window.state === 'cancelled') return null;

  const copy = paymentWindowCopy(window, audience);

  // Paid is a one-line reassurance, not a deadline block. Keeping it here
  // rather than in the caller means a page does not have to remember to stop
  // rendering the countdown once the money lands.
  if (window.state === 'paid') {
    return <Alert severity="success">{copy.detail}</Alert>;
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          icon={window.isPastDue ? <EventBusyIcon /> : <ScheduleIcon />}
          color={copy.tone === 'error' ? 'error' : copy.tone === 'warning' ? 'warning' : 'default'}
          variant={window.state === 'awaiting' ? 'outlined' : 'filled'}
          label={copy.label}
        />
        <Typography
          variant="caption"
          color={window.isPastDue ? 'error.main' : 'text.secondary'}
          sx={{ fontWeight: 600 }}
        >
          {formatDeadlineDistance(window)}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {window.isPastDue ? 'Was due' : 'Due'}{' '}
          {formatTimestamp(new Date(window.dueAt!).toISOString())}
        </Typography>
      </Stack>

      <Alert severity={copy.tone === 'default' ? 'info' : copy.tone}>{copy.detail}</Alert>

      {/* An admin's extension is stated rather than silently folded into the
          deadline. A vendor whose date moved is owed the fact that a person
          moved it, not just a different number than they saw yesterday. */}
      {window.isExtended && (
        <Typography variant="caption" color="text.secondary">
          This deadline was extended by our team.
        </Typography>
      )}

      {children}
    </Stack>
  );
}
