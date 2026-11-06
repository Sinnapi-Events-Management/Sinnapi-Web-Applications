import { Typography, type DataTableColumn } from '@sinnapi/ui';
import {
  DocumentStatusChip,
  formatDocumentDate,
  formatDocumentMoney,
  invoiceDisplayStatus,
} from '@sinnapi/ui/documents';
import type { ClientInvoiceListRow, ClientReceiptListRow } from '@/hooks/documentQueries';

export function clientInvoiceColumns(today: string): DataTableColumn<ClientInvoiceListRow>[] {
  return [
    {
      field: 'document_no',
      headerName: 'Number',
      sortable: true,
      render: (r) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {r.document_no}
        </Typography>
      ),
    },
    { field: 'vendor', headerName: 'From', render: (r) => r.vendor_snapshot?.business_name ?? '—' },
    { field: 'title', headerName: 'For', render: (r) => r.title ?? '—' },
    {
      field: 'due_date',
      headerName: 'Due',
      sortable: true,
      render: (r) => formatDocumentDate(r.due_date),
    },
    {
      field: 'balance_due',
      headerName: 'You owe',
      align: 'right',
      sortable: true,
      render: (r) => (r.status === 'void' ? '—' : formatDocumentMoney(r.balance_due, r.currency)),
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      render: (r) => (
        <DocumentStatusChip
          kind="invoice"
          status={invoiceDisplayStatus(r.status, r.due_date, today)}
        />
      ),
    },
  ];
}

export function clientReceiptColumns(): DataTableColumn<ClientReceiptListRow>[] {
  return [
    {
      field: 'document_no',
      headerName: 'Number',
      sortable: true,
      render: (r) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {r.document_no}
        </Typography>
      ),
    },
    { field: 'vendor', headerName: 'From', render: (r) => r.vendor_snapshot?.business_name ?? '—' },
    { field: 'description', headerName: 'For', render: (r) => r.description },
    {
      field: 'payment_date',
      headerName: 'Paid on',
      sortable: true,
      render: (r) => formatDocumentDate(r.payment_date),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      align: 'right',
      sortable: true,
      render: (r) => formatDocumentMoney(r.amount, r.currency),
    },
    {
      field: 'status',
      headerName: 'Status',
      render: (r) => <DocumentStatusChip kind="receipt" status={r.status} />,
    },
  ];
}
