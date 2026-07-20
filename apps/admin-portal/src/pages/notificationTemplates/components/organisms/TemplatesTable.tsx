import { useMemo } from 'react';
import { DataTable, Chip, Box, Typography, type DataTableColumn } from '@sinnapi/ui';
import type { NotificationTemplateModel } from '@/lib/types';
import type { TableState } from '@/hooks/useTableState';
import ChannelBadge from '../molecules/ChannelBadge';
import ActiveToggle from '../molecules/ActiveToggle';
import TriggerCell from '../molecules/TriggerCell';

type Props = {
  rows: NotificationTemplateModel[];
  total: number;
  loading: boolean;
  emptyMessage: string;
  controls: TableState['controls'];
  busyId: string | null;
  onToggle: (id: string, isActive: boolean) => void;
};

/**
 * The templates table. Owns only its column definitions; all data, pagination,
 * and mutation state arrive as props from the page hook.
 */
export default function TemplatesTable({
  rows,
  total,
  loading,
  emptyMessage,
  controls,
  busyId,
  onToggle,
}: Props) {
  const columns = useMemo<DataTableColumn<NotificationTemplateModel>[]>(
    () => [
      {
        field: 'trigger_key',
        headerName: 'Trigger',
        sortable: true,
        render: (t) => <TriggerCell triggerKey={t.trigger_key} />,
      },
      {
        field: 'channel',
        headerName: 'Channel',
        sortable: true,
        render: (t) => <ChannelBadge channel={t.channel} />,
      },
      {
        field: 'locale',
        headerName: 'Locale',
        sortable: true,
        render: (t) => (
          <Chip
            size="small"
            variant="outlined"
            label={t.locale.toUpperCase()}
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          />
        ),
      },
      {
        field: 'subject',
        headerName: 'Subject',
        render: (t) =>
          t.subject ? (
            <Box
              sx={{
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={t.subject}
            >
              {t.subject}
            </Box>
          ) : (
            <Typography component="span" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        field: 'is_active',
        headerName: 'Status',
        render: (t) => (
          <ActiveToggle
            checked={t.is_active}
            busy={busyId === t.id}
            onChange={(next) => onToggle(t.id, next)}
            ariaLabel={`Toggle ${t.trigger_key} active`}
          />
        ),
      },
    ],
    [busyId, onToggle],
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(t) => t.id}
      rowCount={total}
      loading={loading}
      emptyMessage={emptyMessage}
      {...controls}
    />
  );
}
