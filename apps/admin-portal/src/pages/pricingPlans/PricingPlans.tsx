import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { formatMoney, titleize } from '@/lib/config';
import { usePricingPlans } from './hooks/usePricingPlans';

export default function PricingPlans() {
  const { rows, isLoading, error, edit, setEdit, busy, err, toggle, save } = usePricingPlans();

  return (
    <>
      <PageTitle
        title="Pricing plans"
        subtitle="Set plan pricing and trial length. Admin-managed."
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No plans" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plan</TableCell>
                  <TableCell>Cycle</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Trial days</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Edit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{titleize(p.billing_cycle)}</TableCell>
                    <TableCell align="right">{formatMoney(p.price, p.currency)}</TableCell>
                    <TableCell align="right">{p.trial_days}</TableCell>
                    <TableCell>
                      <Switch checked={p.is_active} onChange={(_, c) => toggle(p.id, c)} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setEdit(p)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>

      <Dialog
        open={!!edit}
        onClose={() => setEdit(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ component: 'form', onSubmit: save }}
      >
        <DialogTitle>Edit {edit?.name}</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              name="price"
              type="number"
              label={`Price (${edit?.currency ?? 'UGX'})`}
              defaultValue={edit?.price ?? 0}
              inputProps={{ min: 0 }}
            />
            <TextField
              name="trial_days"
              type="number"
              label="Trial days"
              defaultValue={edit?.trial_days ?? 30}
              inputProps={{ min: 0 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
