import { Chip, Switch, Typography, type DataTableColumn } from '@sinnapi/ui';
import type { ServiceCategoryModel } from '@/lib/types';
import CategoryRowActions from '../components/molecules/CategoryRowActions';

type ColumnHandlers = {
  /** Open the edit drawer. */
  onEdit: (category: ServiceCategoryModel) => void;
  /** Toggle the category's active flag inline. */
  onToggleActive: (category: ServiceCategoryModel, isActive: boolean) => void;
  /** Request a delete (confirmation + write owned by the page). */
  onRequestDelete: (category: ServiceCategoryModel) => void;
};

export const getColumns = ({
  onEdit,
  onToggleActive,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<ServiceCategoryModel>[] => [
  {
    field: 'name',
    headerName: 'Category',
    sortable: true,
    render: (c) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {c.name}
      </Typography>
    ),
  },
  {
    field: 'key',
    headerName: 'Key',
    sortable: true,
    render: (c) => (
      <Chip label={c.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
    ),
  },
  {
    field: 'parent_id',
    headerName: 'Parent',
    render: (c) =>
      c.parent?.name ? (
        c.parent.name
      ) : (
        <Typography variant="body2" color="text.secondary">
          Top-level
        </Typography>
      ),
  },
  {
    field: 'sort_order',
    headerName: 'Sort',
    align: 'right',
    sortable: true,
    render: (c) => c.sort_order,
  },
  {
    field: 'is_active',
    headerName: 'Active',
    render: (c) => (
      <Switch
        checked={c.is_active}
        onChange={(e, checked) => {
          e.stopPropagation();
          onToggleActive(c, checked);
        }}
        onClick={(e) => e.stopPropagation()}
        inputProps={{ 'aria-label': `Toggle ${c.name} active` }}
      />
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (c) => (
      <CategoryRowActions category={c} onEdit={onEdit} onRequestDelete={onRequestDelete} />
    ),
  },
];
