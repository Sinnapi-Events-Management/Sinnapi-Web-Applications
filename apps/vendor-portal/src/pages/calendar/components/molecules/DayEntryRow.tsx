import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@sinnapi/ui';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { IconBadge } from '@sinnapi/ui';
import { isBookingBlock, DAY_LOOK } from '../../schema';
import type { BlockedDateModel } from '@/lib/types';

type Props = {
  row: BlockedDateModel;
  onUnblock: (id: string) => void;
  removing: boolean;
};

/**
 * One thing occupying the selected day, with whatever can still be done to it.
 *
 * A confirmed booking offers a way through to the job; a manual block offers
 * the way out of it. Nothing else belongs here — the panel is what a vendor
 * reads after tapping a date, and a list of inert facts would not have been
 * worth the tap.
 */
export default function DayEntryRow({ row, onUnblock, removing }: Props) {
  const fromBooking = isBookingBlock(row);
  const look = fromBooking ? DAY_LOOK.booked : DAY_LOOK.blocked;

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1 }}>
      <IconBadge accent={look.accent} size={36}>
        {fromBooking ? <EventAvailableIcon /> : <EventBusyIcon />}
      </IconBadge>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2">
          {fromBooking ? 'Confirmed booking' : 'Blocked by you'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {fromBooking
            ? (row.bookings?.reference_no ?? 'Reference unavailable')
            : (row.reason ?? 'No reason given')}
        </Typography>

        {fromBooking
          ? row.bookings?.id && (
              <Button
                component={RouterLink}
                to={`/bookings/${row.bookings.id}`}
                size="small"
                sx={{ mt: 0.5, px: 0, textTransform: 'none' }}
              >
                Open booking
              </Button>
            )
          : null}
      </Box>

      {!fromBooking && (
        <Button
          size="small"
          color="error"
          onClick={() => onUnblock(row.id)}
          disabled={removing}
          startIcon={removing ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ flexShrink: 0, textTransform: 'none' }}
        >
          {removing ? 'Removing…' : 'Unblock'}
        </Button>
      )}
    </Stack>
  );
}
