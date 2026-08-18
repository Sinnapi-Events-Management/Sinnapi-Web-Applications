import { ActionNote, Button, Stack, bookingActionSpec } from '@sinnapi/ui';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import BoltIcon from '@mui/icons-material/Bolt';
import LockClockIcon from '@mui/icons-material/LockClock';

type Props = {
  canStart: boolean;
  /** Why the action is withheld. Always present when `canStart` is false. */
  blockedReason: string | null;
  isUnderway: boolean;
  isBusy: boolean;
  onStart: () => void;
};

/**
 * The client's half of "this event is happening now".
 *
 * The button is never simply hidden when it does not apply. A client arriving
 * on the morning of their event expects to find it, and a panel that silently
 * omits it reads as a broken page rather than an unmet condition — so the
 * withheld case keeps the space and spends it on the reason instead.
 *
 * The label comes from the shared action spec rather than being written here.
 * This button opens `BookingActionDialog`, which reads that same spec for its
 * heading and confirm label, so a hardcoded label here is a button and a modal
 * naming the same transition two different ways the moment either is reworded.
 */
export default function BookingStartPanel({
  canStart,
  blockedReason,
  isUnderway,
  isBusy,
  onStart,
}: Props) {
  if (isUnderway) {
    return (
      <ActionNote icon={<BoltIcon />} tone="success">
        Your event is under way. Your vendor marks the booking complete once the service has been
        delivered.
      </ActionNote>
    );
  }

  return (
    <Stack spacing={1}>
      <Button
        variant="contained"
        size="large"
        startIcon={<PlayCircleOutlineIcon />}
        onClick={onStart}
        disabled={!canStart || isBusy}
      >
        {bookingActionSpec('start').label}
      </Button>
      {canStart ? (
        <ActionNote icon={<PlayCircleOutlineIcon />}>
          Marks your event as under way — it books nothing new. Your vendor sees it too, and either
          of you can do this.
        </ActionNote>
      ) : (
        blockedReason && (
          <ActionNote icon={<LockClockIcon />} tone="warning">
            {blockedReason}
          </ActionNote>
        )
      )}
    </Stack>
  );
}
