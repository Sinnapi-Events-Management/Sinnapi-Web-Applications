import { Typography, type DataTableColumn } from '@sinnapi/ui';
import { formatDateTime } from '@/lib/config';
import type { AuditLogModel } from '@/lib/types';
import ActionCell from '../components/molecules/ActionCell';
import ActorCell from '../components/molecules/ActorCell';
import EntityCell from '../components/molecules/EntityCell';

export const columns: DataTableColumn<AuditLogModel>[] = [
  {
    field: 'occurred_at',
    headerName: 'When',
    sortable: true,
    render: (l) => (
      <Typography variant="body2" color="text.secondary" noWrap>
        {formatDateTime(l.occurred_at)}
      </Typography>
    ),
  },
  {
    field: 'action',
    headerName: 'Action',
    sortable: true,
    render: (l) => <ActionCell log={l} />,
  },
  {
    field: 'entity_type',
    headerName: 'Affected record',
    sortable: true,
    render: (l) => <EntityCell log={l} />,
  },
  {
    field: 'actor_id',
    headerName: 'Performed by',
    render: (l) => <ActorCell log={l} />,
  },
];
