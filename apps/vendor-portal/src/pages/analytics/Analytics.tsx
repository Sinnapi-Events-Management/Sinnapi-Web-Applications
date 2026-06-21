import { Grid, Card, CardContent, Typography, Alert } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import StarIcon from '@mui/icons-material/Star';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PageTitle from '@/components/ui/PageTitle';
import StatCard from '@/components/ui/StatCard';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { useAnalytics } from './hooks/useAnalytics';

// Client analytics is a Professional/Elite entitlement. Detailed charts would be
// gated on the plan's `client_analytics` feature; this summary is always shown.
function AnalyticsView({ vendorId }: { vendorId: string }) {
  const { dash } = useAnalytics(vendorId);
  return (
    <>
      <Alert severity="info" sx={{ mb: 3 }}>
        Detailed client analytics (views, conversion, trends) are available on the Professional and
        Elite plans.
      </Alert>
      <QueryState isLoading={dash.isLoading} error={dash.error}>
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Booking requests"
              value={dash.data?.bookingRequests ?? 0}
              icon={<EventNoteIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Quote requests"
              value={dash.data?.quoteRequests ?? 0}
              icon={<RequestQuoteIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="In escrow"
              value={dash.data?.escrowHeld ?? 0}
              icon={<AccountBalanceIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label="Reviews" value={dash.data?.reviews ?? 0} icon={<StarIcon />} />
          </Grid>
        </Grid>
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6">Trends</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Charts appear here as your activity grows (plan-gated).
            </Typography>
          </CardContent>
        </Card>
      </QueryState>
    </>
  );
}

export default function Analytics() {
  return (
    <>
      <PageTitle title="Analytics" subtitle="Understand your performance on Sinnapi." />
      <VendorGate>{(vendorId) => <AnalyticsView vendorId={vendorId} />}</VendorGate>
    </>
  );
}
