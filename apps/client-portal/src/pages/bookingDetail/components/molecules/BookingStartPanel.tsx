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
 * withheld case keeps the button and spends the space beside it on the reason.
 *
 * Button and note sit side by side from `sm` up because this lives in the
 * action bar pinned above the tabs, where vertical space is the page's
 * scarcest: every row here is a row of the booking itself pushed down.
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
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ minWidth: 0 }}
    >
      <Button
        variant="contained"
        startIcon={<PlayCircleOutlineIcon />}
        onClick={onStart}
        disabled={!canStart || isBusy}
        sx={{ flexShrink: 0 }}
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
