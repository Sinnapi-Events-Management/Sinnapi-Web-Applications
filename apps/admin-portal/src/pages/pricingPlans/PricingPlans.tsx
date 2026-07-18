import { useMemo } from 'react';
import { DataTable, Alert, Button } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import type { PlanModel } from '@/lib/types';
import { usePricingPlans } from './hooks/usePricingPlans';
import { getColumns } from './schema';
import PlansToolbar from './components/organisms/PlansToolbar';
import PlanDrawer from './components/organisms/PlanDrawer';
import PlanDeleteDialog from './components/organisms/PlanDeleteDialog';

export default function PricingPlans() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    filters,
    edit,
    remove,
    toggleActive,
    navigate,
    table,
  } = usePricingPlans();

  const columns = useMemo(
    () =>
      getColumns({
        onView: (p: PlanModel) => navigate(`/pricing-plans/${p.id}`),
        onEdit: edit.openEdit,
        onToggleActive: toggleActive,
        onRequestDelete: remove.request,
      }),
    [navigate, edit.openEdit, toggleActive, remove.request],
  );

  // Save failures live in the drawer; delete failures live in the dialog. Only
  // the list load error belongs at the page level.
  const pageError = error
    ? error instanceof Error
      ? error.message
      : 'Failed to load plans.'
    : null;

  return (
    <>
      <PageTitle
        title="Pricing plans"
        subtitle="Create and manage subscription plans, pricing and features."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={edit.openCreate}>
            New plan
          </Button>
        }
      />

      <PlansToolbar filters={filters} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(p) => navigate(`/pricing-plans/${p.id}`)}
        emptyMessage="No plans yet. Create your first plan."
        {...table.controls}
      />

      <PlanDrawer
        open={edit.isOpen}
        mode={edit.mode}
        plan={edit.plan}
        busy={edit.busy}
        err={edit.err}
        onClose={edit.close}
        onSave={edit.save}
      />

      <PlanDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        err={remove.err}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />
    </>
  );
}
