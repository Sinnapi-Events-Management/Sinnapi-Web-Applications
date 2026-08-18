import { InfoRow, Stack } from '@sinnapi/ui';
import { formatDateTime } from '@/lib/config';
import type { BookingPaymentWindowModel } from '@/lib/types';

type Props = { window: BookingPaymentWindowModel };

/**
 * The clock's own record: when it started, when it was due, whether anyone
 * moved it, and how often the client has been chased.
 *
 * Every row here exists to answer a question an operator gets asked rather
 * than one they browse. "Why was my date held four extra days" is answered by
 * the extension row and the name on it; "did you even tell them" is answered
 * by the chase count. A card that showed only the current deadline would leave
 * both of those to somebody's memory.
 *
 * The original deadline is shown alongside an extension rather than replaced
 * by it, because "extended to Friday" and "was due Tuesday, extended to
 * Friday" are different sentences and only the second one settles an argument.
 */
export default function PaymentWindowFacts({ window }: Props) {
  return (
    <Stack spacing={0}>
      <InfoRow label="Clock started" value={formatDateTime(window.opened_at)} />

      {window.override_at ? (
        <>
          <InfoRow label="Originally due" value={formatDateTime(window.due_at)} />
          <InfoRow label="Extended to" value={formatDateTime(window.override_at)} />
          <InfoRow label="Extended by" value={window.override_by ?? 'Unknown'} />
          {window.override_reason && (
            <InfoRow label="Reason given" value={window.override_reason} />
          )}
        </>
      ) : (
        <InfoRow label="Payment due" value={formatDateTime(window.due_at)} />
      )}

      {window.overdue_at && (
        <InfoRow label="Flagged overdue" value={formatDateTime(window.overdue_at)} />
      )}
      {window.settled_at && <InfoRow label="Paid" value={formatDateTime(window.settled_at)} />}

      <InfoRow
        label="Reminders sent by hand"
        value={
          window.nudge_count
            ? `${window.nudge_count}${window.last_nudge_at ? ` — last ${formatDateTime(window.last_nudge_at)}` : ''}`
            : 'None'
        }
      />
    </Stack>
  );
}
