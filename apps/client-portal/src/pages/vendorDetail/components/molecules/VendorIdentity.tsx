import { Rating, Stack, Typography } from '@sinnapi/ui';
import VerifiedIcon from '@mui/icons-material/Verified';
import PlaceIcon from '@mui/icons-material/Place';
import type { VendorDetailModel } from '@/lib/types';

/**
 * Who this is: name, verification, base city and rating.
 *
 * The one block that sits above the tabs and never changes with them. Whichever
 * section a visitor is reading — a calendar, a price table, a wall of photos —
 * the page has to keep saying whose it is, and a heading that disappears when
 * you switch tabs makes a page that could be about anyone.
 *
 * The heading drops from `h2` to `h4`-scale type on a phone: the business name
 * is the longest string on the page and the one most likely to wrap to three
 * lines, which on a 360px screen pushes the tab bar below the fold.
 */
export default function VendorIdentity({ vendor }: { vendor: VendorDetailModel }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          variant="h2"
          sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' }, lineHeight: 1.15 }}
        >
          {vendor.business_name}
        </Typography>
        <VerifiedIcon color="primary" titleAccess="Verified vendor" sx={{ flexShrink: 0 }} />
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        // Wraps rather than scrolls: city and rating are two short facts and on
        // a narrow screen they read fine stacked, where a horizontal overflow
        // would hide one of them entirely.
        sx={{ flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}
      >
        {vendor.base_city && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PlaceIcon fontSize="small" />
            <Typography variant="body2">{vendor.base_city}</Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Rating value={vendor.avg_rating} precision={0.5} size="small" readOnly />
          <Typography variant="body2">
            {Number(vendor.avg_rating).toFixed(1)} ({vendor.review_count})
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}
