import { useMemo } from 'react';
import { Alert, Box, DataTable, Pagination, SearchField, Stack, Typography } from '@sinnapi/ui';
import QuickViewTabs from '@/components/list/QuickViewTabs';
import { daysFromToday } from '@/lib/bookingCopy';
import { EmptyState } from '@sinnapi/ui/router';
import {
  DocumentListCard,
  DocumentStatusChip,
  INVOICE_FILTERS,
  documentErrorMessage,
  formatDocumentDate,
  formatDocumentMoney,
  invoiceDisplayStatus,
  toAmount,
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
        <QuickViewTabs<InvoiceFilter>
          tabs={INVOICE_FILTERS}
          active={list.filter}
          onSelect={list.setFilter}
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
              // The invoice's full amount — the card used to show what was
              // still owed, so a paid invoice read "UGX 0".
              amount={formatDocumentMoney(r.total, r.currency)}
              meta={
                <>
                  {r.title && (
                    <Box
                      component="span"
                      sx={{
                        display: 'block',
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.title}
                    </Box>
                  )}
                  {r.status === 'draft'
                    ? 'Draft — not sent yet'
                    : `Due ${formatDocumentDate(r.due_date)}`}
                </>
              }
              chip={
                <DocumentStatusChip
                  kind="invoice"
                  status={invoiceDisplayStatus(r.status, r.due_date, list.today)}
                />
              }
              footer={<OwedLine row={r} />}
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

/** "UGX 599,962 still owed" (red when late) or "Paid in full". */
function OwedLine({
  row,
}: {
  row: { status: string; balance_due: unknown; currency: string; due_date: string | null };
}) {
  if (row.status === 'draft' || row.status === 'void') return null;
  const owed = toAmount(row.balance_due as never);
  if (owed <= 0) {
    return (
      <Typography variant="body2" fontWeight={700} color="success.main">
        Paid in full
      </Typography>
    );
  }
  const late = (daysFromToday(row.due_date) ?? 0) < 0;
  return (
    <Typography variant="body2" fontWeight={700} color={late ? 'error.main' : 'secondary.dark'}>
      {formatDocumentMoney(owed, row.currency)} still owed{late ? ' · late' : ''}
    </Typography>
  );
}
