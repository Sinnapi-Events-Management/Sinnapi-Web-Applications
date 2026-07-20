import { Grid } from '@sinnapi/ui';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SummaryTile from '../molecules/SummaryTile';
import type { NotificationTemplateStats } from '@/hooks/queries';

type Props = {
  stats?: NotificationTemplateStats;
  loading?: boolean;
};

/** KPI summary bar above the table: total, email, in-app, and active counts. */
export default function TemplatesSummary({ stats, loading }: Props) {
  const tiles = [
    {
      label: 'Total templates',
      value: stats?.all ?? 0,
      icon: <LayersOutlinedIcon />,
      accent: 'default' as const,
    },
    {
      label: 'Email',
      value: stats?.email ?? 0,
      icon: <EmailOutlinedIcon />,
      accent: 'primary' as const,
    },
    {
      label: 'In-app',
      value: stats?.in_app ?? 0,
      icon: <NotificationsNoneOutlinedIcon />,
      accent: 'info' as const,
    },
    {
      label: 'Active',
      value: stats?.active ?? 0,
      icon: <CheckCircleOutlineIcon />,
      accent: 'success' as const,
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {tiles.map((t) => (
        <Grid key={t.label} item xs={6} md={3}>
          <SummaryTile {...t} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}
