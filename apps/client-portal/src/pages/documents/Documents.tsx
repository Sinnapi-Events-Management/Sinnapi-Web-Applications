import { useMemo } from 'react';
import { Alert, Box, DataTable, PageTitle, Pagination, Stack, StatusTabs } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import {
  DocumentListCard,
  DocumentStatusChip,
  documentErrorMessage,
  formatDocumentDate,
  formatDocumentMoney,
  invoiceDisplayStatus,
} from '@sinnapi/ui/documents';
import { useClientDocuments, type ClientDocumentsTab } from './hooks/useClientDocuments';
import { clientInvoiceColumns, clientReceiptColumns } from './schema/Columns';

const TABS: { value: ClientDocumentsTab; label: string }[] = [
  { value: 'invoices', label: 'Invoices' },
  { value: 'receipts', label: 'Receipts' },
];

function Pager({
  total,
  page,
  pageSize,
  onPage,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const count = Math.ceil(total / pageSize);
  if (count <= 1) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
      <Pagination count={count} page={page + 1} onChange={(_, p) => onPage(p - 1)} />
    </Box>
  );
}

/** `/invoices` — the invoices and receipts vendors have sent this client. */
export default function Documents() {
  const d = useClientDocuments();
  const invoiceColumns = useMemo(() => clientInvoiceColumns(d.today), [d.today]);
  const receiptColumns = useMemo(() => clientReceiptColumns(), []);

  const invoiceRows = d.invoices.data?.rows ?? [];
  const receiptRows = d.receipts.data?.rows ?? [];
  const activeError = d.tab === 'invoices' ? d.invoices.error : d.receipts.error;

  return (
    <>
      <PageTitle
        title="Invoices & Receipts"
        subtitle="What your vendors have billed you, and the payments they have confirmed."
      />
      <Stack spacing={2.5}>
        <StatusTabs<ClientDocumentsTab>
          options={TABS}
          value={d.tab}
          onChange={d.setTab}
          ariaLabel="Invoices or receipts"
        />

        {activeError && (
          <Alert severity="error">
            {documentErrorMessage(activeError, 'These could not be loaded.')}
          </Alert>
        )}

        {d.tab === 'invoices' &&
          (d.compact ? (
            <Stack spacing={1.25}>
              {!d.invoices.isLoading && invoiceRows.length === 0 && (
                <EmptyState
                  embedded
                  title="No invoices yet"
                  description="Invoices your vendors send you will appear here."
                />
              )}
              {invoiceRows.map((r) => (
                <DocumentListCard
                  key={r.id}
                  title={r.vendor_snapshot?.business_name ?? 'Vendor'}
                  amount={
                    r.status === 'void' ? '—' : formatDocumentMoney(r.balance_due, r.currency)
                  }
                  meta={`${r.document_no} · due ${formatDocumentDate(r.due_date)}`}
                  chip={
                    <DocumentStatusChip
                      kind="invoice"
                      status={invoiceDisplayStatus(r.status, r.due_date, d.today)}
                    />
                  }
                  onClick={() => d.openInvoice(r.id)}
                />
              ))}
              <Pager
                total={d.invoices.data?.total ?? 0}
                page={d.invoiceTable.controls.page}
                pageSize={d.invoiceTable.controls.pageSize}
                onPage={d.invoiceTable.controls.onPageChange}
              />
            </Stack>
          ) : (
            <DataTable
              columns={invoiceColumns}
              rows={invoiceRows}
              getRowId={(r) => r.id}
              rowCount={d.invoices.data?.total ?? 0}
              loading={d.invoices.isLoading || d.invoices.isFetching}
              onRowClick={(r) => d.openInvoice(r.id)}
              emptyMessage={
                <EmptyState
                  embedded
                  title="No invoices yet"
                  description="Invoices your vendors send you will appear here."
                />
              }
              {...d.invoiceTable.controls}
            />
          ))}

        {d.tab === 'receipts' &&
          (d.compact ? (
            <Stack spacing={1.25}>
              {!d.receipts.isLoading && receiptRows.length === 0 && (
                <EmptyState
                  embedded
                  title="No receipts yet"
                  description="When a vendor confirms a payment from you, the receipt appears here."
                />
              )}
              {receiptRows.map((r) => (
                <DocumentListCard
                  key={r.id}
                  title={r.vendor_snapshot?.business_name ?? 'Vendor'}
                  amount={formatDocumentMoney(r.amount, r.currency)}
                  meta={`${r.document_no} · ${formatDocumentDate(r.payment_date)}`}
                  chip={<DocumentStatusChip kind="receipt" status={r.status} />}
                  onClick={() => d.openReceipt(r.id)}
                />
              ))}
              <Pager
                total={d.receipts.data?.total ?? 0}
                page={d.receiptTable.controls.page}
                pageSize={d.receiptTable.controls.pageSize}
                onPage={d.receiptTable.controls.onPageChange}
              />
            </Stack>
          ) : (
            <DataTable
              columns={receiptColumns}
              rows={receiptRows}
              getRowId={(r) => r.id}
              rowCount={d.receipts.data?.total ?? 0}
              loading={d.receipts.isLoading || d.receipts.isFetching}
              onRowClick={(r) => d.openReceipt(r.id)}
              emptyMessage={
                <EmptyState
                  embedded
                  title="No receipts yet"
                  description="When a vendor confirms a payment from you, the receipt appears here."
                />
              }
              {...d.receiptTable.controls}
            />
          ))}
      </Stack>
    </>
  );
}
