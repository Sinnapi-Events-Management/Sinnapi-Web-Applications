import { useMemo } from 'react';
import {
  DataTable,
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
  type DataTableColumn,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import type { UserModel } from '@/lib/types';
import { useUsers } from './hooks/useUsers';

export default function Users() {
  const {
    roles,
    rows,
    total,
    isLoading,
    isFetching,
    error,
    canManage,
    active,
    setActive,
    err,
    userRoleKeys,
    toggleRole,
    current,
    table,
  } = useUsers();

  const columns = useMemo<DataTableColumn<UserModel>[]>(() => {
    const base: DataTableColumn<UserModel>[] = [
      { field: 'full_name', headerName: 'Name', sortable: true, render: (u) => u.full_name },
      { field: 'email', headerName: 'Email', sortable: true, render: (u) => u.email },
      {
        field: 'roles',
        headerName: 'Roles',
        render: (u) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {[...userRoleKeys(u)].map((k) => (
              <Chip key={k} size="small" label={k} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: true,
        render: (u) => <StatusChip status={u.status} />,
      },
    ];
    if (canManage) {
      base.push({
        field: 'manage',
        headerName: 'Manage',
        align: 'right',
        render: (u) => (
          <Button size="small" onClick={() => setActive(u)}>
            Roles
          </Button>
        ),
      });
    }
    return base;
  }, [canManage, userRoleKeys, setActive]);

  return (
    <>
      <PageTitle title="Users" subtitle="Manage accounts and role assignments." />
      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load users.')}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(u) => u.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No users yet."
        {...table.controls}
      />

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
