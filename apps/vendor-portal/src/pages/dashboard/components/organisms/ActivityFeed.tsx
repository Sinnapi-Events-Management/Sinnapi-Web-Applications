import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Divider, Stack, Typography, SectionCard } from '@sinnapi/ui';
import HistoryIcon from '@mui/icons-material/History';
import type { ActivityModel } from '../../schema';
import ActivityRow from '../molecules/ActivityRow';
import ActivityRowSkeleton from '../molecules/ActivityRowSkeleton';

type Props = {
  activity: ActivityModel[];
  loading: boolean;
};

const SKELETON_ROWS = 6;

/**
 * What just changed on the vendor's own records — bookings and quotations
 * interleaved, newest first. Read-only and short: every row links to the record
 * it describes, which is the whole job of a feed on a landing page.
 */
export default function ActivityFeed({ activity, loading }: Props) {
  return (
    <SectionCard
      title="Recent activity"
      subtitle="Latest changes on your bookings and quotes"
      icon={<HistoryIcon />}
      accent="info"
      sx={{ height: '100%' }}
      action={
        <Button component={RouterLink} to="/bookings" size="small" sx={{ textTransform: 'none' }}>
          View all
        </Button>
      }
    >
      {loading && (
        <Stack divider={<Divider flexItem />}>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <ActivityRowSkeleton key={i} />
          ))}
        </Stack>
      )}

      {!loading && activity.length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nothing has moved yet.
          </Typography>
        </Box>
      )}

      {!loading && activity.length > 0 && (
        <Stack divider={<Divider flexItem />}>
          {activity.map((entry) => (
            <ActivityRow key={`${entry.kind}-${entry.id}`} entry={entry} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
