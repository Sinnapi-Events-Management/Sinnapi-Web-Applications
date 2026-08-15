import { useMemo } from 'react';
import { DataTable, Alert, Button, PageTitle } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import type { EventTypeModel } from '@/lib/types';
import { useEventTypes } from './hooks/useEventTypes';
import { getColumns } from './schema';
import EventTypesToolbar from './components/organisms/EventTypesToolbar';
import EventTypeDrawer from './components/organisms/EventTypeDrawer';
import EventTypeDeleteDialog from './components/organisms/EventTypeDeleteDialog';

/**
 * The occasion vocabulary every surface shares: what a client can pick when
 * posting an event, what vendors and the public site filter by, and what the
 * admin events form offers. Editing it here changes all of them at once — it
 * used to mean editing four hardcoded arrays that had already drifted apart.
 */
export default function EventTypes() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    filters,
    nextSortOrder,
    edit,
    remove,
    toggleActive,
    table,
  } = useEventTypes();

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
      : 'Failed to load event types.'
    : null;

  return (
    <>
      <PageTitle
        title="Event types"
        subtitle="The occasions clients choose from when posting an event, and that vendors and the public site filter by."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={edit.openCreate}>
            New event type
          </Button>
        }
      />

      <EventTypesToolbar filters={filters} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(t: EventTypeModel) => t.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No event types yet. Create your first event type."
        {...table.controls}
      />

      <EventTypeDrawer
        open={edit.isOpen}
        mode={edit.mode}
        eventType={edit.eventType}
        nextSortOrder={nextSortOrder}
        busy={edit.busy}
        err={edit.err}
        onClose={edit.close}
        onSave={edit.save}
      />

      <EventTypeDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        err={remove.err}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />
    </>
  );
}
