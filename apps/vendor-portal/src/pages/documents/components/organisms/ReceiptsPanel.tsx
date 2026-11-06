import { useMemo } from 'react';
import { Alert, Box, DataTable, Pagination, SearchField, Stack } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import {
  DocumentListCard,
  DocumentStatusChip,
  documentErrorMessage,
  formatDocumentDate,
  formatDocumentMoney,
} from '@sinnapi/ui/documents';
import { useReceiptList } from '../../hooks/useDocumentList';
import { receiptColumns } from '../../schema';

/** Every payment the vendor has confirmed, newest first. */
export default function ReceiptsPanel({ vendorId }: { vendorId: string }) {
  const list = useReceiptList(vendorId);
  const columns = useMemo(() => receiptColumns(), []);
  const pages = Math.max(1, Math.ceil(list.total / list.table.controls.pageSize));

  const empty = (
    <EmptyState
      embedded
      title={list.debounced ? 'No receipts match' : 'No receipts yet'}
      description={
        list.debounced
          ? 'Try another search.'
          : 'Record a payment from an invoice, or create a receipt on its own.'
      }
      ctaLabel={list.debounced ? undefined : 'New receipt'}
      ctaHref={list.debounced ? undefined : '/receipts/new'}
    />
  );

  return (
    <Stack spacing={2}>
      <SearchField
        value={list.search}
        onChange={list.setSearch}
        placeholder="Number, client or what it was for"
        ariaLabel="Search receipts"
        size="small"
        sx={{ maxWidth: { md: 360 } }}
      />

      {list.error && (
        <Alert severity="error">
          {documentErrorMessage(list.error, 'Receipts could not be loaded.')}
        </Alert>
      )}

      {list.compact ? (
        <Stack spacing={1.25}>
          {!list.isLoading && list.rows.length === 0 && empty}
          {list.rows.map((r) => (
            <DocumentListCard
              key={r.id}
              title={r.recipient_name}
              amount={formatDocumentMoney(r.amount, r.currency)}
              meta={`${r.document_no} · ${formatDocumentDate(r.payment_date)}`}
              chip={<DocumentStatusChip kind="receipt" status={r.status} />}
              onClick={() => list.open(r.id)}
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
          onRowClick={(r) => list.open(r.id)}
          emptyMessage={empty}
          {...list.table.controls}
        />
      )}
    </Stack>
  );
}
