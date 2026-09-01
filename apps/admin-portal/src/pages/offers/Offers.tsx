import { useMemo } from 'react';
import { Alert, Box, DataTable, PageTitle, SearchField, StatusTabs } from '@sinnapi/ui';
import { useAdminOffers } from './hooks/useAdminOffers';
import { offerColumns } from './schema';
import OfferWithdrawDialog from '@/components/offers/organisms/OfferWithdrawDialog';

/**
 * Every promotion and discount code vendors are running, and the console's
 * reach over them.
 *
 * WHY THIS PAGE EXISTS
 * Every other thing a vendor publishes to the market can be taken off it — a
 * package, a review, a message, the vendor themselves. Offers could not be,
 * despite being the one surface whose entire purpose is to make a price claim
 * in public. A vendor advertising "70% off" on a page Google indexes had to be
 * reasoned with rather than stopped.
 *
 * SUSPEND AND FEATURE, NEVER EDIT
 * The console can refuse to carry a claim and can promote a good one. It cannot
 * rewrite what a vendor is selling — the same line the package moderation drew,
 * for the same reason: an offer is a commercial decision that belongs to the
 * business making it.
 *
 * Layout only — `useAdminOffers` owns the read, the tab, the search and the
 * three writes.
 */
export default function Offers() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    emptyMessage,
    tabs,
    tab,
    setTab,
    countsLoading,
    search,
    table,
    busyId,
    actionError,
    dismissActionError,
    pending,
    reason,
    setReason,
    requestSuspend,
    cancelSuspend,
    confirmSuspend,
    restore,
    toggleFeatured,
    openVendor,
    isSuspending,
  } = useAdminOffers();

  const columns = useMemo(
    () =>
      offerColumns({
        busyId,
        onSuspend: requestSuspend,
        onRestore: restore,
        onToggleFeatured: toggleFeatured,
        onOpenVendor: openVendor,
      }),
    [busyId, requestSuspend, restore, toggleFeatured, openVendor],
  );

  return (
    <>
      <PageTitle
        title="Offers"
        subtitle="Promotions and discount codes vendors are showing to clients. Withdraw a claim you cannot stand behind, or feature one worth putting in front of everybody."
      />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={setTab}
        loadingCounts={countsLoading}
        ariaLabel="Filter offers by state"
      />

      <Box sx={{ mb: 2 }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by offer, code, campaign or vendor"
        />
      </Box>

      {actionError && (
        <Alert severity="error" onClose={dismissActionError} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load offers.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(offer) => offer.discount_id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={emptyMessage}
        {...table.controls}
      />

      <OfferWithdrawDialog
        pending={pending}
        reason={reason}
        onReasonChange={setReason}
        busy={isSuspending}
        error={actionError}
        onConfirm={confirmSuspend}
        onCancel={cancelSuspend}
      />
    </>
  );
}
