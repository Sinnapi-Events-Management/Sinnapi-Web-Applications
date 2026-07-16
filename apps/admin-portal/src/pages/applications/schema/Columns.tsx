import { Typography, IconButton, Tooltip, type DataTableColumn } from '@sinnapi/ui';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import type { IntakeListModel } from '@/lib/types';

type ColumnHandlers = {
  /** Invoked when the row's View action is triggered. */
  onView: (application: IntakeListModel) => void;
};

export const getColumns = ({ onView }: ColumnHandlers): DataTableColumn<IntakeListModel>[] => [
  {
    field: 'business_name',
    headerName: 'Business',
    sortable: true,
    render: (a) => (
      <Typography variant="body2" fontWeight={600}>
        {a.business_name}
      </Typography>
    ),
  },
  {
    field: 'owner_full_name',
    headerName: 'Applicant',
    sortable: true,
    render: (a) => a.owner_full_name ?? '—',
  },
  {
    field: 'created_at',
    headerName: 'Submitted',
    sortable: true,
    render: (a) => formatDate(a.created_at),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (a) => <StatusChip status={a.status} />,
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (a) => (
      <Tooltip title="View application">
        <IconButton
          size="small"
          aria-label={`View ${a.business_name}`}
          onClick={(e) => {
            e.stopPropagation();
            onView(a);
          }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ),
  },
];
