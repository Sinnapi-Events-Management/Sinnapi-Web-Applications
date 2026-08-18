import { Grid } from '@sinnapi/ui';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import SummaryTile from '@/components/ui/SummaryTile';
import type { NewsletterCampaignCounts } from '@/hooks/queries';

type Props = { counts?: NewsletterCampaignCounts; loading?: boolean };

/**
 * KPI row above the table: drafts, in flight, and sent.
 *
 * No `Scheduled` tile. Sending is immediate for now — a campaign passes through
 * `scheduled` for the instant between the RPC and the claim, so the tile could
 * only ever read zero, and a permanently-zero counter reads as a broken feature
 * rather than an absent one. Restore it with scheduling itself.
 */
export default function NewslettersSummary({ counts, loading }: Props) {
  const tiles = [
    {
      label: 'Drafts',
      value: counts?.draft ?? 0,
      icon: <DraftsOutlinedIcon sx={{ color: 'text.secondary' }} />,
      accent: 'default' as const,
    },
    {
      // The only tile with an urgent accent: a campaign in this state is
      // actively mailing customers right now, and it is the one thing on this
      // page worth interrupting somebody for.
      label: 'Sending now',
      value: counts?.sending ?? 0,
      icon: <SendOutlinedIcon sx={{ color: 'white' }} />,
      accent: 'secondary' as const,
    },
    {
      label: 'Sent',
      value: counts?.sent ?? 0,
      icon: <MarkEmailReadOutlinedIcon sx={{ color: 'white' }} />,
      accent: 'success' as const,
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {tiles.map((t) => (
        <Grid key={t.label} item xs={12} sm={4}>
          <SummaryTile {...t} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}
