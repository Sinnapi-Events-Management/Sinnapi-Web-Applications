import { Box, Paper, Typography } from '@sinnapi/ui';
import VendorActions from '@/components/vendor/VendorActions';
import MessageVendorButton from '@/components/vendor/MessageVendorButton';
import { formatMoney } from '@/lib/config';
import type { VendorDetailModel } from '@/lib/types';

/**
 * The commit panel: price anchor, then the ways to engage. Sticks to the
 * viewport on desktop so the actions stay reachable however far the visitor
 * scrolls through the portfolio.
 */
export default function VendorBookingPanel({ vendor }: { vendor: VendorDetailModel }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: { md: 88 } }}>
      {vendor.starting_price != null && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Starting from
          </Typography>
          <Typography variant="h4">
            {formatMoney(vendor.starting_price, vendor.starting_price_currency)}
          </Typography>
        </Box>
      )}
      <VendorActions vendorId={vendor.id} />
      <Box sx={{ mt: 1.5 }}>
        <MessageVendorButton vendorId={vendor.id} />
      </Box>
    </Paper>
  );
}
