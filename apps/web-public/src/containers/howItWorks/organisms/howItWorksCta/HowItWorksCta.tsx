import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Stack, Typography, SecondaryButton, Button } from '@sinnapi/ui';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';

/**
 * Closing how-it-works CTA — a photo-backed teal band that mirrors PricingCta so
 * the page ends on the same confident brand note. Now that the process is clear,
 * it points clients to browse and vendors to apply. Uses a different photo from
 * the hero so the page doesn't repeat the same image top and bottom.
 */
export default function HowItWorksCta() {
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
        src={IMAGES.receptionAutumn.src}
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
          Ready to bring your event to life?
        </Typography>
        <Typography sx={{ mt: 2, color: withAlpha(common.white, 0.9), maxWidth: 680, mx: 'auto' }}>
          Now you know how it works. Discover verified vendors and book with confidence, or join
          Sinnapi as a provider and grow your business — it all starts here.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 4, justifyContent: 'center' }}
        >
          <SecondaryButton
            component={NextLink}
            href="/vendors"
            size="large"
            sx={{
              '[data-mui-color-scheme="dark"] &': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { backgroundColor: 'primary.dark' },
              },
            }}
          >
            Browse vendors
          </SecondaryButton>
          <Button
            component={NextLink}
            href="/apply"
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
            Become a vendor
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
