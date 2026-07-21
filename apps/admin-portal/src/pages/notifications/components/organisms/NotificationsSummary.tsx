import { Grid } from '@sinnapi/ui';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import DraftsIcon from '@mui/icons-material/Drafts';
import SummaryTile from '@/components/ui/SummaryTile';
import type { NotificationCounts } from '../../schema';

type Props = {
  counts: NotificationCounts;
  loading?: boolean;
};

/**
 * KPI bar above the feed. Every figure is server-exact, so it describes the
 * whole feed rather than the pages loaded so far.
 */
export default function NotificationsSummary({ counts, loading }: Props) {
  const tiles = [
    {
      label: 'Total',
      value: counts.all,
      icon: <NotificationsIcon />,
      accent: 'default' as const,
    },
    {
      label: 'Unread',
      value: counts.unread,
      icon: <MarkEmailUnreadIcon sx={{ color: 'white' }} />,
      accent: 'warning' as const,
    },
    { label: 'Read', value: counts.read, icon: <DraftsIcon />, accent: 'default' as const },
  ];

  return (
    // Full width on phones, thirds from `sm`: three short labels fit a third of
    // the row comfortably at every size above that.
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {tiles.map((t) => (
        <Grid key={t.label} item xs={12} sm={4}>
          <SummaryTile {...t} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}
