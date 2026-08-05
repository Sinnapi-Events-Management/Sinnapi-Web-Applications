import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import { formatDateTime, formatRelative } from '@/lib/config';
import type { BlockedAccountModel } from '@/lib/types';

/**
 * Failed attempts in the current window, and when the last one was.
 *
 * A suspension has no attempts behind it — it was a deliberate admin action —
 * so it reads as a dash rather than zero. Zero would imply we counted and found
 * none, which is a different and wrong statement.
 */
export default function AttemptsCell({ row }: { row: BlockedAccountModel }) {
  if (row.kind !== 'locked_out' || row.attempt_count == null) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Stack>
      <Typography variant="body2" fontWeight={600}>
        {row.attempt_count}
      </Typography>
      <Tooltip
        title={
          row.first_attempt_at
            ? `First: ${formatDateTime(row.first_attempt_at)} · Last: ${formatDateTime(row.last_attempt_at)}`
            : formatDateTime(row.last_attempt_at)
        }
      >
        <Typography variant="caption" color="text.secondary" noWrap>
          {formatRelative(row.last_attempt_at)}
        </Typography>
      </Tooltip>
    </Stack>
  );
}
