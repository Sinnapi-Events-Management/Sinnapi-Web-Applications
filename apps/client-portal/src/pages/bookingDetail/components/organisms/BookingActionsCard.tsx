import { BookingActionDialog, SectionCard } from '@sinnapi/ui';
import BoltIcon from '@mui/icons-material/Bolt';
import type { BookingDetailModel } from '@/lib/types';
import { useBookingActions } from '../../hooks/useBookingActions';
import BookingStartPanel from '../molecules/BookingStartPanel';

type Props = { booking: BookingDetailModel };

/**
 * What the client can do about this booking's state right now.
 *
 * Deliberately separate from "Next steps", which is a set of links to other
 * pages. This card holds the one control that changes the booking itself, and
 * mixing a status write in among navigation is how someone taps it without
 * meaning to.
 *
 * Layout only — `useBookingActions` owns the gating, the write and the
 * confirmation state; `BookingActionDialog` owns the modal.
 */
export default function BookingActionsCard({ booking }: Props) {
  const actions = useBookingActions(booking);

  if (!actions.hasActions) return null;

  return (
    <SectionCard
      title={actions.isUnderway ? 'In progress' : 'Your event'}
      icon={<BoltIcon />}
      accent={actions.canStart ? 'secondary' : 'info'}
      subtitle={actions.canStart ? 'Today is the day — mark your event as under way' : undefined}
    >
      <BookingStartPanel
        canStart={actions.canStart}
        blockedReason={actions.startBlockedReason}
        isUnderway={actions.isUnderway}
        isBusy={actions.isBusy}
        onStart={() => actions.request('start')}
      />

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
