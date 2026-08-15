import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Divider,
  Stack,
  Typography,
  Link,
  StatusChip,
  HeroSurface,
  heroAvatarSx,
  heroDividerSx,
} from '@sinnapi/ui';
import type { BookingDetailModel, VendorRefModel } from '@/lib/types';
import BookingHeroMeta from '../molecules/BookingHeroMeta';

type Props = {
  booking: BookingDetailModel;
  vendor: VendorRefModel | null;
  timeWindow: string | null;
};

/**
 * Banner header: who the booking is with, what it is called, where it stands,
 * and the handful of facts worth reading at a glance. The vendor name links
 * through to their profile when we hold a slug — arriving at a booking is a
 * common reason to want to look the vendor up again.
 */
export default function BookingHero({ booking: b, vendor, timeWindow }: Props) {
  const name = vendor?.business_name ?? 'Vendor';

  return (
    <HeroSurface>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Avatar
          src={vendor?.primary_image_url ?? undefined}
          sx={{ ...heroAvatarSx, width: 56, height: 56 }}
        >
          {name.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              Booking {b.reference_no}
            </Typography>
            <StatusChip status={b.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
            {vendor?.slug ? (
              <Link
                component={RouterLink}
                to={`/discover/vendors/${vendor.slug}`}
                color="inherit"
                underline="hover"
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5, ...heroDividerSx }} />

      <Box sx={{ position: 'relative' }}>
        <BookingHeroMeta booking={b} timeWindow={timeWindow} />
      </Box>
    </HeroSurface>
  );
}
