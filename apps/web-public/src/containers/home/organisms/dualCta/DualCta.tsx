import NextLink from 'next/link';
import Image from 'next/image';
import {
  Box,
  Container,
  Grid,
  Stack,
  Typography,
  Paper,
  Button,
  SecondaryButton,
} from '@sinnapi/ui';
import { EventAvailable, Storefront } from '@sinnapi/ui/icons';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { CLIENT_CTA_IMAGE, VENDOR_CTA_IMAGE } from './data/images';

export default function DualCta() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <Grid container spacing={3}>
        {/* Client path — teal */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              position: 'relative',
              overflow: 'hidden',
              p: { xs: 4, md: 5 },
              height: '100%',
              color: 'common.white',
            }}
          >
            <Image
              src={CLIENT_CTA_IMAGE.src}
              alt=""
              aria-hidden
              fill
              placeholder="blur"
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(135deg, ${withAlpha(palette.light.primary.dark, 0.95)} 0%, ${withAlpha(palette.light.primary.main, 0.88)} 100%)`,
                '[data-mui-color-scheme="dark"] &': {
                  background: `linear-gradient(135deg, ${withAlpha(gradientStops.neutralDeep, 0.95)} 0%, ${withAlpha(palette.light.primary.dark, 0.92)} 100%)`,
                },
              }}
            />
            <Box sx={{ position: 'relative' }}>
              <EventAvailable sx={{ fontSize: 35, color: 'secondary.light' }} />
              <Typography variant="h3" sx={{ mt: 2, color: 'common.white' }}>
                Planning an event?
              </Typography>
              <Typography sx={{ mt: 1.5, color: withAlpha(common.white, 0.9) }}>
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
                  sx={{
                    color: 'common.white',
                    borderColor: withAlpha(common.white, 0.6),
                    '&:hover': {
                      borderColor: 'common.white',
                      bgcolor: withAlpha(common.white, 0.08),
                    },
                  }}
                >
                  Browse vendors
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Vendor path — gold */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              position: 'relative',
              overflow: 'hidden',
              p: { xs: 4, md: 5 },
              height: '100%',
              color: 'common.white',
            }}
          >
            <Image
              src={VENDOR_CTA_IMAGE.src}
              alt=""
              aria-hidden
              fill
              placeholder="blur"
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(135deg, ${withAlpha(gradientStops.goldDark, 0.94)} 0%, ${withAlpha(gradientStops.gold, 0.85)} 100%)`,
                '[data-mui-color-scheme="dark"] &': {
                  background: `linear-gradient(135deg, ${withAlpha(gradientStops.neutralDeep, 0.95)} 0%, ${withAlpha(gradientStops.goldDeep, 0.92)} 100%)`,
                },
              }}
            />
            <Box sx={{ position: 'relative' }}>
              <Storefront sx={{ fontSize: 35 }} />
              <Typography variant="h3" sx={{ mt: 2, color: 'common.white' }}>
                Grow your business
              </Typography>
              <Typography sx={{ mt: 1.5, color: withAlpha(common.white, 0.92) }}>
                Join a trusted marketplace, reach ready-to-book clients, and manage quotes,
                bookings, and payouts — all in one place. Start with a 30-day free trial.
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
                  sx={{
                    color: 'common.white',
                    borderColor: withAlpha(common.white, 0.7),
                    '&:hover': {
                      borderColor: 'common.white',
                      bgcolor: withAlpha(common.white, 0.08),
                    },
                  }}
                >
                  View pricing
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
