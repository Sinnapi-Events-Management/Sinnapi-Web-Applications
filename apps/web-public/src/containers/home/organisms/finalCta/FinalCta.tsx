import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Stack, Typography } from '@sinnapi/ui/atoms';
import { SecondaryButton } from '@sinnapi/ui/molecules';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';

export default function FinalCta() {
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
      {/* Brand teal ramp keeps the closing CTA legible over the photo. */}
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
      <Container sx={{ position: 'relative' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h3" sx={{ color: 'common.white' }}>
              Ready to plan your event?
            </Typography>
            <Typography sx={{ mt: 1, color: withAlpha(common.white, 0.88), maxWidth: 560 }}>
              Create a free account to chat, request quotes, and book with confidence.
            </Typography>
          </Box>
          <SecondaryButton
            component={NextLink}
            href="/sign-up"
            size="large"
            sx={{
              flexShrink: 0,
              '[data-mui-color-scheme="dark"] &': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { backgroundColor: 'primary.dark' },
              },
            }}
          >
            Get started
          </SecondaryButton>
        </Stack>
      </Container>
    </Box>
  );
}
