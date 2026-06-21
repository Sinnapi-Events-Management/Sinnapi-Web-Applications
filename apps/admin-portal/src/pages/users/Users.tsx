import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Alert,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { useUsers } from './hooks/useUsers';

export default function Users() {
  const {
    users,
    roles,
    rows,
    canManage,
    active,
    setActive,
    err,
    userRoleKeys,
    toggleRole,
    current,
  } = useUsers();

  return (
    <>
      <PageTitle title="Users" subtitle="Manage accounts and role assignments." />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={users.isLoading} error={users.error}>
        {rows.length === 0 ? (
          <EmptyState title="No users" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  {canManage && <TableCell align="right">Manage</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {[...userRoleKeys(u)].map((k) => (
                          <Chip key={k} size="small" label={k} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={u.status} />
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <Button size="small" onClick={() => setActive(u)}>
                          Roles
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>

      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="xs">
        <DialogTitle>Roles · {active?.full_name}</DialogTitle>
        <DialogContent>
          <Stack sx={{ mt: 1 }}>
            {(roles.data ?? []).map((r) => (
              <FormControlLabel
                key={r.id}
                control={
                  <Switch
                    checked={current.has(r.key)}
                    onChange={(_, on) => active && toggleRole(active.id, r.id, on)}
                  />
                }
                label={r.name}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActive(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
