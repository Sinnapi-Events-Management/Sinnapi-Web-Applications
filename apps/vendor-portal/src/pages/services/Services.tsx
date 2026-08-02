import { Grid, Button, Stack } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { useServices } from './hooks/useServices';
import ServiceCard from './components/molecules/ServiceCard';
import ServiceDialog from './components/organisms/ServiceDialog';

function ServicesList({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, openDialog, closeDialog } = useServices(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          Add service
        </Button>
      </Stack>
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No services yet"
            description="Add the services you offer so clients can find and book them."
          />
        ) : (
          <Grid container spacing={3}>
            {rows.map((s) => (
              <Grid item xs={12} sm={6} md={4} key={s.id}>
                <ServiceCard service={s} />
              </Grid>
            ))}
          </Grid>
        )}
      </QueryState>

      <ServiceDialog open={open} vendorId={vendorId} onClose={closeDialog} />
    </>
  );
}

export default function Services() {
  return (
    <>
      <PageTitle title="Services" subtitle="Manage the services you offer." />
      <VendorGate>{(vendorId) => <ServicesList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
