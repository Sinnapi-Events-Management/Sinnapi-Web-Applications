import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@sinnapi/ui';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { describeBlock, isBookingBlock, DAY_LOOK } from '../../schema';
import type { BlockedDateModel } from '@/lib/types';

type Props = {
  row: BlockedDateModel;
  onUnblock: (id: string) => void;
  onSelect: (date: string) => void;
  removing: boolean;
};

/**
 * One unavailable day in the agenda: what it is, and the only action left on it.
 *
 * A booking-derived block gets a chip instead of a delete button — it clears
 * when the booking does, and offering a control that would fail RLS is worse
 * than offering none. Its reference links to the booking, because "why is the
 * 18th gone?" is answered by the job, not by this row.
 */
export default function BlockedDateRow({ row, onUnblock, onSelect, removing }: Props) {
  const { title, detail } = describeBlock(row);
  const fromBooking = isBookingBlock(row);
  const look = fromBooking ? DAY_LOOK.booked : DAY_LOOK.blocked;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        py: 1.25,
        px: 1,
        borderRadius: 2,
        transition: (t) => t.transitions.create('background-color'),
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 4,
          alignSelf: 'stretch',
          borderRadius: 2,
          flexShrink: 0,
          bgcolor: `${look.accent}.main`,
        }}
      />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        {/* The date is the control: pressing it moves the grid and the day panel
            to that day, so the agenda and the calendar are two views of one
            selection rather than two lists. */}
        <Button
          onClick={() => onSelect(row.blocked_date)}
          sx={{
            p: 0,
            minWidth: 0,
            minHeight: 0,
            textTransform: 'none',
            justifyContent: 'flex-start',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {title}
        </Button>
        {detail && (
          <Typography variant="body2" color="text.secondary" noWrap title={detail}>
            {detail}
          </Typography>
        )}
      </Box>

      {fromBooking ? (
        row.bookings?.id ? (
          <Chip
            size="small"
            label="View booking"
            variant="outlined"
            clickable
            component={RouterLink}
            to={`/bookings/${row.bookings.id}`}
          />
        ) : (
          <Chip size="small" label="Booking" color="secondary" variant="outlined" />
        )
      ) : (
        <Tooltip title="Remove this block">
          <span>
            <IconButton
              aria-label={`Remove block on ${title}`}
              onClick={() => onUnblock(row.id)}
              disabled={removing}
              size="small"
            >
              {removing ? <CircularProgress size={18} /> : <DeleteOutlineIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
}
