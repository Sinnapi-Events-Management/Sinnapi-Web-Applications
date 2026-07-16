import { Avatar, Box, Rating, Stack, Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import type { VendorStatus } from '@/hooks/useVendorStatus';
import type { VendorAdminModel } from '@/lib/types';
import VendorRowActions from '../components/molecules/VendorRowActions';

type ColumnHandlers = {
  /** Open the vendor detail page. */
  onView: (vendor: VendorAdminModel) => void;
  /** Open the edit drawer. */
  onEdit: (vendor: VendorAdminModel) => void;
  /**
   * Request a status change. Cells only signal intent — confirmation and the
   * write are owned by the page (see `useVendorStatus`).
   */
  onRequestStatusChange: (vendor: VendorAdminModel, status: VendorStatus) => void;
  /** Request a delete. Only suspended vendors are eligible (see `useVendorDelete`). */
  onRequestDelete: (vendor: VendorAdminModel) => void;
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
  onView,
  onEdit,
  onRequestStatusChange,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<VendorAdminModel>[] => [
  {
    field: 'business_name',
    headerName: 'Business',
    sortable: true,
    render: (v) => (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={v.profile_image_url ?? undefined}
          sx={{ width: 40, height: 40, fontSize: 15, fontWeight: 600 }}
        >
          {initials(v.business_name)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {v.business_name ?? '—'}
          </Typography>
          {v.base_city && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {v.base_city}
            </Typography>
          )}
        </Box>
      </Stack>
    ),
  },
  {
    field: 'avg_rating',
    headerName: 'Rating',
    sortable: true,
    render: (v) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Rating value={v.avg_rating ?? 0} size="small" readOnly precision={0.5} />
        <Typography variant="caption" color="text.secondary">
          ({v.review_count ?? 0})
        </Typography>
      </Stack>
    ),
  },
  {
    field: 'visibility',
    headerName: 'Visibility',
    sortable: true,
    render: (v) => <StatusChip status={v.visibility} />,
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (v) => <StatusChip status={v.status} />,
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (v) => (
      <VendorRowActions
        vendor={v}
        onView={onView}
        onEdit={onEdit}
        onRequestStatusChange={onRequestStatusChange}
        onRequestDelete={onRequestDelete}
      />
    ),
  },
];
