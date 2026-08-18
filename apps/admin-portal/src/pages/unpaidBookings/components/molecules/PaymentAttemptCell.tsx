import { Chip, Tooltip, Typography } from '@sinnapi/ui';
import type { UnpaidBookingModel } from '@/lib/types';

type Props = { booking: UnpaidBookingModel };

/**
 * Whether this client has actually tried to pay.
 *
 * The column this queue exists for. "Confirmed and unfunded" covers two people
 * who need opposite things: the client who opened a checkout and hit a failure
 * — whose card was declined, or whose mobile money timed out — and the client
 * who has not touched it. The first needs somebody to ask what went wrong; the
 * second needs a reminder. Sending a reminder to the first is how a platform
 * tells a frustrated customer it has not been paying attention.
 *
 * `escrow_status` is left-joined on purpose, so `null` genuinely means "no
 * checkout was ever opened" rather than "we did not look".
 */
export default function PaymentAttemptCell({ booking }: Props) {
  const attempts = booking.escrow_attempt_no ?? 0;

  if (!booking.escrow_status) {
    return (
      <Tooltip title="This client has never opened a checkout for this booking. A reminder is the right first step.">
        <Typography variant="body2" color="text.secondary">
          Never started
        </Typography>
      </Tooltip>
    );
  }

  if (booking.escrow_status === 'failed') {
    return (
      <Tooltip
        title={`A payment was attempted and did not go through${
          attempts > 1 ? ` (${attempts} attempts)` : ''
        }. Worth asking what happened rather than only chasing.`}
      >
        <Chip size="small" color="error" variant="outlined" label="Payment failed" />
      </Tooltip>
    );
  }

  // 'initiated' — a checkout was opened and abandoned, or is still in flight at
  // the provider. Both are "they are trying", which is a different conversation
  // from "they have not begun".
  return (
    <Tooltip
      title={`Checkout opened but not completed${
        attempts > 1 ? ` — ${attempts} attempts so far` : ''
      }. They may still be paying, or may have hit a problem.`}
    >
      <Chip size="small" color="warning" variant="outlined" label="Started, not finished" />
    </Tooltip>
  );
}
