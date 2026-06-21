import {
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Box,
} from '@sinnapi/ui';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { usePortfolio } from './hooks/usePortfolio';

function Gallery({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, setOpen, busy, err, add, remove } = usePortfolio(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => setOpen(true)}
        >
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
          <ImageList variant="masonry" cols={3} gap={12}>
            {rows.map((m) => (
              <ImageListItem key={m.id}>
                <img
                  src={m.url ?? '/placeholder-vendor.svg'}
                  alt={m.caption ?? 'portfolio item'}
                  loading="lazy"
                  style={{ borderRadius: 8 }}
                />
                <ImageListItemBar
                  title={m.caption ?? m.media_type}
                  actionIcon={
                    <IconButton
                      sx={{ color: 'white' }}
                      onClick={() => remove(m.id)}
                      aria-label="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                />
              </ImageListItem>
            ))}
          </ImageList>
        )}
      </QueryState>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: 'form', onSubmit: add }}
      >
        <DialogTitle>Add portfolio media</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              name="media_type"
              label="Type"
              select
              SelectProps={{ native: true }}
              defaultValue="image"
            >
              <option value="image">Image</option>
              <option value="video">Video (Pro/Elite)</option>
            </TextField>
            <TextField
              name="url"
              label="Media URL"
              required
              helperText="Upload to storage in production; paste a URL here for now"
            />
            <TextField name="caption" label="Caption" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Adding…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
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
