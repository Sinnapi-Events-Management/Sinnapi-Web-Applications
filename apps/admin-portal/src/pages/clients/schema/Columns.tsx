import { Avatar, Box, Chip, Stack, Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { UserModel } from '@/lib/types';
import ClientRowActions from '../components/molecules/ClientRowActions';

type ColumnHandlers = {
  onView: (client: UserModel) => void;
  onResetPassword: (client: UserModel) => void;
  onRequestStatusChange: (client: UserModel, status: 'active' | 'suspended') => void;
  onRequestDelete: (client: UserModel) => void;
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

/** The client's role labels (Client / Event Planner) as chips. */
function roleNames(u: UserModel): string[] {
  const names: string[] = [];
  for (const ur of u.user_roles ?? []) {
    const role = one(ur.roles);
    if (role?.name) names.push(role.name);
  }
  return names;
}

export const getColumns = ({
  onView,
  onResetPassword,
  onRequestStatusChange,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<UserModel>[] => [
  {
    field: 'full_name',
    headerName: 'Client',
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
    field: 'type',
    headerName: 'Type',
    render: (u) => (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {roleNames(u).map((n) => (
          <Chip key={n} size="small" variant="outlined" label={n} />
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
  {
    field: 'created_at',
    headerName: 'Joined',
    sortable: true,
    render: (u) => formatDate(u.created_at),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (u) => (
      <ClientRowActions
        client={u}
        onView={onView}
        onResetPassword={onResetPassword}
        onRequestStatusChange={onRequestStatusChange}
        onRequestDelete={onRequestDelete}
      />
    ),
  },
];
