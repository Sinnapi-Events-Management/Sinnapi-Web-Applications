import { Avatar, Box, Chip, Stack, Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import type { UserModel } from '@/lib/types';
import UserRowActions from '../components/molecules/UserRowActions';
import { userRoles } from './userForm';

type ColumnHandlers = {
  /** Open the edit drawer. */
  onEdit: (user: UserModel) => void;
  /** Send the user a fresh temporary password. */
  onResetPassword: (user: UserModel) => void;
  /**
   * Request a block/activate. Cells only signal intent — confirmation and the
   * write are owned by the page (see `useUserStatus`).
   */
  onRequestStatusChange: (user: UserModel, status: 'active' | 'suspended') => void;
  /** Request a remove (soft-delete + login ban). */
  onRequestDelete: (user: UserModel) => void;
};

function initials(name: string | null): string {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export const getColumns = ({
  onEdit,
  onResetPassword,
  onRequestStatusChange,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<UserModel>[] => [
  {
    field: 'full_name',
    headerName: 'Name',
    sortable: true,
    render: (u) => (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ width: 40, height: 40, fontSize: 15, fontWeight: 600 }}>
          {initials(u.full_name)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {u.full_name ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {u.email ?? '—'}
          </Typography>
        </Box>
      </Stack>
    ),
  },
  {
    field: 'roles',
    headerName: 'Roles',
    render: (u) => {
      const roles = userRoles(u);
      if (roles.length === 0) {
        return (
          <Typography variant="caption" color="text.secondary">
            No roles
          </Typography>
        );
      }
      return (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {roles.map((r) => (
            <Chip key={r.id} size="small" label={r.name} />
          ))}
        </Stack>
      );
    },
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (u) => <StatusChip status={u.status} />,
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (u) => (
      <UserRowActions
        user={u}
        onEdit={onEdit}
        onResetPassword={onResetPassword}
        onRequestStatusChange={onRequestStatusChange}
        onRequestDelete={onRequestDelete}
      />
    ),
  },
];
