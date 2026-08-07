import { Chip, Rating, Stack, Typography } from '@sinnapi/ui';
import VerifiedIcon from '@mui/icons-material/Verified';
import PlaceIcon from '@mui/icons-material/Place';
import { titleize } from '@/lib/config';
import type { VendorDetailModel } from '@/lib/types';

/** Name, credentials and at-a-glance terms — everything above the portfolio. */
export default function VendorHeadline({ vendor }: { vendor: VendorDetailModel }) {
  return (
    <>
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
    </>
  );
}
