import { Box, StatusChip, Tooltip, Typography } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { VendorAccountModel } from '@/lib/types';

/**
 * The account's lifecycle state, plus the one fact that makes it actionable.
 *
 * A bare chip would leave the three "cannot sign in" states looking
 * interchangeable, which is exactly the confusion the 0810a split exists to
 * remove. So a suspension shows when it lifts — the difference between waiting
 * and intervening — and a block or deactivation shows why, since that is what
 * anyone deciding whether to reverse it needs first.
 *
 * The reason is truncated to one line with the full text in a tooltip: it is an
 * internal note of unbounded length, and letting it set the row height would
 * make one wordy justification reflow the whole table.
 */
export default function AccountStateCell({ row }: { row: VendorAccountModel }) {
  const detail =
    row.account_status === 'suspended' && row.suspended_until
      ? `Until ${formatDate(row.suspended_until)}`
      : (row.status_reason ?? null);

  return (
    <Box sx={{ minWidth: 0 }}>
      <StatusChip status={row.account_status} />
      {detail && (
        <Tooltip title={detail}>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            display="block"
            sx={{ mt: 0.25, maxWidth: 200 }}
          >
            {detail}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
}
