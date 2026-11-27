import { Link as RouterLink } from 'react-router-dom';
import {
  BookingActionDialog,
  Box,
  Button,
  Card,
  CardContent,
  PaymentRailChoice,
  Stack,
  Typography,
  alpha,
  bookingActionSpec,
  type BookingAction,
} from '@sinnapi/ui';
import ChatIcon from '@mui/icons-material/Chat';
import { FEATURES } from '@sinnapi/utils/constants';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useBookingActions } from '../../hooks/useBookingActions';
import { useBookingNextStep } from '../../hooks/useBookingNextStep';
import type { NextStep } from '../../utils/nextStep';
import ProgressSteps from '@/components/progress/ProgressSteps';
import StickyPhoneAction from '@/components/progress/StickyPhoneAction';
import { useAnchorVisible } from '@/components/progress/useAnchorVisible';
import BookingRequestSummary from '../molecules/BookingRequestSummary';

type Props = {
  booking: VendorBookingDetailModel;
  timeWindow: string | null;
  /** Opens the Money tab — where payout requests and offers are answered. */
  onOpenMoney: () => void;
};

/** Shorter, plainer button words than the shared spec's, for the vendor. */
const SECONDARY_LABEL: Partial<Record<BookingAction, string>> = {
  counter: 'Ask for other payment terms',
  decline: 'Decline',
};

const TONE: Record<NextStep['tone'], 'secondary' | 'info' | 'success' | 'error'> = {
  todo: 'secondary',
  waiting: 'info',
  ok: 'success',
  stopped: 'error',
};

/**
 * "What to do now": where the booking is, one sentence on what it needs, and
 * one main button. Replaces the old "Actions" panel, which listed every
 * transition and then, on a finished booking, a sentence saying there was
 * nothing to do.
 *
 * On a phone the main button also sticks above the bottom bar once the card
 * has scrolled away, so the vendor never has to scroll back up to act.
 */
export default function BookingNextStepCard({ booking, timeWindow, onOpenMoney }: Props) {
  const actions = useBookingActions(booking);
  const step = useBookingNextStep(booking, actions);
  const color = TONE[step.tone];

  const { ref: anchor, visible: anchorVisible } = useAnchorVisible<HTMLDivElement>(step.primary);

  const primaryColor =
    step.primary?.kind === 'action' && step.primary.action === 'accept' ? 'success' : 'secondary';

  const runPrimary = () => {
    if (!step.primary) return;
    if (step.primary.kind === 'money') onOpenMoney();
    else actions.request(step.primary.action);
  };

  const blocked = actions.actions.filter(
    (a) => a.disabled && a.blockedReason && step.secondary.includes(a.action),
  );

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 3,
          borderColor: (t) => alpha(t.palette[color].main, 0.5),
          borderTopWidth: 4,
          borderTopColor: `${color}.main`,
          // Charcoal dark mode spends colour sparingly: a neutral hairline frame
          // with the tone kept only as a thin top accent, so the card reads as a
          // panel rather than a gold-outlined box.
          '[data-mui-color-scheme="dark"] &': {
            borderColor: 'divider',
            borderTopWidth: 2,
            borderTopColor: (t) => alpha(t.palette[color].main, 0.85),
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <ProgressSteps steps={step.steps} current={step.current} ariaLabel="Booking progress" />

          <Typography variant="overline" color={`${color}.dark`} sx={{ lineHeight: 1.4 }}>
            {step.tone === 'todo' ? 'What to do now' : 'Where things stand'}
          </Typography>
          <Typography
            variant="h6"
            component="h2"
            fontWeight={700}
            sx={{ lineHeight: 1.3, fontSize: { xs: '1.3rem', sm: '1.45rem' } }}
          >
            {step.title}
          </Typography>
          {step.body && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, mb: 2 }}>
              {step.body}
            </Typography>
          )}

          {booking.status === 'requested' && !actions.terms.awaitingClient && (
            <BookingRequestSummary booking={booking} timeWindow={timeWindow} />
          )}

          <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}>
            {step.primary && (
              <Box ref={anchor} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="contained"
                  color={primaryColor}
                  size="large"
                  fullWidth
                  onClick={runPrimary}
                  disabled={actions.isBusy}
                  sx={{ minHeight: 48, px: 3 }}
                >
                  {step.primary.label}
                </Button>
              </Box>
            )}
            {step.secondary.map((a) => (
              <Button
                key={a}
                variant="outlined"
                color={a === 'decline' ? 'error' : 'inherit'}
                onClick={() => actions.request(a)}
                disabled={actions.isBusy}
                sx={{ minHeight: 44 }}
              >
                {SECONDARY_LABEL[a] ?? bookingActionSpec(a).label}
              </Button>
            ))}
            {FEATURES.clientVendorMessaging && (
              <Button
                component={RouterLink}
                to="/messages"
                variant="text"
                startIcon={<ChatIcon />}
                sx={{ minHeight: 44, ml: { sm: 'auto' } }}
              >
                Message client
              </Button>
            )}
          </Stack>

          {blocked.map((a) => (
            <Typography key={a.action} variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {a.blockedReason}
            </Typography>
          ))}
        </CardContent>
      </Card>

      <StickyPhoneAction show={!!step.primary && !anchorVisible}>
        <Button
          variant="contained"
          color={primaryColor}
          size="large"
          fullWidth
          onClick={runPrimary}
          disabled={actions.isBusy}
          sx={{ minHeight: 48 }}
        >
          {step.primary?.label}
        </Button>
      </StickyPhoneAction>

      <BookingActionDialog
        action={actions.pending}
        reference={booking.reference_no}
        reason={actions.reason}
        onReasonChange={actions.setReason}
        busy={actions.isBusy}
        error={actions.error}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
        disableConfirm={actions.isIncomplete}
        extra={
          actions.pending === 'counter' && actions.terms.proposed ? (
            <PaymentRailChoice
              value={actions.counter}
              onChange={actions.setCounter}
              actor="vendor"
              exclude={[actions.terms.proposed]}
              disabled={actions.isBusy}
            />
          ) : undefined
        }
      />
    </>
  );
}
