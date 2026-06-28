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
import { Verified as VerifiedIcon, Place as PlaceIcon } from '@sinnapi/ui/icons';
import type { VendorCardModel } from '@/lib/types';
import { useVendorCard } from './hooks/useVendorCard';

/**
 * Presentational Server Component for a single vendor in a listing grid.
 * Display values are derived by useVendorCard so this stays purely declarative.
 */
export default function VendorCard({ vendor }: { vendor: VendorCardModel }) {
  const { price, image } = useVendorCard(vendor);

  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', transition: 'box-shadow .2s', '&:hover': { boxShadow: 4 } }}
    >
      <CardActionArea component={NextLink} href={`/vendors/${vendor.slug}`} sx={{ height: '100%' }}>
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height="180"
            image={image}
            alt={vendor.business_name}
            sx={{ bgcolor: 'grey.100' }}
          />
          {vendor.is_featured && (
            <Chip
              size="small"
              color="secondary"
              label="Featured"
              sx={{ position: 'absolute', top: 12, left: 12 }}
            />
          )}
        </Box>
        <CardContent>
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
              ({vendor.review_count})
            </Typography>
          </Stack>
          {price && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Box component="span" color="text.secondary">
                From{' '}
              </Box>
              <Box component="span" fontWeight={600}>
                {price}
              </Box>
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
