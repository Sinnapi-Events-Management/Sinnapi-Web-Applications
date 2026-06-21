import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { useTemplates } from './hooks/useTemplates';

function TemplatesList({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, setOpen, busy, err, add } = useTemplates(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
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
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{t.name}</Typography>
                      <Chip size="small" label={`${(t.quote_template_items ?? []).length} items`} />
                    </Stack>
                    {t.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t.notes}
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
        <DialogTitle>New quote template</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="name" label="Template name" required autoFocus />
            <TextField name="notes" label="Notes" multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
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
