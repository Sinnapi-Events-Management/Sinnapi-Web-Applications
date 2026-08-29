import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Divider, Skeleton, Stack, Typography, SectionCard } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { UpcomingModel } from '../../schema';
import UpcomingBookingRow from '../molecules/UpcomingBookingRow';

type Props = {
  upcoming: UpcomingModel[];
  /** Confirmed work still ahead, as money — the reason this card outranks a list. */
  pipelineValue: string;
  loading: boolean;
};

const SKELETON_ROWS = 4;

/**
 * The vendor's diary: the next dates they are committed to, nearest first.
 *
 * This is the one dashboard question the queues cannot answer — a queue says
 * what is waiting on a reply, this says what is waiting on the vendor showing
 * up. The card is capped at five rows and links out; it prompts the calendar,
 * it does not replace it.
 */
export default function UpcomingBookings({ upcoming, pipelineValue, loading }: Props) {
  return (
    <SectionCard
      title="Coming up"
      subtitle={`${pipelineValue} of confirmed work ahead`}
      icon={<EventAvailableIcon />}
      accent="primary"
      sx={{ height: '100%' }}
      action={
        <Button component={RouterLink} to="/calendar" size="small" sx={{ textTransform: 'none' }}>
          Calendar
        </Button>
      }
    >
      {loading && (
        <Stack divider={<Divider flexItem />}>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.25 }}>
              <Skeleton variant="rounded" width={76} height={44} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="text" width="35%" height={14} />
              </Box>
            </Stack>
          ))}
        </Stack>
      )}

      {!loading && upcoming.length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No confirmed dates ahead.
          </Typography>
          <Button
            component={RouterLink}
            to="/services"
            size="small"
            sx={{ textTransform: 'none', mt: 1 }}
          >
            Review your services
          </Button>
        </Box>
      )}

      {!loading && upcoming.length > 0 && (
        <Stack divider={<Divider flexItem />}>
          {upcoming.map((booking) => (
            <UpcomingBookingRow key={booking.id} booking={booking} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
