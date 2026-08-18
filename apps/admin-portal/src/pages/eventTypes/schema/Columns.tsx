import { Chip, Switch, Typography, type DataTableColumn } from '@sinnapi/ui';
import type { EventTypeModel } from '@/lib/types';
import EventTypeRowActions from '../components/molecules/EventTypeRowActions';

type ColumnHandlers = {
  /** Open the edit drawer. */
  onEdit: (eventType: EventTypeModel) => void;
  /** Toggle the type's active flag inline. */
  onToggleActive: (eventType: EventTypeModel, isActive: boolean) => void;
  /** Request a delete (confirmation + write owned by the page). */
  onRequestDelete: (eventType: EventTypeModel) => void;
};

export const getColumns = ({
  onEdit,
  onToggleActive,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<EventTypeModel>[] => [
  {
    field: 'name',
    headerName: 'Event type',
    sortable: true,
    render: (t) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {t.name}
      </Typography>
    ),
  },
  {
    field: 'key',
    headerName: 'Key',
    sortable: true,
    render: (t) => (
      <Chip label={t.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
    ),
  },
  {
    field: 'sort_order',
    headerName: 'Sort',
    align: 'right',
    sortable: true,
    render: (t) => t.sort_order,
  },
  {
    field: 'is_active',
    headerName: 'Active',
    render: (t) => (
      <Switch
        checked={t.is_active}
        onChange={(e, checked) => {
          e.stopPropagation();
          onToggleActive(t, checked);
        }}
        onClick={(e) => e.stopPropagation()}
        inputProps={{ 'aria-label': `Toggle ${t.name} active` }}
      />
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (t) => (
      <EventTypeRowActions eventType={t} onEdit={onEdit} onRequestDelete={onRequestDelete} />
    ),
  },
];
