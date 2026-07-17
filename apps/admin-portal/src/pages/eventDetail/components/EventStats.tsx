import { Grid, StatCard } from '@sinnapi/ui';
import GroupsIcon from '@mui/icons-material/Groups';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DoDisturbOnOutlinedIcon from '@mui/icons-material/DoDisturbOnOutlined';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import type { EventEngagementKpis } from '@/lib/types';

type Props = { kpis?: EventEngagementKpis };

/** KPI row: how vendors have engaged with this event, at a glance. */
export default function EventStats({ kpis }: Props) {
  const cards = [
    { label: 'Interested', value: kpis?.interested, icon: <GroupsIcon /> },
    { label: 'Shortlisted', value: kpis?.shortlisted, icon: <PlaylistAddCheckIcon /> },
    { label: 'Declined', value: kpis?.declined, icon: <DoDisturbOnOutlinedIcon /> },
    { label: 'Quotations', value: kpis?.quotations, icon: <RequestQuoteIcon /> },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((c) => (
        <Grid item xs={6} md={3} key={c.label}>
          <StatCard label={c.label} value={c.value ?? '—'} icon={c.icon} />
        </Grid>
      ))}
    </Grid>
  );
}
