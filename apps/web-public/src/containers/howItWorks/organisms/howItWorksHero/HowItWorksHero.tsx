import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Chip, Stack, SecondaryButton, Button } from '@sinnapi/ui';
import { AutoAwesome } from '@sinnapi/ui/icons';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';

/**
 * How-it-works hero — a teal-over-photo banner that frames the page as a simple,
 * trustworthy process. Mirrors the About hero's treatment for brand continuity
 * (same gradient, calm and search-free) while leading with a process-first
 * headline and CTAs into the two journeys. Kept fully server-rendered with a
 * priority image so the LCP isn't gated behind any client JS or animation.
 */
export default function HowItWorksHero() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        pt: { xs: 8, md: 13 },
        pb: { xs: 9, md: 14 },
      }}
    >
      {/* Full-bleed background photo. Decorative → empty alt + aria-hidden. */}
      <Image
        src={IMAGES.ceremonyAisle.src}
        alt=""
        aria-hidden
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* Brand teal overlay keeps the copy legible while the photo glows through. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${withAlpha(gradientStops.tealDeep, 0.95)} 0%, ${withAlpha(palette.light.primary.dark, 0.88)} 50%, ${withAlpha(palette.light.primary.main, 0.62)} 100%)`,
        }}
      />

      {/* Decorative soft glow for depth. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: { xs: -120, md: -160 },
          right: { xs: -120, md: -80 },
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(palette.light.secondary.light, 0.32)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      <Container
        sx={{ position: 'relative', maxWidth: 'md', textAlign: { xs: 'left', md: 'center' } }}
      >
        <Chip
          icon={<AutoAwesome sx={{ color: 'inherit !important' }} fontSize="small" />}
          label="How it works"
          size="small"
          sx={{
            mb: 3,
            color: 'common.white',
            bgcolor: withAlpha(common.white, 0.14),
            fontWeight: 600,
            '& .MuiChip-icon': { color: palette.light.secondary.light },
          }}
        />
        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            fontSize: { xs: '2.4rem', sm: '3rem', md: '3.6rem' },
            lineHeight: 1.08,
          }}
        >
          From first idea to final celebration — in a few simple steps
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mt: 2.5,
            fontWeight: 400,
            color: withAlpha(common.white, 0.9),
            maxWidth: 680,
            mx: { md: 'auto' },
          }}
        >
          Discover verified vendors, compare quotes, book with confidence, and manage everything in
          one place. Here&apos;s exactly how Sinnapi works — whether you&apos;re planning an event
          or growing one.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 4, justifyContent: { md: 'center' } }}
        >
          <SecondaryButton component={NextLink} href="/vendors" size="large">
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
