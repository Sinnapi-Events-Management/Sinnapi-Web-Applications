import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
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
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate, titleize } from '@/lib/config';
import { useEvents } from './hooks/useEvents';

export default function Events() {
  const { rows, isLoading, error, open, setOpen, busy, err, post } = useEvents();

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
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No events" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Public</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{e.title}</TableCell>
                    <TableCell>{titleize(e.source)}</TableCell>
                    <TableCell>{formatDate(e.event_date)}</TableCell>
                    <TableCell>{e.is_public ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <StatusChip status={e.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>

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
