import type { Metadata } from 'next';
import { Container, Grid, Paper, Typography } from '@sinnapi/ui';
import { PageHeader } from '@/components/common/SectionHeading';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Discover vendors, request quotes, book securely with escrow, and manage your event — all on Sinnapi.',
  alternates: { canonical: '/how-it-works' },
};

const CLIENT_STEPS = [
  ['Discover', 'Search verified vendors by category, region, and budget.'],
  ['Compare', 'Request and compare quotations side by side.'],
  ['Book securely', 'Pay directly or through Sinnapi Escrow for peace of mind.'],
  ['Manage', 'Chat, track bookings, and leave reviews after your event.'],
];
const VENDOR_STEPS = [
  ['Apply', 'Submit your application with documents and verification.'],
  ['Get verified', 'Pass due diligence and sign the vendor MOU.'],
  ['Go live', 'Enjoy a 30-day trial, then choose a subscription plan.'],
  ['Grow', 'Receive bookings, manage payouts, and build your reputation.'],
];

function Steps({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <>
      <Typography variant="h3" sx={{ mt: 4, mb: 2 }}>
        {title}
      </Typography>
      <Grid container spacing={3}>
        {steps.map(([t, b], i) => (
          <Grid item xs={12} sm={6} md={3} key={t}>
            <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
              <Typography variant="overline" color="primary">
                Step {i + 1}
              </Typography>
              <Typography variant="h6">{t}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {b}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How Sinnapi works"
        subtitle="Simple, safe, and built on trust — for clients and vendors alike."
      />
      <Container sx={{ py: 4 }}>
        <Steps title="For clients" steps={CLIENT_STEPS} />
        <Steps title="For vendors" steps={VENDOR_STEPS} />
      </Container>
    </>
  );
}
