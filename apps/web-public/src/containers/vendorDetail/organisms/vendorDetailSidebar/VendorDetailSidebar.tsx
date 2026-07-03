import NextLink from 'next/link';
import { Box, Paper, Stack, Typography, Button, Divider } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import { Storefront, Lock as LockIcon, Language } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { formatMoney } from '@/lib/config/site';
import type { VendorDetailModel } from '@/lib/types';

/**
 * Sticky call-to-action card. Leads with the starting price, then the two gated
 * actions (request a quote / message vendor) which route to sign-in — vendor
 * contact details are intentionally protected until a client is authenticated.
 * A tinted header band gives the card presence; mirrors the event detail sidebar
 * for cross-page consistency.
 */
export default function VendorDetailSidebar({ vendor }: { vendor: VendorDetailModel }) {
  const price = formatMoney(vendor.starting_price, vendor.starting_price_currency);

  return (
    <Paper
      variant="outlined"
      sx={{ overflow: 'hidden', borderRadius: 3, position: { md: 'sticky' }, top: { md: 88 } }}
    >
      {/* Brand header band for a confident, on-brand CTA. */}
      <Box
        sx={{
          px: { xs: 2.5, md: 3 },
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

      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        {price && (
          <>
            <Typography variant="overline" color="text.secondary">
              Starting from
            </Typography>
            <Typography variant="h4" sx={{ mb: 1 }}>
              {price}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        <Stack spacing={1.5}>
          <Button component={NextLink} href="/sign-in" variant="contained" size="large">
            Request a quote
          </Button>
          <Button component={NextLink} href="/sign-in" variant="outlined" size="large">
            Message vendor
          </Button>
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

        <Alert icon={<LockIcon fontSize="inherit" />} severity="info" sx={{ mt: 2.5 }}>
          Sign in to chat and request quotations. Vendor contact details are protected.
        </Alert>
      </Box>
    </Paper>
  );
}
