import { useMemo } from 'react';
import { DataTable, Alert, Button, PageTitle } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import type { ServiceCategoryModel } from '@/lib/types';
import { useServiceCategories } from './hooks/useServiceCategories';
import { getColumns } from './schema';
import CategoriesToolbar from './components/organisms/CategoriesToolbar';
import CategoryDrawer from './components/organisms/CategoryDrawer';
import CategoryDeleteDialog from './components/organisms/CategoryDeleteDialog';

export default function ServiceCategories() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    filters,
    parentOptions,
    nextSortOrder,
    edit,
    remove,
    toggleActive,
    table,
  } = useServiceCategories();

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: edit.openEdit,
        onToggleActive: toggleActive,
        onRequestDelete: remove.request,
      }),
    [edit.openEdit, toggleActive, remove.request],
  );

  // Save failures live in the drawer; delete failures live in the dialog. Only
  // the list load error belongs at the page level.
  const pageError = error
    ? error instanceof Error
      ? error.message
      : 'Failed to load categories.'
    : null;

  return (
    <>
      <PageTitle
        title="Service categories"
        subtitle="Register and manage the categories vendors list their services under."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={edit.openCreate}>
            New category
          </Button>
        }
      />

      <CategoriesToolbar filters={filters} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(c: ServiceCategoryModel) => c.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No categories yet. Create your first category."
        {...table.controls}
      />

      <CategoryDrawer
        open={edit.isOpen}
        mode={edit.mode}
        category={edit.category}
        parentOptions={parentOptions}
        nextSortOrder={nextSortOrder}
        busy={edit.busy}
        err={edit.err}
        onClose={edit.close}
        onSave={edit.save}
      />

      <CategoryDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        err={remove.err}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />
    </>
  );
}
