import { Grid } from '@sinnapi/ui';
import FlagIcon from '@mui/icons-material/Flag';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BlockIcon from '@mui/icons-material/Block';
import DoDisturbOnIcon from '@mui/icons-material/DoDisturbOn';
import SummaryTile from '@/components/ui/SummaryTile';
import type { FlagCounts } from '../../schema';

type Props = {
  counts: FlagCounts;
  loading?: boolean;
};

/** KPI summary bar sitting above the queue: total, open, actioned, dismissed. */
export default function ModerationSummary({ counts, loading }: Props) {
  const tiles = [
    { label: 'Total flags', value: counts.all, icon: <FlagIcon />, accent: 'default' as const },
    { label: 'Open', value: counts.open, icon: <PendingActionsIcon />, accent: 'warning' as const },
    { label: 'Actioned', value: counts.actioned, icon: <BlockIcon />, accent: 'error' as const },
    {
      label: 'Dismissed',
      value: counts.dismissed,
      icon: <DoDisturbOnIcon />,
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
