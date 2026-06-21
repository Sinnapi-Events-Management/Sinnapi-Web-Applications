import { Link as RouterLink } from 'react-router-dom';
import { Grid, Box, Typography, Chip, Stack, Rating, Paper, Divider, Button } from '@sinnapi/ui';
import VerifiedIcon from '@mui/icons-material/Verified';
import PlaceIcon from '@mui/icons-material/Place';
import ChatIcon from '@mui/icons-material/Chat';
import QueryState from '@/components/ui/QueryState';
import EmptyState from '@/components/ui/EmptyState';
import VendorActions from '@/components/vendor/VendorActions';
import { formatMoney, titleize } from '@/lib/config';
import { useVendorDetail } from './hooks/useVendorDetail';

export default function VendorDetail() {
  const { vendor, isLoading, error } = useVendorDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!vendor ? (
        <EmptyState
          title="Vendor not found"
          description="This vendor may no longer be available."
          ctaLabel="Back to discover"
          ctaHref="/discover"
        />
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h2">{vendor.business_name}</Typography>
              <VerifiedIcon color="primary" titleAccess="Verified vendor" />
            </Stack>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mt: 1, color: 'text.secondary' }}
            >
              {vendor.base_city && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PlaceIcon fontSize="small" />
                  <Typography>{vendor.base_city}</Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Rating value={vendor.avg_rating} precision={0.5} size="small" readOnly />
                <Typography variant="body2">
                  {Number(vendor.avg_rating).toFixed(1)} ({vendor.review_count})
                </Typography>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
              {vendor.pricing_model && <Chip label={titleize(vendor.pricing_model)} />}
              {vendor.lead_time && (
                <Chip variant="outlined" label={`Lead time: ${titleize(vendor.lead_time)}`} />
              )}
              {vendor.years_in_operation && (
                <Chip variant="outlined" label={titleize(vendor.years_in_operation)} />
              )}
            </Stack>
            {vendor.biography && (
              <Typography sx={{ mt: 3 }} color="text.secondary">
                {vendor.biography}
              </Typography>
            )}
            <Divider sx={{ my: 4 }} />
            <Typography variant="h4" sx={{ mb: 1 }}>
              Reviews
            </Typography>
            <Typography color="text.secondary">
              Reviews appear after completed engagements.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: { md: 88 } }}>
              {vendor.starting_price != null && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Starting from
                  </Typography>
                  <Typography variant="h4">
                    {formatMoney(vendor.starting_price, vendor.starting_price_currency)}
                  </Typography>
                </Box>
              )}
              <VendorActions vendorId={vendor.id} />
              <Button
                component={RouterLink}
                to="/messages"
                fullWidth
                startIcon={<ChatIcon />}
                sx={{ mt: 1.5 }}
              >
                Message vendor
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </QueryState>
  );
}
