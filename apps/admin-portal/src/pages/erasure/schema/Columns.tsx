import { TextField, MenuItem, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ErasureRequestModel, ProfileRef } from '@/lib/types';

/** Selectable erasure lifecycle states, in workflow order. */
export const STATUSES = [
  'requested',
  'reviewing',
  'approved',
  'partially_fulfilled',
  'rejected',
  'completed',
];

type ColumnHandlers = {
  /**
   * Request a status change for a request. Cells only signal intent — the write
   * is owned by the page (see `useErasure`).
   */
  onSetStatus: (id: string, status: string) => void;
};

export const getColumns = ({
  onSetStatus,
}: ColumnHandlers): DataTableColumn<ErasureRequestModel>[] => [
  {
    field: 'requester',
    headerName: 'Requester',
    render: (r) => one<ProfileRef>(r.profiles)?.email ?? '—',
  },
  {
    field: 'created_at',
    headerName: 'Requested',
    sortable: true,
    render: (r) => formatDate(r.created_at),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (r) => <StatusChip status={r.status} />,
  },
  {
    field: 'set_status',
    headerName: 'Set status',
    align: 'right',
    render: (r) => (
      <TextField
        select
        size="small"
        value={r.status}
        onChange={(e) => onSetStatus(r.id, e.target.value)}
        sx={{ minWidth: 180 }}
      >
        {STATUSES.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>
    ),
  },
];
