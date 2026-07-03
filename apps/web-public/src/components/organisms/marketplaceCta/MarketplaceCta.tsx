import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Stack, Typography, Button } from '@sinnapi/ui/atoms';
import { SecondaryButton } from '@sinnapi/ui/molecules';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES, type LocalImage } from '@/lib/assets';

type CtaLink = { label: string; href: string };

type MarketplaceCtaProps = {
  title?: string;
  subtitle?: string;
  /** Leading (filled) action — typically the page's cross-sell. */
  primary?: CtaLink;
  /** Trailing (outlined) action — typically "Become a vendor". */
  secondary?: CtaLink;
  /** Background photo; defaults to a celebratory shot distinct from the heroes. */
  image?: LocalImage;
};

/**
 * Shared closing CTA — a photo-backed teal band that mirrors HowItWorksCta /
 * PricingCta so every page ends on the same confident brand note. Combines an
 * event-oriented and a vendor-oriented action in one band; copy and links are
 * props so each page tailors them (a vendor listing cross-sells events, an event
 * listing cross-sells vendors) while the look stays consistent. Fully server-
 * rendered; the background image is decorative (empty alt + aria-hidden).
 */
export default function MarketplaceCta({
  title = 'Ready to bring your event to life?',
  subtitle = 'Discover verified vendors and book with confidence, or join Sinnapi as a provider and grow your business — it all starts here.',
  primary = { label: 'Browse vendors', href: '/vendors' },
  secondary = { label: 'Become a vendor', href: '/apply' },
  image = IMAGES.weddingCar,
}: MarketplaceCtaProps) {
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
        src={image.src}
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
          {title}
        </Typography>
        <Typography sx={{ mt: 2, color: withAlpha(common.white, 0.9), maxWidth: 680, mx: 'auto' }}>
          {subtitle}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 4, justifyContent: 'center' }}
        >
          <SecondaryButton
            component={NextLink}
            href={primary.href}
            size="large"
            sx={{
              '[data-mui-color-scheme="dark"] &': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { backgroundColor: 'primary.dark' },
              },
            }}
          >
            {primary.label}
          </SecondaryButton>
          <Button
            component={NextLink}
            href={secondary.href}
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
            {secondary.label}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
