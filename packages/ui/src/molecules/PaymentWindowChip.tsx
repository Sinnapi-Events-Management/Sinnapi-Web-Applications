'use client';
import { Chip, Tooltip } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useNow } from '../data/useNow';
import {
  paymentWindowCopy,
  readPaymentWindow,
  type PaymentWindowAudience,
  type PaymentWindowBooking,
} from './paymentWindow';

export type PaymentWindowChipProps = {
  /** A booking row, in the database's own column names. */
  booking: PaymentWindowBooking;
  /** `escrow_transactions.status` when the caller has it — a second opinion on
   *  whether the money is in, since the escrow row and `payment_settled_at`
   *  are written by different paths. */
  escrowStatus?: string | null;
  /** Whose voice the tooltip speaks in. */
  audience: PaymentWindowAudience;
  size?: 'small' | 'medium';
  /**
   * Draw nothing when the booking has no clock, instead of a neutral chip.
   * The default for table columns, where a dash per off-platform row is noise.
   */
  hideWhenNotApplicable?: boolean;
};

/**
 * Where a booking's payment stands, in one chip.
 *
 * Rendered in all three portals — the client scanning their bookings, the
 * vendor looking for the date nobody has paid for, and the console working the
 * unpaid queue — for the reason `PaymentTermsChip` is: a chip that meant
 * something slightly different in each of them is worse than no chip.
 *
 * It ticks. A countdown that goes stale on a page left open is the one thing a
 * countdown must not do, and this is the surface most likely to be sitting on a
 * second monitor when a deadline passes.
 */
export function PaymentWindowChip({
  booking,
  audience,
  escrowStatus,
  size = 'small',
  hideWhenNotApplicable = true,
}: PaymentWindowChipProps) {
  // Only tick while something is actually counting down. A settled or
  // off-platform booking costs nothing.
  const isLive = booking.payment_type === 'escrow' && booking.status === 'confirmed';
  const now = useNow(60_000, isLive);

  const window = readPaymentWindow(booking, { escrowStatus, now });

  if (window.state === 'not_applicable' && hideWhenNotApplicable) return null;
  if (window.state === 'not_applicable') {
    return <Chip size={size} variant="outlined" label="—" />;
  }

  const copy = paymentWindowCopy(window, audience);

  return (
    <Tooltip title={copy.detail}>
      <Chip
        size={size}
        variant={window.state === 'awaiting' ? 'outlined' : 'filled'}
        color={
          copy.tone === 'error'
            ? 'error'
            : copy.tone === 'warning'
              ? 'warning'
              : copy.tone === 'success'
                ? 'success'
                : copy.tone === 'info'
                  ? 'info'
                  : 'default'
        }
        icon={
          window.state === 'paid' ? (
            <TaskAltIcon />
          ) : window.isPastDue ? (
            <ErrorOutlineIcon />
          ) : (
            <ScheduleIcon />
          )
        }
        label={copy.label}
      />
    </Tooltip>
  );
}
