import { Avatar, Stack, Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type {
  BookingModel,
  QuotationModel,
  EventModel,
  EngagedVendor,
  VendorRef,
} from '@/lib/types';

const mono = { fontFamily: 'ui-monospace, monospace' } as const;

/** Supabase embeds a to-one relation as an object or a single-item array. */
function vendorName(value: VendorRef | VendorRef[] | null): string {
  const ref = Array.isArray(value) ? value[0] : value;
  return ref?.business_name ?? '—';
}

function initials(name: string | null): string {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export const bookingColumns: DataTableColumn<BookingModel>[] = [
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (b) => (
      <Typography variant="body2" sx={mono}>
        {b.reference_no ?? '—'}
      </Typography>
    ),
  },
  { field: 'vendors', headerName: 'Vendor', render: (b) => vendorName(b.vendors) },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (b) => <StatusChip status={b.status} />,
  },
  {
    field: 'event_date',
    headerName: 'Event date',
    sortable: true,
    render: (b) => formatDate(b.event_date),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    sortable: true,
    align: 'right',
    render: (b) => formatMoney(b.amount, b.currency),
  },
];

export const quotationColumns: DataTableColumn<QuotationModel>[] = [
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (q) => (
      <Typography variant="body2" sx={mono}>
        {q.reference_no ?? '—'}
      </Typography>
    ),
  },
  { field: 'vendors', headerName: 'Vendor', render: (q) => vendorName(q.vendors) },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (q) => <StatusChip status={q.status} />,
  },
  {
    field: 'total',
    headerName: 'Total',
    sortable: true,
    align: 'right',
    render: (q) => formatMoney(q.total, q.currency),
  },
  {
    field: 'created_at',
    headerName: 'Created',
    sortable: true,
    render: (q) => formatDate(q.created_at),
  },
];

export const eventColumns: DataTableColumn<EventModel>[] = [
  {
    field: 'title',
    headerName: 'Title',
    sortable: true,
    render: (e) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {e.title}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (e) => <StatusChip status={e.status} />,
  },
  { field: 'source', headerName: 'Source', render: (e) => titleize(e.source) },
  {
    field: 'event_date',
    headerName: 'Event date',
    sortable: true,
    render: (e) => formatDate(e.event_date),
  },
  {
    field: 'created_at',
    headerName: 'Posted',
    sortable: true,
    render: (e) => formatDate(e.created_at),
  },
];

export const vendorColumns: DataTableColumn<EngagedVendor>[] = [
  {
    field: 'business_name',
    headerName: 'Vendor',
    render: (v) => (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={v.profile_image_url ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
          {initials(v.business_name)}
        </Avatar>
        <Typography variant="body2" fontWeight={600} noWrap>
          {v.business_name ?? '—'}
        </Typography>
      </Stack>
    ),
  },
  { field: 'status', headerName: 'Status', render: (v) => <StatusChip status={v.status} /> },
];
