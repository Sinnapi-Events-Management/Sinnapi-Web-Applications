import { Link as RouterLink } from 'react-router-dom';
import {
  BookingActionDialog,
  Box,
  Button,
  PaymentRailChoice,
  Stack,
  SectionCard,
  Typography,
} from '@sinnapi/ui';
import BoltIcon from '@mui/icons-material/Bolt';
import ChatIcon from '@mui/icons-material/Chat';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useBookingActions } from '../../hooks/useBookingActions';
import BookingActionButtons from '../molecules/BookingActionButtons';

type Props = {
  booking: VendorBookingDetailModel;
  /**
   * Whether the booking is still waiting on this vendor. An untouched request
   * is the one thing on the page that needs doing, so the bar takes the gold
   * accent then and stays neutral once the decision is made.
   */
  needsResponse: boolean;
};

/**
 * What the vendor can do about this booking: the status writes that apply to
 * its current state, plus the way to reach the client without one.
 *
 * Pinned above the tabs rather than filed inside one of them, and that is the
 * whole point of it. Accept, decline and counter are the reason a vendor opens
 * a request at all; a decision buried one tab deep is a decision they have to
 * go looking for. Everything else on the page is a record and can wait behind
 * a tab — this cannot.
 *
 * `useBookingActions` owns the RPCs, the gating, the in-flight state and the
 * cache invalidation; `BookingActionDialog` owns the confirmation. This bar
 * only decides where they sit and how loudly they ask for attention.
 */
export default function BookingActionBar({ booking, needsResponse }: Props) {
  const actions = useBookingActions(booking);

  return (
    <SectionCard
      title={needsResponse ? 'Respond to request' : 'Actions'}
      icon={<BoltIcon />}
      accent={needsResponse ? 'secondary' : 'info'}
      subtitle={needsResponse ? 'This request is waiting on you' : undefined}
      sx={{ mb: 3 }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {/* A settled booking — completed, cancelled, declined — has no status
              write left, and messaging is then the only thing this bar offers.
              It says so rather than leaving the space blank, which reads as a
              panel that failed to load. */}
          {actions.hasActions ? (
            <BookingActionButtons
              actions={actions.actions}
              isBusy={actions.isBusy}
              onSelect={actions.request}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              This booking is settled — there is nothing left to decide.
            </Typography>
          )}
        </Box>

        {/* Never gated and never the loudest thing here: reaching the client is
            available in every state, including the ones with no action left. */}
        <Button
          component={RouterLink}
          to="/messages"
          variant="text"
          startIcon={<ChatIcon />}
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, flexShrink: 0 }}
        >
          Message client
        </Button>
      </Stack>

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
        // Only the counter needs a control of its own: the vendor is naming a
        // rail, and the reason field below it explains that choice. Every other
        // action leaves the slot empty and the dialog unchanged.
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
    </SectionCard>
  );
}
