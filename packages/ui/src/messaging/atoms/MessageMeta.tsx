'use client';
import { Box, Tooltip, Typography, alpha } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DoneIcon from '@mui/icons-material/Done';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { formatClockTime } from '../format';

export type MessageMetaProps = {
  createdAt: string | null;
  editedAt?: string | null;
  /** Only own messages show a delivery state — you cannot "deliver" to yourself. */
  mine: boolean;
  pending?: boolean;
  failed?: boolean;
  /**
   * `onAccent` when this sits inside the sender's coloured bubble, where the
   * disabled ink it uses elsewhere would be invisible.
   */
  tone?: 'default' | 'onAccent';
};

/**
 * Time sent, an edited marker, and — on your own messages — whether it left.
 *
 * WHY IT LIVES INSIDE THE BUBBLE
 * It used to sit on its own row underneath, which cost a line of vertical
 * rhythm per message and, worse, dragged the avatar out of line: the row was
 * bottom-aligned, so the avatar aligned to the bottom of the *timestamp* and
 * ended up floating below the bubble it belonged to, next to an orphaned
 * "14:38" hanging in the left gutter. Tucked into the trailing edge of the
 * bubble it is where every messaging app has taught people to look for it, the
 * avatar lines up with the bubble, and a run of short replies stops being twice
 * as tall as the words in it.
 *
 * The delivery state is three-valued rather than a boolean. An optimistic
 * bubble appears instantly, so without a distinct "sending" tick the sender
 * cannot tell a message that has committed from one still in flight on a bad
 * connection, and both look identical to one that has already failed.
 */
export function MessageMeta({
  createdAt,
  editedAt,
  mine,
  pending,
  failed,
  tone = 'default',
}: MessageMetaProps) {
  const time = formatClockTime(createdAt);
  const ink =
    tone === 'onAccent'
      ? (t: { palette: { secondary: { contrastText: string } } }) =>
          alpha(t.palette.secondary.contrastText, 0.72)
      : 'text.disabled';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        // Never the thing that wraps: the stamp belongs to the last line of the
        // message, not to a line of its own.
        flexShrink: 0,
        whiteSpace: 'nowrap',
        // Sits on the bubble's floor rather than the text's baseline, so a
        // one-line message and a five-line one stamp at the same place.
        pb: 0.25,
        ml: 'auto',
        color: ink,
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 11.5, color: 'inherit', lineHeight: 1 }}>
        {time}
      </Typography>

      {editedAt && (
        <Tooltip title="This message was edited">
          <Typography variant="caption" sx={{ fontSize: 11.5, color: 'inherit', lineHeight: 1 }}>
            · edited
          </Typography>
        </Tooltip>
      )}

      {mine && failed && (
        <Tooltip title="Not sent — tap to retry">
          <ErrorOutlineIcon
            sx={{ fontSize: 14, color: 'error.main' }}
            aria-label="Failed to send"
          />
        </Tooltip>
      )}
      {mine && pending && !failed && (
        <Tooltip title="Sending…">
          <ScheduleIcon sx={{ fontSize: 13, color: 'inherit' }} aria-label="Sending" />
        </Tooltip>
      )}
      {mine && !pending && !failed && (
        <Tooltip title="Sent">
          <DoneIcon sx={{ fontSize: 14, color: 'inherit' }} aria-label="Sent" />
        </Tooltip>
      )}
    </Box>
  );
}
