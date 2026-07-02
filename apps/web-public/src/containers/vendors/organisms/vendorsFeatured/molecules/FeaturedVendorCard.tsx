import NextLink from 'next/link';
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Box,
  Typography,
  Chip,
  Rating,
  Stack,
} from '@sinnapi/ui';
import { Verified as VerifiedIcon, Place as PlaceIcon, Star } from '@sinnapi/ui/icons';
import { common, palette, withAlpha } from '@sinnapi/ui/tokens';
import { titleize } from '@/lib/config/site';
import { useVendorCard } from '@/components/molecules/vendorCard/hooks/useVendorCard';
import type { VendorListItem } from '../../../utils/filterVendors';

const GOLD = palette.light.secondary;

/**
 * Premium card for a paid/featured vendor. Visually elevated above the standard
 * VendorCard with a gold accent border, a "Featured" ribbon and a soft gold glow
 * on hover, so paid placements read as a distinct, higher tier. Display values
 * (price, image) are derived by the shared `useVendorCard` hook to stay in sync
 * with the listing card.
 */
export default function FeaturedVendorCard({ vendor }: { vendor: VendorListItem }) {
  const { price, image } = useVendorCard(vendor);

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        overflow: 'hidden',
        borderColor: withAlpha(GOLD.main, 0.45),
        boxShadow: `0 1px 0 ${withAlpha(GOLD.main, 0.25)}`,
        transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          borderColor: GOLD.main,
          boxShadow: `0 18px 38px -18px ${withAlpha(GOLD.dark, 0.6)}`,
        },
        '&:hover .featured-card-media': { transform: 'scale(1.07)' },
      }}
    >
      <CardActionArea
        component={NextLink}
        href={`/vendors/${vendor.slug}`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <CardMedia
            component="img"
            height="200"
            image={image}
            alt={vendor.business_name}
            className="featured-card-media"
            sx={{ bgcolor: 'grey.100', transition: 'transform .45s ease' }}
          />
          {/* Bottom scrim keeps the ribbon + any bright photo legible. */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to top, ${withAlpha(common.black, 0.3)} 0%, transparent 45%)`,
            }}
          />
          {/* Gold "Featured" ribbon — the paid-placement signal. */}
          <Chip
            size="small"
            icon={<Star sx={{ color: 'inherit !important', fontSize: 16 }} />}
            label="Featured"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              fontWeight: 700,
              letterSpacing: 0.3,
              color: GOLD.contrastText,
              background: `linear-gradient(135deg, ${GOLD.light} 0%, ${GOLD.main} 100%)`,
              boxShadow: `0 6px 16px -8px ${withAlpha(GOLD.dark, 0.8)}`,
              '& .MuiChip-icon': { color: GOLD.contrastText },
            }}
          />
        </Box>

        <CardContent sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {vendor.category && (
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              {titleize(vendor.category)}
            </Typography>
          )}

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="h6" noWrap>
              {vendor.business_name}
            </Typography>
            <VerifiedIcon fontSize="small" color="primary" titleAccess="Verified vendor" />
          </Stack>

          {vendor.base_city && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              <PlaceIcon fontSize="inherit" />
              <Typography variant="body2">{vendor.base_city}</Typography>
            </Stack>
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Rating value={vendor.avg_rating} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">
              {vendor.avg_rating.toFixed(1)} ({vendor.review_count})
            </Typography>
          </Stack>

          {price && (
            <Typography variant="body2" sx={{ mt: 'auto', pt: 1.5 }}>
              <Box component="span" color="text.secondary">
                From{' '}
              </Box>
              <Box component="span" fontWeight={700}>
                {price}
              </Box>
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
