import NextLink from 'next/link';
import { Box, Paper, Stack, Typography, Button } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import { Storefront, Lock as LockIcon } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import type { EventCardModel } from '@/lib/types';

/**
 * Sticky call-to-action card. Key facts now live in the highlights strip, so
 * this card stays focused on a single decision: open events invite vendors to
 * express interest (gated behind sign-in, with the escrow note); inspiration
 * listings point clients to browse vendors instead. A tinted header band gives
 * the card presence without competing with the page.
 */
export default function EventDetailSidebar({ event }: { event: EventCardModel }) {
  const isInspiration = event.source === 'admin';

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
          <Typography variant="h6">
            {isInspiration ? 'Planning something like this?' : 'Are you a vendor?'}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="body2" color="text.secondary">
          {isInspiration
            ? 'Discover verified vendors who can bring an event like this to life — compare, shortlist and book in one place.'
            : 'Sign in to express interest and offer your services for this event.'}
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 2.5 }}>
          {isInspiration ? (
            <Button component={NextLink} href="/vendors" variant="contained" size="large">
              Browse vendors
            </Button>
          ) : (
            <Button component={NextLink} href="/sign-in" variant="contained" size="large">
              Express interest
            </Button>
          )}
          <Button component={NextLink} href="/apply" variant="outlined" size="large">
            Become a vendor
          </Button>
        </Stack>

        {!isInspiration && (
          <Alert icon={<LockIcon fontSize="inherit" />} severity="info" sx={{ mt: 2.5 }}>
            Only approved vendors with an active subscription can express interest.
          </Alert>
        )}
      </Box>
    </Paper>
  );
}
