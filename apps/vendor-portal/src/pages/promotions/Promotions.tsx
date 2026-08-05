import { Grid, Button, Stack } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { usePromotions } from './hooks/usePromotions';
import PromotionCard from './components/molecules/PromotionCard';
import PromotionDialog from './components/organisms/PromotionDialog';

function PromotionsList({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, openDialog, closeDialog } = usePromotions(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          New promotion
        </Button>
      </Stack>
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No promotions"
            description="Run a promotion to attract more clients."
          />
        ) : (
          <Grid container spacing={3}>
            {rows.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <PromotionCard promotion={p} />
              </Grid>
            ))}
          </Grid>
        )}
      </QueryState>

      <PromotionDialog open={open} vendorId={vendorId} onClose={closeDialog} />
    </>
  );
}

export default function Promotions() {
  return (
    <>
      <PageTitle title="Promotions" subtitle="Promote your services to clients." />
      <VendorGate>{(vendorId) => <PromotionsList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
