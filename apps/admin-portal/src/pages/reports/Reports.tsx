import { Grid, Card, CardContent, Typography } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatCard from '@/components/ui/StatCard';
import QueryState from '@/components/ui/QueryState';
import { useReports } from './hooks/useReports';

// Reporting overview. Detailed report types (revenue, escrow flow, vendor growth,
// subscription churn) plug in here as read models / charts in a later pass.
export default function Reports() {
  const { data, isLoading, error } = useReports();
  return (
    <>
      <PageTitle title="Reports & analytics" subtitle="Platform overview." />
      <QueryState isLoading={isLoading} error={error}>
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <StatCard label="Active vendors" value={data?.activeVendors ?? 0} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label="Pending applications" value={data?.pendingApplications ?? 0} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label="Escrow held" value={data?.escrowHeld ?? 0} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label="Open disputes" value={data?.openDisputes ?? 0} />
          </Grid>
        </Grid>
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6">Detailed reports</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Revenue, escrow flow, vendor growth, and subscription churn reports plug in here (read
              models / charts).
            </Typography>
          </CardContent>
        </Card>
      </QueryState>
    </>
  );
}
