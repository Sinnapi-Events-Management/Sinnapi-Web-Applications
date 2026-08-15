import { Box, Chip, StatusChip, Stack, Tooltip, Typography } from '@sinnapi/ui';
import type { VendorAccountModel } from '@/lib/types';

/**
 * The listing this account owns — read-only context, never a control.
 *
 * Account state and listing state are deliberately independent here: suspending
 * a vendor's login does not delist their shopfront, and nothing on this page
 * pretends otherwise. Showing the listing's state anyway is what lets an
 * operator NOTICE the combination — a blocked account whose listing is still
 * public is a real problem, and it is invisible unless both are on the same row.
 * Acting on it is a trip to Operations → Vendors, by design.
 *
 * "No listing" is not an error state to hide: an account whose promotion
 * provisioned the login and then failed before the vendor was created looks
 * exactly like this, and it is the row most worth finding.
 */
export default function ListingCell({ row }: { row: VendorAccountModel }) {
  if (!row.vendor_id) {
    return (
      <Tooltip title="This account holds the vendor role but owns no listing — usually an approval that did not finish.">
        <Chip size="small" variant="outlined" color="warning" label="No listing" />
      </Tooltip>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" fontWeight={600} noWrap>
        {row.business_name ?? '—'}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }} alignItems="center">
        {row.vendor_status && <StatusChip status={row.vendor_status} />}
        {row.vendor_visibility === 'hidden' && (
          <Chip size="small" variant="outlined" label="Hidden" />
        )}
      </Stack>
    </Box>
  );
}
