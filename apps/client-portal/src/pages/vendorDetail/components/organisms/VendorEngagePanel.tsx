import { Box, Divider, Paper, Stack, Typography } from '@sinnapi/ui';
import VendorActions from '@/components/vendor/VendorActions';
import MessageVendorButton from '@/components/vendor/MessageVendorButton';
import { formatMoney } from '@/lib/config';
import type { VendorDetailModel } from '@/lib/types';

type Props = {
  vendor: VendorDetailModel;
  /**
   * `sidebar` is the desktop card in the second column, pinned so the actions
   * stay reachable however far the open section scrolls.
   *
   * `compact` is the phone and tablet layout, and it sits *above* the tab bar
   * rather than below the panel. Under a tabbed page the panel is the last
   * thing on every section, so a visitor who has just read the price would
   * scroll a calendar or a wall of photos to reach the button that acts on it —
   * the exact journey the tabs exist to delete.
   */
  layout: 'sidebar' | 'compact';
};

/** The price anchor, on its own so both layouts render it identically. */
function StartingPrice({ vendor }: { vendor: VendorDetailModel }) {
  if (vendor.starting_price == null) return null;

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        Starting from
      </Typography>
      <Typography variant="h4" sx={{ lineHeight: 1.2 }}>
        {formatMoney(vendor.starting_price, vendor.starting_price_currency)}
      </Typography>
    </Box>
  );
}

/**
 * The commit panel: what it costs, then the three ways to engage.
 *
 * One component, two placements, and only ever one of them mounted — the page
 * picks by breakpoint rather than rendering both and hiding one, because each
 * copy carries a quote dialog, a booking dialog and a conversation mutation.
 */
export default function VendorEngagePanel({ vendor, layout }: Props) {
  if (layout === 'compact') {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack
          // The price sits beside the buttons the moment there is room for it,
          // which keeps the whole panel to one band above the tabs instead of
          // pushing them off a small screen.
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <StartingPrice vendor={vendor} />
          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            <VendorActions vendorId={vendor.id} direction={{ xs: 'column', sm: 'row' }} />
            <MessageVendorButton vendorId={vendor.id} variant="text" />
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 3,
        position: 'sticky',
        // Clears the portal's fixed top bar, matching the tab bar that pins
        // just under it in the other column.
        top: 88,
      }}
    >
      <StartingPrice vendor={vendor} />
      {vendor.starting_price != null && <Divider sx={{ my: 2 }} />}
      <VendorActions vendorId={vendor.id} />
      <Box sx={{ mt: 1.5 }}>
        <MessageVendorButton vendorId={vendor.id} />
      </Box>
    </Paper>
  );
}
