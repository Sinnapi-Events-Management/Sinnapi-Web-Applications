import NextLink from 'next/link';
import { Box, Container, Typography, Chip, Stack, Rating, Link } from '@sinnapi/ui/atoms';
import {
  Verified as VerifiedIcon,
  Place as PlaceIcon,
  ArrowBack,
  NavigateNext,
} from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import ShareButton from '@/components/atoms/shareButton';
import type { VendorDetailModel } from '@/lib/types';

const PLACEHOLDER_IMAGE = '/placeholder-vendor.svg';

/**
 * Cover hero for a single vendor — a full-bleed photo under a brand teal scrim
 * with the business name, a verified badge, rating and base city laid over it.
 * Carries the breadcrumb, a back link and the share control so the page frame
 * reads as one editorial banner. Mirrors the event detail hero for cross-page
 * consistency; the cover uses a plain <img> (via Box) so any URL works without
 * remote-image config, and the scrim keeps the white copy legible.
 */
export default function VendorDetailHero({ vendor }: { vendor: VendorDetailModel }) {
  const overlayLink = { color: withAlpha(common.white, 0.85), '&:hover': { color: common.white } };
  const cover = vendor.primary_image_url ?? vendor.profile_image_url ?? PLACEHOLDER_IMAGE;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        minHeight: { xs: 380, md: 480 },
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <Box
        component="img"
        src={cover}
        alt={vendor.business_name}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Brand teal scrim — darkest at the bottom where the copy sits. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${withAlpha(gradientStops.tealDeep, 0.45)} 0%, ${withAlpha(gradientStops.tealDeep, 0.2)} 32%, ${withAlpha(palette.light.primary.dark, 0.92)} 100%)`,
        }}
      />

      {/* Top bar: breadcrumb (left) + share (right), pinned over the photo. */}
      <Container sx={{ position: 'absolute', top: 0, left: 0, right: 0, pt: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ minWidth: 0, color: withAlpha(common.white, 0.85) }}
          >
            <Link component={NextLink} href="/" underline="hover" sx={overlayLink}>
              Home
            </Link>
            <NavigateNext sx={{ fontSize: 16, opacity: 0.7 }} />
            <Link component={NextLink} href="/vendors" underline="hover" sx={overlayLink}>
              Vendors
            </Link>
            <NavigateNext sx={{ fontSize: 16, opacity: 0.7 }} />
            <Typography
              variant="body2"
              sx={{
                color: 'common.white',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: 140, sm: 320 },
              }}
            >
              {vendor.business_name}
            </Typography>
          </Stack>

          <ShareButton
            title={vendor.business_name}
            sx={{
              flexShrink: 0,
              color: 'common.white',
              borderColor: withAlpha(common.white, 0.5),
              '&:hover': { borderColor: 'common.white', bgcolor: withAlpha(common.white, 0.08) },
            }}
          />
        </Stack>
      </Container>

      {/* Bottom: back link, badges, name, quick meta. */}
      <Container sx={{ position: 'relative', pb: { xs: 4, md: 6 }, pt: { xs: 10, md: 12 } }}>
        <Link
          component={NextLink}
          href="/vendors"
          underline="none"
          sx={{
            mb: 3,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 2.25,
            py: 1,
            fontWeight: 600,
            color: 'common.white',
            borderRadius: 999,
            // Glassmorphism: translucent fill + blur of the photo behind it.
            bgcolor: withAlpha(common.white, 0.12),
            border: '1px solid',
            borderColor: withAlpha(common.white, 0.3),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: `0 8px 24px -12px ${withAlpha(common.black, 0.6)}`,
            transition: 'background-color .25s ease, border-color .25s ease, transform .25s ease',
            '&:hover': {
              bgcolor: withAlpha(common.white, 0.22),
              borderColor: withAlpha(common.white, 0.55),
              transform: 'translateX(-3px)',
            },
            '&:hover .back-arrow': { transform: 'translateX(-2px)' },
          }}
        >
          <ArrowBack
            className="back-arrow"
            sx={{ fontSize: 18, transition: 'transform .25s ease' }}
          />
          Back to vendors
        </Link>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            icon={<VerifiedIcon sx={{ color: 'inherit !important' }} fontSize="small" />}
            label="Verified vendor"
            size="small"
            sx={{
              color: 'common.white',
              bgcolor: withAlpha(common.white, 0.18),
              fontWeight: 600,
              '& .MuiChip-icon': { color: palette.light.secondary.light },
            }}
          />
          {vendor.is_featured && (
            <Chip
              label="Featured"
              size="small"
              color="secondary"
              sx={{ color: 'common.white', fontWeight: 600 }}
            />
          )}
        </Stack>

        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            fontSize: { xs: '2.1rem', sm: '2.8rem', md: '3.4rem' },
            lineHeight: 1.1,
            maxWidth: 860,
          }}
        >
          {vendor.business_name}
        </Typography>

        <Stack
          direction="row"
          spacing={3}
          sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1.5, color: withAlpha(common.white, 0.9) }}
        >
          {vendor.base_city && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PlaceIcon fontSize="small" />
              <Typography>{vendor.base_city}</Typography>
            </Stack>
          )}
          {vendor.review_count > 0 && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Rating value={vendor.avg_rating} precision={0.5} size="small" readOnly />
              <Typography>
                {vendor.avg_rating.toFixed(1)} ({vendor.review_count} reviews)
              </Typography>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
