import { Link as RouterLink } from 'react-router-dom';
import { Grid, Card, CardContent, Typography, Button, Stack, Box, Alert } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import StarIcon from '@mui/icons-material/Star';
import PageTitle from '@/components/ui/PageTitle';
import StatCard from '@/components/ui/StatCard';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate } from '@/lib/config';
import { useDashboard } from './hooks/useDashboard';

export default function Dashboard() {
  const { vendor, subscription, loading, dash, app } = useDashboard();

  if (loading)
    return (
      <QueryState isLoading error={null}>
        {null}
      </QueryState>
    );

  if (!vendor) {
    return (
      <>
        <PageTitle
          title="Welcome to Sinnapi for Vendors"
          subtitle="Let's get your business listed."
        />
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Application status
            </Typography>
            {app.data ? (
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <StatusChip status={app.data.status} />
                  {app.data.is_reapplication && (
                    <Typography variant="caption" color="text.secondary">
                      (re-application)
                    </Typography>
                  )}
                </Box>
                {app.data.status === 'rejected' && app.data.rejection_reason && (
                  <Alert severity="error">{app.data.rejection_reason}</Alert>
                )}
                <Button
                  component={RouterLink}
                  to="/onboarding"
                  variant="contained"
                  sx={{ alignSelf: 'flex-start', mt: 1 }}
                >
                  View onboarding
                </Button>
              </Stack>
            ) : (
              <>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  You haven't started an application yet.
                </Typography>
                <Button component={RouterLink} to="/onboarding" variant="contained">
                  Start application
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={`Welcome, ${vendor.business_name}`}
        subtitle="Your vendor activity at a glance."
        action={subscription && <StatusChip status={subscription.status} size="medium" />}
      />
      {subscription?.status === 'trialing' && vendor.trial_ends_at && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Free trial active — ends {formatDate(vendor.trial_ends_at)}. Choose a plan before then to
          stay visible.
        </Alert>
      )}
      <QueryState isLoading={dash.isLoading} error={dash.error}>
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Booking requests"
              value={dash.data?.bookingRequests ?? 0}
              to="/bookings"
              icon={<EventNoteIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Quote requests"
              value={dash.data?.quoteRequests ?? 0}
              to="/quotations"
              icon={<RequestQuoteIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="In escrow"
              value={dash.data?.escrowHeld ?? 0}
              to="/escrow"
              icon={<AccountBalanceIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Reviews"
              value={dash.data?.reviews ?? 0}
              to="/reviews"
              icon={<StarIcon />}
            />
          </Grid>
        </Grid>
      </QueryState>
    </>
  );
}
