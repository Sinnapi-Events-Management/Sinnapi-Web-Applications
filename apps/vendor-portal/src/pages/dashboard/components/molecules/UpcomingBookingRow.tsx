import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, StatusChip } from '@sinnapi/ui';
import PlaceIcon from '@mui/icons-material/Place';
import type { UpcomingModel } from '../../schema';

type Props = { booking: UpcomingModel };

/**
 * One committed date. The countdown leads because that is how a vendor plans —
 * "this weekend" is the actionable fact and the calendar date is the precise
 * one, so both are present with the countdown carrying the emphasis.
 *
 * Laid out as a row that wraps rather than a table: on a phone the amount and
 * status drop under the client name instead of forcing a horizontal scroll.
 */
export default function UpcomingBookingRow({ booking }: Props) {
  return (
    <Stack
      component={RouterLink}
      to={booking.to}
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        py: 1.25,
        px: 0.5,
        borderRadius: 2,
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          width: 76,
          flexShrink: 0,
          textAlign: 'center',
          py: 0.75,
          borderRadius: 2,
          bgcolor: 'action.selected',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.3 }}>
          {booking.countdown}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {booking.eventDate}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {booking.clientName}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {booking.reference}
          </Typography>
          {/* The venue is context, not the point — dropped on phones, where the
              reference, the amount and the status have to share one line. */}
          {booking.location && (
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
              }}
            >
              <PlaceIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {booking.location}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          {booking.amount}
        </Typography>
        <StatusChip status={booking.status} size="small" />
      </Stack>
    </Stack>
  );
}
