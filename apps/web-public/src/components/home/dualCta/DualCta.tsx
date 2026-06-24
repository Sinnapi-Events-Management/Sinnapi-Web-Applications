import NextLink from 'next/link';
import { Container, Grid, Stack, Typography, Paper, Button, SecondaryButton } from '@sinnapi/ui';
import { EventAvailable, Storefront } from '@sinnapi/ui/icons';
import { common, gradientStops, withAlpha } from '@sinnapi/ui/tokens';
import { VENDOR_CTA_IMAGE } from './data/images';

export default function DualCta() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: { xs: 4, md: 5 },
              height: '100%',
              color: 'common.white',
              // Brand teal, sourced from the primary palette tokens (CSS variables).
              background:
                'linear-gradient(135deg, var(--mui-palette-primary-dark) 0%, var(--mui-palette-primary-main) 100%)',
              // Deepen to the near-black background tokens in dark mode.
              // Selector set on <html> by ColorModeProvider.
              '[data-mui-color-scheme="dark"] &': {
                background:
                  'linear-gradient(135deg, var(--mui-palette-background-paper) 100%, var(--mui-palette-background-default) 100%)',
              },
            }}
          >
            <EventAvailable sx={{ fontSize: 35, color: 'secondary.light' }} />
            <Typography variant="h3" sx={{ mt: 2, color: 'common.white' }}>
              Planning an event?
            </Typography>
            <Typography sx={{ mt: 1.5, color: withAlpha(common.white, 0.85) }}>
              Create a free account to chat, request quotes, and book trusted vendors with
              escrow-backed confidence.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <SecondaryButton component={NextLink} href="/sign-up" size="large">
                Get started free
              </SecondaryButton>
              <Button
                component={NextLink}
                href="/vendors"
                variant="outlined"
                size="large"
                sx={{ color: 'common.white', borderColor: withAlpha(common.white, 0.6) }}
              >
                Browse vendors
              </Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: { xs: 4, md: 5 },
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              color: 'common.white',
              bgcolor: 'secondary',
              backgroundImage: `linear-gradient(135deg, ${withAlpha(gradientStops.goldDark, 0.92)} 0%, ${withAlpha(gradientStops.gold, 0.82)} 100%), url(${VENDOR_CTA_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              // Darken the gold overlay in dark mode. Selector set on <html> by ColorModeProvider.
              '[data-mui-color-scheme="dark"] &': {
                bgcolor: 'background.paper',
                backgroundImage: `linear-gradient(135deg, ${withAlpha(gradientStops.neutralDeep, 0.95)} 100%, ${withAlpha(gradientStops.goldDeep, 0.9)} 100%), url(${VENDOR_CTA_IMAGE})`,
              },
            }}
          >
            <Storefront sx={{ fontSize: 35 }} />
            <Typography variant="h3" sx={{ mt: 2, color: 'common.white' }}>
              Grow your business
            </Typography>
            <Typography sx={{ mt: 1.5, color: withAlpha(common.white, 0.92) }}>
              Join a trusted marketplace, reach ready-to-book clients, and manage quotes, bookings,
              and payouts — all in one place. Start with a 30-day free trial.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <Button
                component={NextLink}
                href="/apply"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'common.white',
                  color: 'secondary.dark',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                Become a vendor
              </Button>
              <Button
                component={NextLink}
                href="/pricing"
                variant="outlined"
                size="large"
                sx={{ color: 'common.white', borderColor: withAlpha(common.white, 0.7) }}
              >
                View pricing
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
