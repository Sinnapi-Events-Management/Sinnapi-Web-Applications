import { IconButton, Stack, Tooltip } from '@sinnapi/ui';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import {
  availablePaymentChaseActions,
  readPaymentWindow,
  type PaymentChaseAction,
} from '@sinnapi/ui';
import type { UnpaidBookingModel } from '@/lib/types';

const ICONS: Record<PaymentChaseAction, React.ReactNode> = {
  nudge: <NotificationsActiveIcon fontSize="small" />,
  extend: <MoreTimeIcon fontSize="small" />,
  cancel: <EventBusyIcon fontSize="small" />,
};

type Props = {
  booking: UnpaidBookingModel;
  onSelect: (action: PaymentChaseAction, booking: UnpaidBookingModel) => void;
  disabled?: boolean;
};

/**
 * The chase controls on a queue row.
 *
 * Which controls appear comes from `availablePaymentChaseActions`, the same
 * rule the vendor portal and the booking detail use — so an operator is never
 * offered a cancel the server is about to refuse, and never offered one on a
 * booking whose deadline passed two minutes ago and whose payment may still be
 * settling at the provider.
 *
 * Icon buttons rather than labelled ones because this is a dense table where
 * three text buttons per row would out-weigh the data. Every one carries a
 * tooltip, and the confirmation dialog behind each states the consequence in
 * full — the abbreviation is in the trigger, never in the decision.
 */
export default function UnpaidRowActions({ booking, onSelect, disabled }: Props) {
  // Read from the row's own columns rather than from `effective_due_at` alone:
  // the difference between a passed clock and a flagged one is what gates the
  // cancel button, and only `payment_overdue_at` carries it.
  const window = readPaymentWindow({
    status: booking.status,
    payment_type: 'escrow',
    payment_due_at: booking.payment_due_at,
    payment_due_override_at: booking.payment_due_override_at,
    payment_overdue_at: booking.payment_overdue_at,
    payment_settled_at: null,
  });

  const actions = availablePaymentChaseActions(window, 'admin');
  if (!actions.length) return null;

  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      {actions.map((spec) => (
        <Tooltip key={spec.action} title={spec.label}>
          <span>
            <IconButton
              size="small"
              color={spec.tone === 'error' ? 'error' : 'default'}
              disabled={disabled}
              onClick={(e) => {
                // The row itself opens the booking. Without this, chasing a
                // client navigates away from the queue mid-decision.
                e.stopPropagation();
                onSelect(spec.action, booking);
              }}
              aria-label={spec.label}
            >
              {ICONS[spec.action]}
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </Stack>
  );
}
