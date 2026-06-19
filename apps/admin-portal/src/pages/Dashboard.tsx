import { Grid } from '@sinnapi/ui';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PageTitle from '@/components/ui/PageTitle';
import StatCard from '@/components/ui/StatCard';
import QueryState from '@/components/ui/QueryState';
import { useAdminDashboard } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';

export default function Dashboard() {
  const { roles } = useAdmin();
  const { data, isLoading, error } = useAdminDashboard();
  return (
    <>
      <PageTitle
        title="Admin dashboard"
        subtitle={`Signed in as ${roles.join(', ') || 'admin'}.`}
      />
      <QueryState isLoading={isLoading} error={error}>
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Pending applications"
              value={data?.pendingApplications ?? 0}
              to="/applications"
              icon={<AssignmentTurnedInIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Pending payouts"
              value={data?.pendingPayouts ?? 0}
              to="/payouts"
              icon={<PaymentsIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Open disputes"
              value={data?.openDisputes ?? 0}
              to="/disputes"
              icon={<GavelIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Escrow held"
              value={data?.escrowHeld ?? 0}
              to="/escrow"
              icon={<AccountBalanceIcon />}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label="Active vendors"
              value={data?.activeVendors ?? 0}
              to="/vendors"
              icon={<StorefrontIcon />}
            />
          </Grid>
        </Grid>
      </QueryState>
    </>
  );
}
