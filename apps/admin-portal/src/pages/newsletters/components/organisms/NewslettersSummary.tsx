import { Grid } from '@sinnapi/ui';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import SummaryTile from '@/components/ui/SummaryTile';
import type { NewsletterCampaignCounts } from '@/hooks/queries';

type Props = { counts?: NewsletterCampaignCounts; loading?: boolean };

/** KPI row above the table: drafts, scheduled, in flight, and sent. */
export default function NewslettersSummary({ counts, loading }: Props) {
  const tiles = [
    {
      label: 'Drafts',
      value: counts?.draft ?? 0,
      icon: <DraftsOutlinedIcon />,
      accent: 'default' as const,
    },
    {
      label: 'Scheduled',
      value: counts?.scheduled ?? 0,
      icon: <ScheduleOutlinedIcon />,
      accent: 'info' as const,
    },
    {
      // The only tile with an urgent accent: a campaign in this state is
      // actively mailing customers right now, and it is the one thing on this
      // page worth interrupting somebody for.
      label: 'Sending now',
      value: counts?.sending ?? 0,
      icon: <SendOutlinedIcon />,
      accent: 'secondary' as const,
    },
    {
      label: 'Sent',
      value: counts?.sent ?? 0,
      icon: <MarkEmailReadOutlinedIcon />,
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
