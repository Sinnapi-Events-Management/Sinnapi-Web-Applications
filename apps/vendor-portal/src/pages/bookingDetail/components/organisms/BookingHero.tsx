import {
  Avatar,
  Box,
  Divider,
  Stack,
  Typography,
  StatusChip,
  HeroSurface,
  heroAvatarSx,
  heroDividerSx,
} from '@sinnapi/ui';
import type { ProfileContactRel, VendorBookingDetailModel } from '@/lib/types';
import HeroMetaStrip from '../molecules/HeroMetaStrip';

type Props = {
  booking: VendorBookingDetailModel;
  client: ProfileContactRel | null;
  timeWindow: string | null;
};

/**
 * Banner header: who the booking is for, what it is called, where it stands,
 * and the handful of facts worth reading at a glance.
 */
export default function BookingHero({ booking: b, client, timeWindow }: Props) {
  const name = client?.full_name ?? 'Client';

  return (
    <HeroSurface>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Avatar sx={{ ...heroAvatarSx, width: 56, height: 56 }}>{name.charAt(0)}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              Booking {b.reference_no}
            </Typography>
            <StatusChip status={b.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }} noWrap>
            {name}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5, ...heroDividerSx }} />

      <Box sx={{ position: 'relative' }}>
        <HeroMetaStrip booking={b} timeWindow={timeWindow} />
      </Box>
    </HeroSurface>
  );
}
