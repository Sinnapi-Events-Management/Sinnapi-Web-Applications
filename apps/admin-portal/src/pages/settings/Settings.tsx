import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { useSettings } from './hooks/useSettings';

export default function Settings() {
  const { rows, isLoading, error, edit, setEdit, busy, err, save } = useSettings();

  return (
    <>
      <PageTitle
        title="Platform settings"
        subtitle="Commission %, grace period, FX, quote expiry, etc."
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No settings" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Edit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.key}</TableCell>
                    <TableCell>
                      <code>{JSON.stringify(s.value)}</code>
                    </TableCell>
                    <TableCell>{s.description ?? '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setEdit(s)}>
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
        <DialogTitle>Edit {edit?.key}</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <TextField
            name="value"
            label="Value (JSON)"
            defaultValue={JSON.stringify(edit?.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
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
