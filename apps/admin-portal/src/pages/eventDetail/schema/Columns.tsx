import { Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, formatMoney } from '@/lib/config';
import type { EventInterestModel, EventQuotationModel } from '@/lib/types';
import VendorRowActions from '../components/molecules/VendorRowActions';
import VendorCell from '../components/molecules/VendorCell';

const mono = { fontFamily: 'ui-monospace, monospace' } as const;

type DecisionHandlers<Row> = {
  onApprove: (row: Row) => void;
  onReject: (row: Row) => void;
  onMessage: (row: Row) => void;
};

export const interestColumns = ({
  onApprove,
  onReject,
  onMessage,
}: DecisionHandlers<EventInterestModel>): DataTableColumn<EventInterestModel>[] => [
  {
    field: 'business_name',
    headerName: 'Vendor',
    sortable: true,
    render: (r) => (
      <VendorCell name={r.business_name} imageUrl={r.profile_image_url} secondary={r.base_city} />
    ),
  },
  {
    field: 'message',
    headerName: 'Message',
    render: (r) =>
      r.message ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maxWidth: 320,
          }}
        >
          {r.message}
        </Typography>
      ) : (
        '—'
      ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (r) => <StatusChip status={r.status} />,
  },
  {
    field: 'created_at',
    headerName: 'Expressed',
    sortable: true,
    render: (r) => formatDate(r.created_at),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    width: 160,
    render: (r) => (
      <VendorRowActions
        vendorName={r.business_name}
        status={r.status}
        onApprove={() => onApprove(r)}
        onReject={() => onReject(r)}
        onMessage={() => onMessage(r)}
      />
    ),
  },
];

type QuotationHandlers = DecisionHandlers<EventQuotationModel> & {
  onDownload: (row: EventQuotationModel) => void;
  downloadingId: string | null;
};

export const quotationColumns = ({
  onApprove,
  onReject,
  onMessage,
  onDownload,
  downloadingId,
}: QuotationHandlers): DataTableColumn<EventQuotationModel>[] => [
  {
    field: 'business_name',
    headerName: 'Vendor',
    sortable: true,
    render: (r) => <VendorCell name={r.business_name} />,
  },
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (r) => (
      <Typography variant="body2" sx={mono}>
        {r.reference_no ?? '—'}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (r) => <StatusChip status={r.status} />,
  },
  {
    field: 'total',
    headerName: 'Total',
    sortable: true,
    align: 'right',
    render: (r) => formatMoney(r.total, r.currency),
  },
  {
    field: 'sent_at',
    headerName: 'Submitted',
    sortable: true,
    render: (r) => formatDate(r.sent_at ?? r.created_at),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    width: 200,
    render: (r) => (
      <VendorRowActions
        vendorName={r.business_name}
        status={r.status}
        onApprove={() => onApprove(r)}
        onReject={() => onReject(r)}
        onMessage={() => onMessage(r)}
        onDownload={() => onDownload(r)}
        downloading={downloadingId === r.id}
      />
    ),
  },
];
