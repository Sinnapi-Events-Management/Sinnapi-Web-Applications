import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Stack, Typography, Button } from '@sinnapi/ui/atoms';
import { SecondaryButton } from '@sinnapi/ui/molecules';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';

/**
 * Closing pricing CTA — a photo-backed teal band that mirrors JoinFamily so the
 * pricing page ends on the same confident brand note, pointing vendors straight
 * to the application and clients to browse.
 */
export default function PricingCta() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        py: { xs: 8, md: 11 },
      }}
    >
      <Image
        src={IMAGES.ceremonyAisle.src}
        alt=""
        aria-hidden
        fill
        placeholder="blur"
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${withAlpha(gradientStops.tealDeep, 0.95)} 0%, ${withAlpha(palette.light.primary.dark, 0.9)} 55%, ${withAlpha(palette.light.primary.main, 0.82)} 100%)`,
          '[data-mui-color-scheme="dark"] &': {
            background: `linear-gradient(135deg, ${withAlpha(gradientStops.neutralDeep, 0.96)} 0%, ${withAlpha(palette.light.primary.dark, 0.92)} 100%)`,
          },
        }}
      />
      <Container sx={{ position: 'relative', textAlign: 'center', maxWidth: 'md' }}>
        <Typography variant="h3" sx={{ color: 'common.white' }}>
          Ready to grow your business?
        </Typography>
        <Typography sx={{ mt: 2, color: withAlpha(common.white, 0.9), maxWidth: 680, mx: 'auto' }}>
          Apply today, get verified, and start your 30-day free trial. Reach more clients, showcase
          your work, and take bookings — all from one trusted home for event vendors.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 4, justifyContent: 'center' }}
        >
          <SecondaryButton
            component={NextLink}
            href="/apply"
            size="large"
            sx={{
              '[data-mui-color-scheme="dark"] &': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { backgroundColor: 'primary.dark' },
              },
            }}
          >
            Start free trial
          </SecondaryButton>
          <Button
            component={NextLink}
            href="/contact"
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
            Talk to sales
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
