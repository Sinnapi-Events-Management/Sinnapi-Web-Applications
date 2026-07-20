import { Grid, StatCard } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CelebrationIcon from '@mui/icons-material/Celebration';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { ClientKpis } from '@/lib/types';

type Props = { kpis?: ClientKpis };

/** KPI row: the client's headline engagement counts at a glance. */
export default function ClientStats({ kpis }: Props) {
  const cards = [
    { label: 'Bookings', value: kpis?.bookings, icon: <EventNoteIcon /> },
    { label: 'Events', value: kpis?.events, icon: <CelebrationIcon /> },
    { label: 'Quotations', value: kpis?.quotations, icon: <RequestQuoteIcon /> },
    { label: 'Vendors', value: kpis?.vendors, icon: <StorefrontIcon /> },
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
