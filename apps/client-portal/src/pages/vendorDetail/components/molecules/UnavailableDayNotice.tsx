import { Alert, AlertTitle, Button, Typography } from '@sinnapi/ui';
import { formatIsoDateLong } from '@sinnapi/ui';

type Props = {
  /** The taken day the client just asked about. */
  date: string;
  /** The first free day from today, if there is one to point at. */
  nextOpen: string | null;
  onDismiss: () => void;
  onTakeNextOpen: () => void;
};

/**
 * What tapping a taken day says back.
 *
 * Deliberately not a dialog: the client asked a question about a square on a
 * grid, and interrupting them with a modal to answer it is out of proportion.
 * It sits under the calendar, next to the thing it is about.
 *
 * The wording matches the request form's own warning on purpose. A blocked day
 * is the vendor's current plan, not a law — plenty would move things for the
 * right job — so this explains the odds rather than refusing the ask, and the
 * calendar never disables the day.
 */
export default function UnavailableDayNotice({ date, nextOpen, onDismiss, onTakeNextOpen }: Props) {
  return (
    <Alert
      severity="warning"
      onClose={onDismiss}
      sx={{ mt: 2 }}
      action={
        nextOpen ? (
          <Button size="small" color="inherit" onClick={onTakeNextOpen}>
            Use next open date
          </Button>
        ) : undefined
      }
    >
      <AlertTitle sx={{ mb: 0.25 }}>{formatIsoDateLong(date)} is unavailable</AlertTitle>
      <Typography variant="body2">
        The vendor is already committed on this day. You can still message them — they may be able
        to rearrange — but they are more likely to decline.
      </Typography>
    </Alert>
  );
}
