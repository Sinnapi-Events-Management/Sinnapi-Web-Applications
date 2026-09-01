import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, StatusChip, Typography, HeroSurface } from '@sinnapi/ui';
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
 *
 * Sized down on a phone, where this banner is now followed by the status bar
 * and a five-tab bar before any content begins: at `h4` on a 360px screen the
 * reference wrapped onto two lines before the status chip had anywhere to sit.
 * The facts strip condenses to the money and the escrow state — see
 * `BookingHeroMeta`.
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
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ lineHeight: 1.15, fontSize: { xs: '1.375rem', sm: '2.125rem' } }}
            >
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
          sx={{ flexShrink: 0 }}
        >
          All bookings
        </Button>
      </Stack>

      <BookingHeroMeta booking={b} timeWindow={timeWindow} />
    </HeroSurface>
  );
}
