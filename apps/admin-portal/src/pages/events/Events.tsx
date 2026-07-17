import { useMemo } from 'react';
import { DataTable, Alert, Button } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import type { EventModel } from '@/lib/types';
import { useEvents } from './hooks/useEvents';
import { getColumns } from './schema';
import EventsToolbar from './components/organisms/EventsToolbar';
import EventCreateDrawer from './components/organisms/EventCreateDrawer';
import EventEditDrawer from './components/organisms/EventEditDrawer';
import EventStatusDialog from './components/organisms/EventStatusDialog';
import EventDeleteDialog from './components/organisms/EventDeleteDialog';

export default function Events() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    emptyMessage,
    tabs,
    countsLoading,
    tab,
    onTabChange,
    search,
    filters,
    create,
    edit,
    remove,
    status,
    navigate,
    table,
  } = useEvents();

  const columns = useMemo(
    () =>
      getColumns({
        onView: (e: EventModel) => navigate(`/events/${e.id}`),
        onEdit: edit.open,
        onRequestStatusChange: status.request,
        onRequestDelete: remove.request,
      }),
    [navigate, edit.open, status.request, remove.request],
  );

  // Save failures belong to their drawer, so they're rendered there instead.
  const pageError =
    status.err ??
    remove.err ??
    (error ? (error instanceof Error ? error.message : 'Failed to load events.') : null);

  return (
    <>
      <PageTitle
        title="Events"
        subtitle="Post inspiration events and manage all platform events."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={create.open}>
            Post event
          </Button>
        }
      />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={onTabChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter events by status"
      />
      <EventsToolbar search={search} filters={filters} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(e: EventModel) => e.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(e: EventModel) => navigate(`/events/${e.id}`)}
        emptyMessage={emptyMessage}
        {...table.controls}
      />

      <EventCreateDrawer
        open={create.isOpen}
        busy={create.busy}
        err={create.err}
        onClose={create.close}
        onSave={create.save}
      />

      <EventEditDrawer
        open={edit.isOpen}
        event={edit.event}
        loading={edit.loading}
        loadError={edit.loadError}
        busy={edit.busy}
        err={edit.err}
        onClose={edit.close}
        onSave={edit.save}
      />

      <EventStatusDialog
        pending={status.pending}
        busy={status.busy}
        onCancel={status.cancel}
        onConfirm={status.confirm}
      />

      <EventDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />
    </>
  );
}
