import NextLink from 'next/link';
import { Box, Paper, Stack, Typography, Button, Divider } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import { Storefront, Lock as LockIcon, Language } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { formatMoney } from '@/lib/config/site';
import type { VendorDetailModel } from '@/lib/types';

/**
 * The call-to-action card: the starting price, then the gated actions, which
 * route to sign-in because vendor contact details stay protected until a client
 * is authenticated.
 *
 * One component in two shapes, switched entirely in CSS so the page stays a
 * server component and the card is in the static HTML either way.
 *
 * On `md` and up it is the sticky right-hand column it has always been. Below
 * that it sits *above* the tab bar as a single band — price beside the buttons
 * — rather than falling under the open section. Under a tabbed page the card
 * would otherwise be the last thing on every panel, so a visitor who has just
 * read the price would scroll a wall of photos to reach the button that acts on
 * it, which is the journey the tabs exist to delete.
 */
export default function VendorDetailSidebar({ vendor }: { vendor: VendorDetailModel }) {
  const price = formatMoney(vendor.starting_price, vendor.starting_price_currency);

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        borderRadius: 3,
        position: { md: 'sticky' },
        top: { md: 88 },
      }}
    >
      {/* Brand header band. Hidden in the compact band: it is a title for a
          column, and above the tabs the hero two inches up has already said
          whose profile this is. */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          px: 3,
          py: 2.5,
          color: 'common.white',
          background: `linear-gradient(135deg, ${palette.light.primary.dark} 0%, ${gradientStops.tealDeep} 100%)`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: withAlpha(common.white, 0.16),
            }}
          >
            <Storefront fontSize="small" />
          </Box>
          <Typography variant="h6">Work with {vendor.business_name}</Typography>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack
          // The single defining switch: a row beside the price while the card
          // is a band, a column once it is a sidebar.
          direction={{ xs: 'column', sm: 'row', md: 'column' }}
          spacing={{ xs: 2, md: 0 }}
          alignItems={{ xs: 'stretch', sm: 'center', md: 'stretch' }}
        >
          {price && (
            <Box sx={{ flexShrink: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Starting from
              </Typography>
              <Typography variant="h4" sx={{ lineHeight: 1.2 }}>
                {price}
              </Typography>
              {/* The rule belongs to the stacked card only; in a row the gap
                  between the two clusters already does its job. */}
              <Divider sx={{ display: { xs: 'none', md: 'block' }, mt: 1, mb: 2 }} />
            </Box>
          )}

          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5}>
              <Button
                component={NextLink}
                href="/sign-in"
                variant="contained"
                size="large"
                sx={{ flex: 1 }}
              >
                Request a quote
              </Button>
              <Button
                component={NextLink}
                href="/sign-in"
                variant="outlined"
                size="large"
                sx={{ flex: 1 }}
              >
                Message vendor
              </Button>
            </Stack>
            {vendor.website && (
              <Button
                component="a"
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                variant="text"
                size="large"
                startIcon={<Language />}
              >
                Visit website
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Worth a line in the sidebar, where there is room to explain the
            gate. In the compact band it is a third row of text above the tabs
            that says what the buttons already imply. */}
        <Alert
          icon={<LockIcon fontSize="inherit" />}
          severity="info"
          sx={{ display: { xs: 'none', md: 'flex' }, mt: 2.5 }}
        >
          Sign in to chat and request quotations. Vendor contact details are protected.
        </Alert>
      </Box>
    </Paper>
  );
}
