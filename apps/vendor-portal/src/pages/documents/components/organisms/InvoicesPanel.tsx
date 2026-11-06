import { useMemo } from 'react';
import { Alert, Box, DataTable, Pagination, SearchField, Stack, StatusTabs } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import {
  DocumentListCard,
  DocumentStatusChip,
  INVOICE_FILTERS,
  documentErrorMessage,
  formatDocumentDate,
  formatOwed,
  invoiceDisplayStatus,
  type InvoiceFilter,
} from '@sinnapi/ui/documents';
import { useInvoiceList } from '../../hooks/useDocumentList';
import { invoiceColumns } from '../../schema';

/** The invoice list: filter tabs, search, then a table (desktop) or cards (phone). */
export default function InvoicesPanel({ vendorId }: { vendorId: string }) {
  const list = useInvoiceList(vendorId);
  const columns = useMemo(() => invoiceColumns(list.today), [list.today]);
  const pages = Math.max(1, Math.ceil(list.total / list.table.controls.pageSize));

  const empty = (
    <EmptyState
      embedded
      title={list.debounced || list.filter !== 'all' ? 'No invoices match' : 'No invoices yet'}
      description={
        list.debounced || list.filter !== 'all'
          ? 'Try another filter or search.'
          : 'Create an invoice for a Sinnapi client or anyone else you work with.'
      }
      ctaLabel={list.debounced || list.filter !== 'all' ? undefined : 'New invoice'}
      ctaHref={list.debounced || list.filter !== 'all' ? undefined : '/invoices/new'}
    />
  );

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
      >
        <StatusTabs<InvoiceFilter>
          options={INVOICE_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          value={list.filter}
          onChange={list.setFilter}
          ariaLabel="Filter invoices"
        />
        <SearchField
          value={list.search}
          onChange={list.setSearch}
          placeholder="Number, client or what it was for"
          ariaLabel="Search invoices"
          size="small"
          sx={{ minWidth: { md: 300 } }}
        />
      </Stack>

      {list.error && (
        <Alert severity="error">
          {documentErrorMessage(list.error, 'Invoices could not be loaded.')}
        </Alert>
      )}

      {list.compact ? (
        <Stack spacing={1.25}>
          {!list.isLoading && list.rows.length === 0 && empty}
          {list.rows.map((r) => (
            <DocumentListCard
              key={r.id}
              title={r.recipient_name || 'Untitled client'}
              amount={r.status === 'draft' ? '—' : formatOwed(r.balance_due, r.currency)}
              meta={`${r.document_no ?? 'Draft'} · due ${formatDocumentDate(r.due_date)}`}
              chip={
                <DocumentStatusChip
                  kind="invoice"
                  status={invoiceDisplayStatus(r.status, r.due_date, list.today)}
                />
              }
              onClick={() => list.open(r.id, r.status)}
            />
          ))}
          {pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Pagination
                count={pages}
                page={list.table.controls.page + 1}
                onChange={(_, p) => list.table.controls.onPageChange(p - 1)}
              />
            </Box>
          )}
        </Stack>
      ) : (
        <DataTable
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          rowCount={list.total}
          loading={list.isLoading || list.isFetching}
          onRowClick={(r) => list.open(r.id, r.status)}
          emptyMessage={empty}
          {...list.table.controls}
        />
      )}
    </Stack>
  );
}
