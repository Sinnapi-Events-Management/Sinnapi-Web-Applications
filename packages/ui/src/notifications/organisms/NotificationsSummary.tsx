'use client';
import { Grid } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import DraftsIcon from '@mui/icons-material/Drafts';
import { NotificationStatTile } from '../molecules/NotificationStatTile';
import type { NotificationCounts } from '../types';

export type NotificationsSummaryProps = {
  counts: NotificationCounts;
  loading?: boolean;
};

/**
 * The figures above the feed. Every one is server-exact, so they describe the
 * whole feed rather than the pages loaded so far — a tile that silently meant
 * "of the 25 rows fetched" would be worse than no tile.
 */
export function NotificationsSummary({ counts, loading }: NotificationsSummaryProps) {
  const tiles = [
    {
      label: 'Total',
      value: counts.all,
      icon: <NotificationsIcon />,
      accent: 'secondary' as const,
    },
    {
      label: 'Unread',
      value: counts.unread,
      icon: <MarkEmailUnreadIcon />,
      accent: 'warning' as const,
    },
    { label: 'Read', value: counts.read, icon: <DraftsIcon />, accent: 'success' as const },
  ];

  return (
    // Full width on phones, thirds from `sm`: three short labels fit a third of
    // the row comfortably at every size above that.
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {tiles.map((t) => (
        <Grid key={t.label} item xs={12} sm={4}>
          <NotificationStatTile {...t} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}
