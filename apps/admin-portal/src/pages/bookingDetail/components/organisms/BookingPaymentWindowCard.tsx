import {
  Alert,
  Button,
  Divider,
  PaymentDeadline,
  SectionCard,
  Stack,
  availablePaymentChaseActions,
  readPaymentWindow,
  type PaymentChaseAction,
} from '@sinnapi/ui';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import type { BookingAdminModel } from '@/lib/types';
import PaymentWindowFacts from '../molecules/PaymentWindowFacts';

const ICONS: Record<PaymentChaseAction, React.ReactNode> = {
  nudge: <NotificationsActiveIcon />,
  extend: <MoreTimeIcon />,
  cancel: <EventBusyIcon />,
};

type Props = {
  booking: BookingAdminModel;
  canChase: boolean;
  onChase: (
    action: PaymentChaseAction,
    booking: { id: string; reference_no: string | null },
  ) => void;
  busy: boolean;
  error: string | null;
};

/**
 * The payment clock on one booking, and the three levers over it.
 *
 * Draws nothing at all when there is no window — an off-platform booking, or
 * one no vendor has confirmed — rather than an empty card explaining its own
 * absence. The console has enough cards.
 *
 * Once the money is in it collapses to the deadline block alone, which by then
 * is a single "paid" line. The facts and the levers go: an operator looking at
 * a funded booking has no decision to make here, and leaving a Cancel button
 * on screen next to money Sinnapi is holding is an invitation the server would
 * refuse but nobody should have been offered.
 *
 * Layout only. `useBookingDetail` owns the read and `usePaymentChase` the
 * writes.
 */
export default function BookingPaymentWindowCard({
  booking,
  canChase,
  onChase,
  busy,
  error,
}: Props) {
  const pw = booking.payment_window;
  if (!pw) return null;

  const window = readPaymentWindow({
    status: booking.status,
    payment_type: booking.payment_type,
    payment_due_at: pw.due_at,
    payment_due_override_at: pw.override_at,
    payment_overdue_at: pw.overdue_at,
    payment_settled_at: pw.settled_at,
  });

  // Filtered to what the server will accept, not to what an operator holds:
  // permission decides whether the buttons are drawn at all, the window
  // decides which of them are legal right now.
  const actions = canChase ? availablePaymentChaseActions(window, 'admin') : [];

  return (
    <SectionCard
      title="Payment window"
      icon={<HourglassBottomIcon />}
      accent={
        window.state === 'overdue' ? 'error' : window.state === 'paid' ? 'success' : 'warning'
      }
    >
      <Stack spacing={2}>
        <PaymentDeadline
          booking={{
            status: booking.status,
            payment_type: booking.payment_type,
            payment_due_at: pw.due_at,
            payment_due_override_at: pw.override_at,
            payment_overdue_at: pw.overdue_at,
            payment_settled_at: pw.settled_at,
          }}
          audience="admin"
        />

        {window.state !== 'paid' && (
          <>
            <Divider />
            <PaymentWindowFacts window={pw} />

            {error && <Alert severity="error">{error}</Alert>}

            {actions.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {actions.map((spec) => (
                  <Button
                    key={spec.action}
                    size="small"
                    variant={spec.action === 'cancel' ? 'text' : 'outlined'}
                    color={spec.tone}
                    startIcon={ICONS[spec.action]}
                    disabled={busy}
                    onClick={() =>
                      onChase(spec.action, { id: booking.id, reference_no: booking.reference_no })
                    }
                  >
                    {spec.label}
                  </Button>
                ))}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
