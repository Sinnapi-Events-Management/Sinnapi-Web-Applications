import { useMemo } from 'react';
import { Alert, DataTable, ListToolbar, PageTitle } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useQuotations } from './hooks/useQuotations';
import { quotationColumns } from './schema';
import CompareQuotesAction from './components/molecules/CompareQuotesAction';

export default function Quotations() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    table,
    list,
    facetCounts,
    bookingFor,
    openQuotation,
    openBookingForm,
  } = useQuotations();

  const columns = useMemo(
    () => quotationColumns({ bookingFor, onBook: openBookingForm }),
    [bookingFor, openBookingForm],
  );

  return (
    <>
      <PageTitle
        title="Quotations"
        subtitle="Open a quote to see what it covers, then accept, send it back or void it. Once accepted, create the booking to lock in your date."
        action={<CompareQuotesAction />}
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
        emptyMessage={
          list.isFiltered ? (
            <EmptyState
              embedded
              title="No quotations match"
              description="Try a different search, or clear the filters to see every quote."
              ctaLabel="Clear search and filters"
              onCta={list.clearAll}
            />
          ) : (
            <EmptyState
              embedded
              title="No quotations yet"
              description="Request a quote from a vendor to get started."
              ctaLabel="Discover vendors"
              ctaHref="/discover"
            />
          )
        }
        {...table.controls}
      />
    </>
  );
}
