import { Box, Stack, Typography } from '@sinnapi/ui';
import { formatDateTime, formatMoney, titleize } from '@/lib/config';
import type { BookingActivityModel } from '@/lib/types';
import ActivityDot from '../atoms/ActivityDot';

type Props = {
  entry: BookingActivityModel;
  isLast: boolean;
};

/**
 * One entry on the trail: what happened, who caused it, when, and the amount
 * where one is involved.
 *
 * The actor line reads "System" rather than being left blank when no profile is
 * attached. Several entries genuinely have no human behind them — a PSP webhook
 * confirming funding, the cron releasing an advance — and an empty byline
 * invites the reading that we failed to record who did it.
 */
export default function ActivityRow({ entry, isLast }: Props) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ pb: isLast ? 0 : 2 }}>
      <ActivityDot kind={entry.kind} isLast={isLast} />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {titleize(entry.label)}
          </Typography>
          {entry.amount !== null && (
            <Typography variant="body2" fontWeight={700} color="text.secondary">
              {formatMoney(entry.amount, entry.currency)}
            </Typography>
          )}
        </Stack>

        {entry.detail && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {entry.detail}
          </Typography>
        )}

        <Typography variant="caption" color="text.disabled">
          {entry.actor ?? 'System'} · {formatDateTime(entry.occurred_at)}
        </Typography>
      </Box>
    </Stack>
  );
}
