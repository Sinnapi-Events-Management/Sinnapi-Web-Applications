import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Chip, Stack, Button } from '@sinnapi/ui/atoms';
import { SecondaryButton } from '@sinnapi/ui/molecules';
import { Verified } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';

/**
 * About hero — an editorial photo banner that introduces who Sinnapi is.
 * Mirrors the home hero's teal-over-photo treatment for brand continuity,
 * but is intentionally calmer (no search, no Ken Burns) to suit a story page.
 */
export default function AboutHero() {
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
        src={IMAGES.ceremonyLawn.src}
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
          icon={<Verified sx={{ color: 'inherit !important' }} fontSize="small" />}
          label="Our story"
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
          A trusted home for authentic event service providers
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
          Sinnapi connects clients with verified, authentic vendors — making it simple to discover,
          compare, and book everything your event needs in one place. We start in Uganda and are
          built to scale internationally.
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
