import { Box, Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, titleize } from '@/lib/config';
import type { EventStatus } from '@/lib/status';
import type { EventModel } from '@/lib/types';
import EventRowActions from '../components/molecules/EventRowActions';

type ColumnHandlers = {
  /** Open the event detail page. */
  onView: (event: EventModel) => void;
  /** Open the edit drawer. */
  onEdit: (event: EventModel) => void;
  /**
   * Request a status change. Cells only signal intent — confirmation and the
   * write are owned by the page (see `useEventStatus`).
   */
  onRequestStatusChange: (event: EventModel, status: EventStatus) => void;
  /** Request a delete (soft delete via DB trigger — see `useEventDelete`). */
  onRequestDelete: (event: EventModel) => void;
};

export const getColumns = ({
  onView,
  onEdit,
  onRequestStatusChange,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<EventModel>[] => [
  {
    field: 'title',
    headerName: 'Title',
    sortable: true,
    render: (e) => (
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {e.title}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'source',
    headerName: 'Source',
    sortable: true,
    render: (e) => titleize(e.source),
  },
  {
    field: 'event_date',
    headerName: 'Date',
    sortable: true,
    render: (e) => formatDate(e.event_date),
  },
  {
    field: 'is_public',
    headerName: 'Public',
    sortable: true,
    render: (e) => (e.is_public ? 'Yes' : 'No'),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (e) => <StatusChip status={e.status} />,
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (e) => (
      <EventRowActions
        event={e}
        onView={onView}
        onEdit={onEdit}
        onRequestStatusChange={onRequestStatusChange}
        onRequestDelete={onRequestDelete}
      />
    ),
  },
];
