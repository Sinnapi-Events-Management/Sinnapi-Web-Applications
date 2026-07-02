import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Stack, Typography, Link, SecondaryButton, Button } from '@sinnapi/ui';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import { SITE } from '@/lib/config/site';

const APPLY_HREF = `${SITE.portalUrl}?role=vendor&mode=apply`;

/**
 * Closing vendor CTA — a photo-backed teal band that mirrors the site's other
 * conversion bands for brand continuity, and preserves the Vendor Terms and
 * Escrow Policy disclosure that must accompany an application.
 */
export default function ApplyCta() {
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
        style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
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
          Ready to grow your event business?
        </Typography>
        <Typography sx={{ mt: 2, color: withAlpha(common.white, 0.9), maxWidth: 620, mx: 'auto' }}>
          Apply today, enjoy a 30-day free trial, and start reaching clients who are ready to book.
          It only takes a few minutes to get started.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 4, justifyContent: 'center' }}
        >
          <SecondaryButton
            component={NextLink}
            href={APPLY_HREF}
            size="large"
            sx={{
              '[data-mui-color-scheme="dark"] &': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { backgroundColor: 'primary.dark' },
              },
            }}
          >
            Start your application
          </SecondaryButton>
          <Button
            component={NextLink}
            href="/pricing"
            variant="outlined"
            size="large"
            sx={{
              color: 'common.white',
              borderColor: withAlpha(common.white, 0.6),
              '&:hover': { borderColor: 'common.white', bgcolor: withAlpha(common.white, 0.08) },
            }}
          >
            View pricing
          </Button>
        </Stack>

        <Typography variant="body2" sx={{ mt: 3, color: withAlpha(common.white, 0.82) }}>
          By applying you agree to our{' '}
          <Link
            component={NextLink}
            href="/vendor-terms"
            sx={{ color: 'common.white', textDecorationColor: withAlpha(common.white, 0.6) }}
          >
            Vendor Terms
          </Link>{' '}
          and{' '}
          <Link
            component={NextLink}
            href="/escrow-policy"
            sx={{ color: 'common.white', textDecorationColor: withAlpha(common.white, 0.6) }}
          >
            Escrow Policy
          </Link>
          .
        </Typography>
      </Container>
    </Box>
  );
}
