import { useMemo } from 'react';
import { Alert, DataTable, ListToolbar } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useQuotations } from '../../hooks/useQuotations';
import { quotationColumns } from '../../schema';
import QuickViewTabs from '@/components/list/QuickViewTabs';
import QuotationCard from '../molecules/QuotationCard';

/** The quote-request list for one vendor, mounted by <VendorGate />. */
export default function QuotationsTable({ vendorId }: { vendorId: string }) {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    table,
    openQuotation,
    clientName,
    namesLoading,
    bookingFor,
    list,
    facetCounts,
    quickTabs,
  } = useQuotations(vendorId);
  const columns = useMemo(
    () => quotationColumns({ clientName, bookingFor }),
    [clientName, bookingFor],
  );

  return (
    <>
      <QuickViewTabs
        tabs={quickTabs.tabs}
        active={quickTabs.active}
        onSelect={quickTabs.select}
        counts={quickTabs.counts}
        ariaLabel="Quote views"
      />
      <ListToolbar list={list} counts={facetCounts} resultCount={total} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load quotations.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(q) => q.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(q) => openQuotation(q.id)}
        renderCard={(q) => (
          <QuotationCard
            quotation={q}
            clientName={namesLoading ? null : clientName(q.client_id)}
            booking={bookingFor(q.id)}
            onOpen={() => openQuotation(q.id)}
          />
        )}
        emptyMessage={
          list.isFiltered ? (
            <EmptyState
              embedded
              title={
                quickTabs.active && quickTabs.active !== 'all' ? 'All caught up' : 'No quotes match'
              }
              description={
                quickTabs.active && quickTabs.active !== 'all'
                  ? 'Nothing is waiting here right now.'
                  : 'Try a different search, or show all your quotes.'
              }
              ctaLabel="Show all quotes"
              onCta={() => {
                list.clearAll();
                quickTabs.select('all');
              }}
            />
          ) : (
            <EmptyState
              embedded
              title="No quote requests yet"
              description="When clients request quotes, they'll appear here for you to build and send."
            />
          )
        }
        {...table.controls}
      />
    </>
  );
}
