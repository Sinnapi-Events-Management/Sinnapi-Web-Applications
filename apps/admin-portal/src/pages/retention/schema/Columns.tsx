import { Chip, type DataTableColumn } from '@sinnapi/ui';
import { titleize } from '@/lib/config';
import type { RetentionPolicyModel } from '@/lib/types';

export const getColumns = (): DataTableColumn<RetentionPolicyModel>[] => [
  {
    field: 'data_category',
    headerName: 'Category',
    sortable: true,
    render: (p) => titleize(p.data_category),
  },
  { field: 'retention_period', headerName: 'Retention', render: (p) => p.retention_period ?? '—' },
  {
    field: 'action_on_expiry',
    headerName: 'On expiry',
    render: (p) => <Chip size="small" label={titleize(p.action_on_expiry)} />,
  },
  { field: 'legal_hold', headerName: 'Legal hold', render: (p) => (p.legal_hold ? 'Yes' : 'No') },
  { field: 'description', headerName: 'Description', render: (p) => p.description ?? '—' },
];
