import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@sinnapi/ui';
import ChatIcon from '@mui/icons-material/Chat';
import VendorActions from '@/components/vendor/VendorActions';
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
      <Button
        component={RouterLink}
        to="/messages"
        fullWidth
        startIcon={<ChatIcon />}
        sx={{ mt: 1.5 }}
      >
        Message vendor
      </Button>
    </Paper>
  );
}
