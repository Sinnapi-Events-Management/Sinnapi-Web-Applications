import { Box, StatusChip, Stack, Typography } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import { formatDate, formatMoney } from '@/lib/config';
import type { VendorEventBookingModel } from '@/lib/types';

type Props = { booking: VendorEventBookingModel };

/**
 * One booking this vendor holds on the event.
 *
 * Deliberately thin. The booking's own page owns the payment window, the escrow,
 * the settlement and every control — repeating any of it here would be a second
 * place for a vendor to read a deadline, and the two would eventually disagree.
 * This row exists to answer one question the event page raises ("did this brief
 * turn into work?") and to hand over to the page that answers the rest.
 */
export default function BookingSummaryCard({ booking }: Props) {
  const time = [booking.start_time, booking.end_time].filter(Boolean).join(' – ');

  return (
    <Box
      sx={{
        position: 'relative',
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        transition: (t) => t.transitions.create(['border-color', 'box-shadow']),
        '&:hover': { borderColor: 'secondary.main', boxShadow: 2 },
        '&:focus-within': {
          borderColor: 'secondary.main',
          outline: '2px solid',
          outlineColor: 'secondary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0 }}>
              <AppLink
                to={`/bookings/${booking.id}`}
                color="text.primary"
                sx={{ '&::after': { content: '""', position: 'absolute', inset: 0 } }}
              >
                {booking.reference_no ?? 'Booking'}
              </AppLink>
            </Typography>
            <StatusChip status={booking.status} />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {[formatDate(booking.event_date), time, booking.location].filter(Boolean).join(' · ')}
          </Typography>
        </Stack>

        <Typography variant="h6" sx={{ flexShrink: 0 }}>
          {formatMoney(booking.amount, booking.currency)}
        </Typography>
      </Stack>
    </Box>
  );
}
