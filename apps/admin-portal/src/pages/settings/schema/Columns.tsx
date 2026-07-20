import { Button, type DataTableColumn } from '@sinnapi/ui';
import type { SettingModel } from '@/lib/types';

type ColumnHandlers = {
  /** Open the edit dialog for a setting. */
  onEdit: (setting: SettingModel) => void;
};

export const getColumns = ({ onEdit }: ColumnHandlers): DataTableColumn<SettingModel>[] => [
  { field: 'key', headerName: 'Key', sortable: true, render: (s) => s.key },
  {
    field: 'value',
    headerName: 'Value',
    render: (s) => <code>{JSON.stringify(s.value)}</code>,
  },
  { field: 'description', headerName: 'Description', render: (s) => s.description ?? '—' },
  {
    field: 'edit',
    headerName: 'Edit',
    align: 'right',
    render: (s) => (
      <Button size="small" onClick={() => onEdit(s)}>
        Edit
      </Button>
    ),
  },
];
