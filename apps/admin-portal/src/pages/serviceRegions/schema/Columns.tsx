import { Chip, Switch, Typography, type DataTableColumn } from '@sinnapi/ui';
import { titleize } from '@/lib/config';
import type { ServiceRegionModel } from '@/lib/types';
import RegionRowActions from '../components/molecules/RegionRowActions';

type ColumnHandlers = {
  /** Open the edit drawer. */
  onEdit: (region: ServiceRegionModel) => void;
  /** Toggle the region's active flag inline. */
  onToggleActive: (region: ServiceRegionModel, isActive: boolean) => void;
  /** Request a delete (confirmation + write owned by the page). */
  onRequestDelete: (region: ServiceRegionModel) => void;
};

export const getColumns = ({
  onEdit,
  onToggleActive,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<ServiceRegionModel>[] => [
  {
    field: 'name',
    headerName: 'Region',
    sortable: true,
    render: (r) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {r.name}
      </Typography>
    ),
  },
  {
    field: 'key',
    headerName: 'Key',
    sortable: true,
    render: (r) => (
      <Chip label={r.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
    ),
  },
  {
    field: 'scope',
    headerName: 'Scope',
    sortable: true,
    render: (r) => titleize(r.scope),
  },
  {
    field: 'sort_order',
    headerName: 'Sort',
    align: 'right',
    sortable: true,
    render: (r) => r.sort_order,
  },
  {
    field: 'is_active',
    headerName: 'Active',
    render: (r) => (
      <Switch
        checked={r.is_active}
        onChange={(e, checked) => {
          e.stopPropagation();
          onToggleActive(r, checked);
        }}
        onClick={(e) => e.stopPropagation()}
        inputProps={{ 'aria-label': `Toggle ${r.name} active` }}
      />
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (r) => (
      <RegionRowActions region={r} onEdit={onEdit} onRequestDelete={onRequestDelete} />
    ),
  },
];
