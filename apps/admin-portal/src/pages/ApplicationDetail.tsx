import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Divider,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import EmptyState from '@/components/ui/EmptyState';
import { useApplication } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { formatDate, titleize } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileContactRef } from '@/lib/types';

const TRANSITIONS = ['under_review', 'due_diligence', 'mou_pending', 'mou_signed', 'pending_info'];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
}

export default function ApplicationDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data: a, isLoading, error } = useApplication(id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['application', id] });
    qc.invalidateQueries({ queryKey: ['applications'] });
  }

  async function transition(to: string) {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('transition_application_status', {
      p_application_id: id,
      p_to: to,
      p_reason: null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
  }

  async function approve() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('approve_vendor', { p_application_id: id });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
    navigate('/vendors');
  }

  async function reject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const reason = String(new FormData(e.currentTarget).get('reason'));
    const { error } = await supabase.rpc('reject_vendor', {
      p_application_id: id,
      p_reason: reason,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRejectOpen(false);
    refresh();
  }

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!a ? (
        <EmptyState title="Application not found" ctaLabel="Back" ctaHref="/applications" />
      ) : (
        <>
          <PageTitle
            title={a.business_name}
            subtitle={one<ProfileContactRef>(a.profiles)?.email ?? undefined}
            action={<StatusChip status={a.status} size="medium" />}
          />
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Application details
                  </Typography>
                  <Row
                    label="Applicant"
                    value={one<ProfileContactRef>(a.profiles)?.full_name ?? '—'}
                  />
                  <Row label="Base city" value={a.base_city ?? '—'} />
                  <Row
                    label="Years in operation"
                    value={a.years_in_operation ? titleize(a.years_in_operation) : '—'}
                  />
                  <Row
                    label="Pricing model"
                    value={a.pricing_model ? titleize(a.pricing_model) : '—'}
                  />
                  <Row label="Business reg #" value={a.business_reg_number ?? '—'} />
                  <Row label="Tax ID" value={a.tax_id ?? '—'} />
                  <Row label="Icandy alumni" value={a.icandy_alumni ? 'Yes' : 'No'} />
                  <Row label="Submitted" value={formatDate(a.submitted_at)} />
                  {a.biography && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography color="text.secondary">{a.biography}</Typography>
                    </>
                  )}
                  {a.review_notes && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Notes: {a.review_notes}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Workflow
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1.5}>
                    {has('vendor.review') && a.status !== 'approved' && a.status !== 'rejected' && (
                      <TextField
                        select
                        label="Move to stage"
                        size="small"
                        value=""
                        onChange={(e) => transition(e.target.value)}
                        disabled={busy}
                      >
                        {TRANSITIONS.map((t) => (
                          <MenuItem key={t} value={t}>
                            {titleize(t)}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    {has('vendor.approve') && a.status !== 'approved' && (
                      <>
                        <Button
                          variant="contained"
                          color="success"
                          disabled={busy}
                          onClick={approve}
                        >
                          Approve vendor
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          disabled={busy}
                          onClick={() => setRejectOpen(true)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {a.status === 'approved' && (
                      <Alert severity="success">Approved — vendor created with trial.</Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Dialog
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{ component: 'form', onSubmit: reject }}
          >
            <DialogTitle>Reject application</DialogTitle>
            <DialogContent>
              <TextField
                name="reason"
                label="Reason"
                multiline
                minRows={3}
                required
                autoFocus
                sx={{ mt: 1 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button type="submit" color="error" variant="contained" disabled={busy}>
                Reject
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </QueryState>
  );
}
