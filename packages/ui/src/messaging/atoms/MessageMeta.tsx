'use client';
import { Stack, Typography, Tooltip } from '@mui/material';
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
};

/**
 * The footer line under a bubble: time sent, an edited marker, and — on your
 * own messages — whether it actually left.
 *
 * The delivery state is three-valued rather than a boolean. An optimistic
 * bubble appears instantly, so without a distinct "sending" tick the sender
 * cannot tell a message that has committed from one still in flight on a bad
 * connection, and both look identical to one that has already failed.
 */
export function MessageMeta({ createdAt, editedAt, mine, pending, failed }: MessageMetaProps) {
  const time = formatClockTime(createdAt);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      justifyContent={mine ? 'flex-end' : 'flex-start'}
      sx={{ mt: 0.25, px: 0.5 }}
    >
      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10.5 }}>
        {time}
      </Typography>

      {editedAt && (
        <Tooltip title="This message was edited">
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10.5 }}>
            · edited
          </Typography>
        </Tooltip>
      )}

      {mine && failed && (
        <Tooltip title="Not sent — tap to retry">
          <ErrorOutlineIcon
            sx={{ fontSize: 13, color: 'error.main' }}
            aria-label="Failed to send"
          />
        </Tooltip>
      )}
      {mine && pending && !failed && (
        <Tooltip title="Sending…">
          <ScheduleIcon sx={{ fontSize: 12, color: 'text.disabled' }} aria-label="Sending" />
        </Tooltip>
      )}
      {mine && !pending && !failed && (
        <Tooltip title="Sent">
          <DoneIcon sx={{ fontSize: 13, color: 'text.disabled' }} aria-label="Sent" />
        </Tooltip>
      )}
    </Stack>
  );
}
