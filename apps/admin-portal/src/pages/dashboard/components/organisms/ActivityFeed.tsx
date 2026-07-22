import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Divider, Stack, Typography } from '@sinnapi/ui';
import HistoryIcon from '@mui/icons-material/History';
import SectionCard from '@/components/ui/SectionCard';
import type { ActivityModel } from '../../schema';
import ActivityItem from '../molecules/ActivityItem';
import ActivityItemSkeleton from '../molecules/ActivityItemSkeleton';

type Props = {
  activity: ActivityModel[] | null;
  loading: boolean;
};

const SKELETON_ROWS = 6;

/**
 * The newest entries from the audit trail — "what just happened on the
 * platform". Deliberately short and read-only: it exists to prompt a click
 * through to the full log, not to replace it.
 */
export default function ActivityFeed({ activity, loading }: Props) {
  const rows = activity ?? [];

  return (
    <SectionCard
      title="Recent activity"
      subtitle="Latest changes across the platform"
      icon={<HistoryIcon />}
      accent="info"
      sx={{ height: '100%' }}
      action={
        <Button component={RouterLink} to="/audit" size="small" sx={{ textTransform: 'none' }}>
          View all
        </Button>
      }
    >
      {loading && (
        <Stack divider={<Divider flexItem />}>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </Stack>
      )}

      {!loading && rows.length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No recorded activity yet.
          </Typography>
        </Box>
      )}

      {!loading && rows.length > 0 && (
        <Stack divider={<Divider flexItem />}>
          {rows.map((entry) => (
            <ActivityItem key={entry.id} entry={entry} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
