import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { VendorRefModel } from '@/lib/types';

type Props = { vendor: VendorRefModel | null };

/**
 * Who the client is dealing with, and the way back to their listing.
 *
 * The hero names the vendor too, but the hero scrolls away and this does not:
 * a client reading the facts of a booking on a phone is several screens below
 * it. The link is the point — checking what was actually being booked is the
 * usual reason to look a vendor up again mid-booking, and the alternative is a
 * search from the discover page.
 *
 * Messaging deliberately lives in the pinned action bar instead of here. It is
 * available in every state of the booking, so it belongs where it is always
 * reachable rather than inside a section.
 */
export default function BookingVendorCard({ vendor }: Props) {
  const name = vendor?.business_name ?? 'Vendor';

  return (
    <SectionCard title="Your vendor" icon={<StorefrontOutlinedIcon />} accent="info">
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            src={vendor?.primary_image_url ?? undefined}
            sx={{ width: 48, height: 48, flexShrink: 0 }}
          >
            {name.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              The business delivering this booking
            </Typography>
          </Box>
        </Stack>

        {/* Only when we hold a slug: a vendor who has never published a listing
            has no page to send anyone to, and a dead link reads worse than no
            link at all. */}
        {vendor?.slug && (
          <Button
            component={RouterLink}
            to={`/discover/vendors/${vendor.slug}`}
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            sx={{ alignSelf: 'flex-start' }}
          >
            View profile
          </Button>
        )}
      </Stack>
    </SectionCard>
  );
}
