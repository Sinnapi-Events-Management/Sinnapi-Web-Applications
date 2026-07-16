import { Grid, StatCard } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import type { VendorKpis } from '@/lib/types';

type Props = { kpis?: VendorKpis };

/** Stripe-style KPI row: the vendor's headline counts at a glance. */
export default function VendorStats({ kpis }: Props) {
  const cards = [
    { label: 'Bookings', value: kpis?.bookings, icon: <EventNoteIcon /> },
    { label: 'Orders', value: kpis?.quotations, icon: <RequestQuoteIcon /> },
    { label: 'Payments', value: kpis?.payments, icon: <ReceiptLongIcon /> },
    { label: 'Payouts', value: kpis?.payouts, icon: <PaymentsIcon /> },
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
