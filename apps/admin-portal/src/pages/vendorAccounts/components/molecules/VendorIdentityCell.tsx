import { Avatar, Box, Stack, Typography } from '@sinnapi/ui';
import { initials } from '@/lib/config';
import type { VendorAccountModel } from '@/lib/types';

/**
 * Who the account belongs to. The person leads and the business follows,
 * because this page is the People-section view — the listing-first presentation
 * belongs to Operations → Vendors.
 */
export default function VendorIdentityCell({ row }: { row: VendorAccountModel }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar sx={{ width: 40, height: 40, fontSize: 15, fontWeight: 600 }}>
        {initials(row.full_name ?? row.business_name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {row.full_name ?? '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {row.email ?? '—'}
        </Typography>
      </Box>
    </Stack>
  );
}
