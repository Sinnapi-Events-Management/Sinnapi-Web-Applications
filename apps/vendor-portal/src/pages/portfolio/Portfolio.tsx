import { Stack, Button, Box } from '@sinnapi/ui';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { usePortfolio } from './hooks/usePortfolio';
import MediaGallery from './components/molecules/MediaGallery';
import MediaDialog from './components/organisms/MediaDialog';

function Gallery({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, openDialog, closeDialog, remove } = usePortfolio(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddPhotoAlternateIcon />} onClick={openDialog}>
          Add media
        </Button>
      </Stack>
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No portfolio media"
            description="Showcase your work. Image limits depend on your plan."
          />
        ) : (
          <MediaGallery rows={rows} onRemove={remove} />
        )}
      </QueryState>

      <MediaDialog open={open} vendorId={vendorId} onClose={closeDialog} />
      <Box sx={{ height: 8 }} />
    </>
  );
}

export default function Portfolio() {
  return (
    <>
      <PageTitle
        title="Portfolio"
        subtitle="Your gallery and videos. Limits depend on your subscription plan."
      />
      <VendorGate>{(vendorId) => <Gallery vendorId={vendorId} />}</VendorGate>
    </>
  );
}
