import { Grid, Button, Stack, PageTitle, QueryState } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import VendorGate from '@/vendor/VendorGate';
import { useTemplates } from './hooks/useTemplates';
import TemplateCard from './components/molecules/TemplateCard';
import TemplateDialog from './components/organisms/TemplateDialog';
import { EmptyState } from '@sinnapi/ui/router';

function TemplatesList({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, openDialog, closeDialog } = useTemplates(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          New template
        </Button>
      </Stack>
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No quote templates"
            description="Create reusable templates to build quotes faster."
          />
        ) : (
          <Grid container spacing={3}>
            {rows.map((t) => (
              <Grid item xs={12} sm={6} md={4} key={t.id}>
                <TemplateCard template={t} />
              </Grid>
            ))}
          </Grid>
        )}
      </QueryState>

      <TemplateDialog open={open} vendorId={vendorId} onClose={closeDialog} />
    </>
  );
}

export default function Templates() {
  return (
    <>
      <PageTitle
        title="Quote templates"
        subtitle="Reusable line-item templates for faster quoting."
      />
      <VendorGate>{(vendorId) => <TemplatesList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
