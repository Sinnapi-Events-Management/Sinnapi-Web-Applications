import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { formatMoney } from '@/lib/config';
import { useServices } from './hooks/useServices';

function ServicesList({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, setOpen, busy, err, add } = useServices(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
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
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="h6">{s.title}</Typography>
                      <Chip
                        size="small"
                        label={s.is_active ? 'Active' : 'Hidden'}
                        color={s.is_active ? 'success' : 'default'}
                      />
                    </Stack>
                    {s.description && (
                      <Typography variant="body2" color="text.secondary">
                        {s.description}
                      </Typography>
                    )}
                    {s.base_price != null && (
                      <Typography sx={{ mt: 1 }} fontWeight={600}>
                        {formatMoney(s.base_price, s.currency)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </QueryState>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: 'form', onSubmit: add }}
      >
        <DialogTitle>Add a service</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="title" label="Service title" required autoFocus />
            <TextField name="description" label="Description" multiline minRows={3} />
            <TextField
              name="base_price"
              type="number"
              label="Base price (UGX)"
              inputProps={{ min: 0 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : 'Add service'}
          </Button>
        </DialogActions>
      </Dialog>
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
