import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { usePromotions } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/config';

function PromotionsList({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = usePromotions(vendorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('promotions').insert({
      vendor_id: vendorId,
      title: String(form.get('title')),
      description: String(form.get('description')) || null,
      starts_at: String(form.get('starts_at')),
      ends_at: String(form.get('ends_at')),
      is_active: true,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['v-promotions', vendorId] });
  }

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
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
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{p.title}</Typography>
                      <Chip
                        size="small"
                        label={p.is_active ? 'Active' : 'Inactive'}
                        color={p.is_active ? 'success' : 'default'}
                      />
                    </Stack>
                    {p.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {p.description}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      {formatDate(p.starts_at)} – {formatDate(p.ends_at)}
                    </Typography>
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
        <DialogTitle>New promotion</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="title" label="Title" required autoFocus />
            <TextField name="description" label="Description" multiline minRows={2} />
            <Stack direction="row" spacing={2}>
              <TextField
                name="starts_at"
                type="date"
                label="Starts"
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                name="ends_at"
                type="date"
                label="Ends"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Stack>
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

export default function Promotions() {
  return (
    <>
      <PageTitle title="Promotions" subtitle="Promote your services to clients." />
      <VendorGate>{(vendorId) => <PromotionsList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
