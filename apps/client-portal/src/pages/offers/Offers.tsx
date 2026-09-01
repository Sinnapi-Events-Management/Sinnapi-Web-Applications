import { PageTitle } from '@sinnapi/ui';
import OffersToolbar from './components/organisms/OffersToolbar';
import OffersResults from './components/organisms/OffersResults';
import { useOffers } from './hooks/useOffers';

/**
 * Every saving running on the platform right now.
 *
 * THE ACQUISITION SURFACE, ON THE INSIDE
 * A client planning an event is spending more than they want to. A page that
 * says which vendors are currently cheaper than usual is the most directly
 * useful screen this portal can offer them, and it is the one thing the old
 * promotions tables made impossible: a vendor could author a campaign and no
 * client surface anywhere could read it.
 *
 * Only offers with a published package behind them appear — `search_public_offers`
 * enforces that. A saving a client cannot click through to is a card that wastes
 * their time, and a directory of those is worse than a shorter directory.
 *
 * The page is composition only: `useOffers` owns the URL-mirrored filters, the
 * debounce and the paging, and the two organisms own their own layout.
 */
export default function Offers() {
  const state = useOffers();

  return (
    <>
      <PageTitle
        title="Offers"
        subtitle="Live savings from vendors on Sinnapi. Every one ends on a date — the deadline is on the card."
      />

      <OffersToolbar
        search={state.search}
        onSearch={state.setSearch}
        categoryId={state.categoryId}
        onCategory={state.setCategory}
        categoryOptions={state.categoryOptions}
        isFiltered={state.isFiltered}
        onClear={state.clearFilters}
        total={state.total}
      />

      <OffersResults
        offers={state.offers}
        page={state.page}
        pageCount={state.pageCount}
        onPage={state.goToPage}
        pendingScroll={state.pendingScroll}
        onScrolled={state.clearPendingScroll}
        isLoading={state.isLoading}
        isRefreshing={state.isRefreshing}
        error={state.error}
        isFiltered={state.isFiltered}
      />
    </>
  );
}
