import { Link as RouterLink } from 'react-router-dom';
import { BookingActionDialog, Box, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import BoltIcon from '@mui/icons-material/Bolt';
import ChatIcon from '@mui/icons-material/Chat';
import type { BookingDetailModel } from '@/lib/types';
import { useBookingActions } from '../../hooks/useBookingActions';
import BookingStartPanel from '../molecules/BookingStartPanel';

type Props = { booking: BookingDetailModel };

/**
 * What the client can do about this booking right now: the one status write
 * that applies to its current state, and the way to reach the vendor without
 * one.
 *
 * Pinned above the tabs rather than filed inside one of them. Marking an event
 * under way is time-critical — a client does it on the morning of the event,
 * usually on a phone — and messaging the vendor is what someone reaches for
 * when anything on this page surprises them. Neither should be a tab away.
 *
 * The two are still visually separate: the status write changes the booking,
 * the message link goes to another page, and mixing them into one row of equal
 * buttons is how someone taps the wrong one. Message stays a quiet text button
 * on the far side of the bar.
 *
 * Layout only — `useBookingActions` owns the gating, the write and the
 * confirmation state; `BookingActionDialog` owns the modal.
 */
export default function BookingActionBar({ booking }: Props) {
  const actions = useBookingActions(booking);

  return (
    <SectionCard
      title={actions.isUnderway ? 'In progress' : actions.hasActions ? 'Your event' : 'Actions'}
      icon={<BoltIcon />}
      accent={actions.canStart ? 'secondary' : 'info'}
      subtitle={actions.canStart ? 'Today is the day — mark your event as under way' : undefined}
      sx={{ mb: 3 }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {/* A request still awaiting the vendor has nothing to start, and a
              settled booking has nothing left. Both say so rather than leaving
              the space blank, which reads as a panel that failed to load. */}
          {actions.hasActions ? (
            <BookingStartPanel
              canStart={actions.canStart}
              blockedReason={actions.startBlockedReason}
              isUnderway={actions.isUnderway}
              isBusy={actions.isBusy}
              onStart={() => actions.request('start')}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              There is nothing to do here right now — your vendor moves this booking on from their
              side.
            </Typography>
          )}
        </Box>

        {/* Never gated: reaching the vendor is available in every state,
            including the ones with no action left. */}
        <Button
          component={RouterLink}
          to="/messages"
          variant="text"
          startIcon={<ChatIcon />}
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, flexShrink: 0 }}
        >
          Message vendor
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
      />
    </SectionCard>
  );
}
