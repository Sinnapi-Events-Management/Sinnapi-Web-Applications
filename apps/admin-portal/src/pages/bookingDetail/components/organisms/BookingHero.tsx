import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Stack,
  StatusChip,
  Typography,
  HeroSurface,
  heroDividerSx,
} from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { BookingAdminModel } from '@/lib/types';
import BookingHeroMeta from '../molecules/BookingHeroMeta';

type Props = {
  booking: BookingAdminModel;
  timeWindow: string | null;
};

/**
 * Banner header: which booking this is, where it stands, and the handful of
 * facts an operator checks before reading anything else — who it is between,
 * when it happens and what it is worth.
 */
export default function BookingHero({ booking: b, timeWindow }: Props) {
  return (
    <HeroSurface>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              Booking {b.reference_no ?? '—'}
            </Typography>
            <StatusChip status={b.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
            {b.vendor.name ?? 'Vendor'} · {b.client.name ?? 'Client'}
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to="/bookings"
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
        >
          All bookings
        </Button>
      </Stack>

      <Divider sx={{ my: 2.5, ...heroDividerSx }} />

      <Box sx={{ position: 'relative' }}>
        <BookingHeroMeta booking={b} timeWindow={timeWindow} />
      </Box>
    </HeroSurface>
  );
}
