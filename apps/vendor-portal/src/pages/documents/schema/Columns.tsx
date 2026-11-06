import { Typography, type DataTableColumn } from '@sinnapi/ui';
import {
  DocumentStatusChip,
  RECEIPT_METHOD_LABELS,
  formatDocumentDate,
  formatDocumentMoney,
  formatOwed,
  invoiceDisplayStatus,
  toAmount,
} from '@sinnapi/ui/documents';
import type { InvoiceListRow, ReceiptListRow } from '@/hooks/documentQueries';

export function invoiceColumns(today: string): DataTableColumn<InvoiceListRow>[] {
  return [
    {
      field: 'document_no',
      headerName: 'Number',
      sortable: true,
      render: (r) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {r.document_no ?? 'Draft'}
        </Typography>
      ),
    },
    {
      field: 'recipient_name',
      headerName: 'Client',
      sortable: true,
      render: (r) => r.recipient_name || '—',
    },
    {
      field: 'issue_date',
      headerName: 'Issued',
      sortable: true,
      render: (r) => formatDocumentDate(r.issue_date),
    },
    {
      field: 'due_date',
      headerName: 'Due',
      sortable: true,
      render: (r) => formatDocumentDate(r.due_date),
    },
    {
      field: 'total',
      headerName: 'Total',
      align: 'right',
      sortable: true,
      render: (r) => (toAmount(r.total) ? formatDocumentMoney(r.total, r.currency) : '—'),
    },
    {
      field: 'balance_due',
      headerName: 'Still owed',
      align: 'right',
      sortable: true,
      render: (r) =>
        r.status === 'draft' || r.status === 'void' ? '—' : formatOwed(r.balance_due, r.currency),
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

export function receiptColumns(): DataTableColumn<ReceiptListRow>[] {
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
    {
      field: 'recipient_name',
      headerName: 'Received from',
      sortable: true,
      render: (r) => r.recipient_name,
    },
    {
      field: 'description',
      headerName: 'For',
      render: (r) => r.vendor_invoices?.document_no ?? r.description,
    },
    {
      field: 'payment_date',
      headerName: 'Date',
      sortable: true,
      render: (r) => formatDocumentDate(r.payment_date),
    },
    {
      field: 'payment_method',
      headerName: 'Method',
      render: (r) => RECEIPT_METHOD_LABELS[r.payment_method],
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
