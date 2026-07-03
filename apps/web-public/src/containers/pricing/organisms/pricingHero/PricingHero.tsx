import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Chip, Stack, Button } from '@sinnapi/ui/atoms';
import { SecondaryButton } from '@sinnapi/ui/molecules';
import { LocalOffer } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';

/**
 * Pricing hero — a photo-backed teal banner introducing vendor subscriptions.
 * Mirrors AboutHero's treatment (full-bleed photo + brand overlay + glow) so the
 * pricing page feels part of the same family, but leads with a trial-focused
 * promise and routes straight to the application.
 */
export default function PricingHero() {
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
        src={IMAGES.receptionAutumn.src}
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
          icon={<LocalOffer sx={{ color: 'inherit !important' }} fontSize="small" />}
          label="Vendor pricing"
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
          Simple plans that grow your business
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
          Start with a 30-day free trial after approval, then choose the plan that fits how you
          work. No setup fees, cancel anytime — your listing stays in your control.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 4, justifyContent: { md: 'center' } }}
        >
          <SecondaryButton component={NextLink} href="/apply" size="large">
            Start free trial
          </SecondaryButton>
          <Button
            component={NextLink}
            href="#plans"
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
            Compare plans
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
