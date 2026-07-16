import {
  DataTable,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  type DataTableColumn,
} from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, titleize } from '@/lib/config';
import type { EventModel } from '@/lib/types';
import { useEvents } from './hooks/useEvents';

const columns: DataTableColumn<EventModel>[] = [
  { field: 'title', headerName: 'Title', sortable: true, render: (e) => e.title },
  { field: 'source', headerName: 'Source', sortable: true, render: (e) => titleize(e.source) },
  {
    field: 'event_date',
    headerName: 'Date',
    sortable: true,
    render: (e) => formatDate(e.event_date),
  },
  { field: 'is_public', headerName: 'Public', render: (e) => (e.is_public ? 'Yes' : 'No') },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (e) => <StatusChip status={e.status} />,
  },
];

export default function Events() {
  const { rows, total, isLoading, isFetching, error, open, setOpen, busy, err, post, table } =
    useEvents();

  return (
    <>
      <PageTitle
        title="Events"
        subtitle="Post inspiration events and manage all platform events."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Post event
          </Button>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load events.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(e) => e.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No events yet."
        {...table.controls}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: 'form', onSubmit: post }}
      >
        <DialogTitle>Post an event</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="title" label="Title" required autoFocus />
            <TextField name="event_type" label="Event type" />
            <TextField
              name="event_date"
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
            />
            <TextField name="location" label="Location" />
            <TextField name="description" label="Description" multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
