import { Alert, DataTable, PageTitle } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useCompareQuotes } from './hooks/useCompareQuotes';
import { compareQuoteColumns } from './schema';

export default function CompareQuotes() {
  const { rows, total, isLoading, isFetching, error, table, openQuotation } = useCompareQuotes();

  return (
    <>
      <PageTitle
        title="Compare quotations"
        subtitle="Side-by-side comparison of vendor quotes. Open one to see what it covers."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load quotations.'}
        </Alert>
      )}

      <DataTable
        columns={compareQuoteColumns}
        rows={rows}
        getRowId={(q) => q.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(q) => openQuotation(q.id)}
        emptyMessage={
          <EmptyState
            embedded
            title="No quotes to compare"
            description="Quotes vendors have sent you will appear here."
            ctaLabel="Back to quotations"
            ctaHref="/quotations"
          />
        }
        {...table.controls}
      />
    </>
  );
}
