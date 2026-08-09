import { Chip, type DataTableColumn } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { DiscountModel } from '@/lib/types';

/**
 * Columns for the vendor's discount codes.
 *
 * Value renders against its own type — a percentage discount and a fixed
 * amount are different units, and showing "10" for both would be ambiguous.
 * Active/inactive is a plain boolean rather than a workflow status, so it uses
 * a Chip directly instead of <StatusChip />.
 */
export const discountColumns: DataTableColumn<DiscountModel>[] = [
  { field: 'code', headerName: 'Code', sortable: true, render: (d) => d.code ?? '—' },
  {
    field: 'value',
    headerName: 'Value',
    sortable: true,
    render: (d) => (d.type === 'percentage' ? `${d.value}%` : formatMoney(d.value, d.currency)),
  },
  {
    field: 'used_count',
    headerName: 'Uses',
    sortable: true,
    render: (d) => `${d.used_count}${d.max_uses ? ` / ${d.max_uses}` : ''}`,
  },
  {
    field: 'starts_at',
    headerName: 'Window',
    sortable: true,
    render: (d) => `${formatDate(d.starts_at)} – ${formatDate(d.ends_at)}`,
  },
  {
    field: 'is_active',
    headerName: 'Status',
    sortable: true,
    render: (d) => (
      <Chip
        size="small"
        label={d.is_active ? 'Active' : 'Inactive'}
        color={d.is_active ? 'success' : 'default'}
      />
    ),
  },
];
