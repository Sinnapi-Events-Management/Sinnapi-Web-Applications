import { Grid } from '@sinnapi/ui';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import UnsubscribeOutlinedIcon from '@mui/icons-material/UnsubscribeOutlined';
import BlockIcon from '@mui/icons-material/Block';
import SummaryTile from '@/components/ui/SummaryTile';
import type { MarketingSubscriptionCounts } from '@/hooks/queries';

type Props = { counts?: MarketingSubscriptionCounts; loading?: boolean };

/**
 * The state of the list.
 *
 * `Awaiting confirmation` is the tile worth watching: a persistently large
 * number there means the double opt-in email is not arriving or is not
 * convincing, and every one of those people believes they subscribed.
 */
export default function SubscribersSummary({ counts, loading }: Props) {
  const tiles = [
    {
      label: 'Subscribed',
      value: counts?.subscribed ?? 0,
      icon: <MarkEmailReadOutlinedIcon />,
      accent: 'success' as const,
    },
    {
      label: 'Awaiting confirmation',
      value: counts?.pending ?? 0,
      icon: <HourglassEmptyIcon />,
      accent: 'warning' as const,
    },
    {
      label: 'Unsubscribed',
      value: counts?.unsubscribed ?? 0,
      icon: <UnsubscribeOutlinedIcon />,
      accent: 'default' as const,
    },
    {
      label: 'Suppressed',
      value: counts?.suppressed ?? 0,
      icon: <BlockIcon />,
      accent: 'error' as const,
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
