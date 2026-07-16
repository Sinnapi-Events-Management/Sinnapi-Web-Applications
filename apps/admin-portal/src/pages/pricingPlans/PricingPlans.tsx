import { useMemo } from 'react';
import {
  DataTable,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
  type DataTableColumn,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { formatMoney, titleize } from '@/lib/config';
import type { PlanModel } from '@/lib/types';
import { usePricingPlans } from './hooks/usePricingPlans';

export default function PricingPlans() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    edit,
    setEdit,
    busy,
    err,
    toggle,
    save,
    table,
  } = usePricingPlans();

  const columns = useMemo<DataTableColumn<PlanModel>[]>(
    () => [
      { field: 'name', headerName: 'Plan', sortable: true, render: (p) => p.name },
      {
        field: 'billing_cycle',
        headerName: 'Cycle',
        sortable: true,
        render: (p) => titleize(p.billing_cycle),
      },
      {
        field: 'price',
        headerName: 'Price',
        align: 'right',
        sortable: true,
        render: (p) => formatMoney(p.price, p.currency),
      },
      {
        field: 'trial_days',
        headerName: 'Trial days',
        align: 'right',
        sortable: true,
        render: (p) => p.trial_days,
      },
      {
        field: 'is_active',
        headerName: 'Active',
        render: (p) => <Switch checked={p.is_active} onChange={(_, c) => toggle(p.id, c)} />,
      },
      {
        field: 'edit',
        headerName: 'Edit',
        align: 'right',
        render: (p) => (
          <Button size="small" onClick={() => setEdit(p)}>
            Edit
          </Button>
        ),
      },
    ],
    [toggle, setEdit],
  );

  return (
    <>
      <PageTitle
        title="Pricing plans"
        subtitle="Set plan pricing and trial length. Admin-managed."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load plans.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No plans yet."
        {...table.controls}
      />

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
