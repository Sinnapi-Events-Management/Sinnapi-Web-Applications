import { Container } from '@sinnapi/ui/atoms';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import { getServiceCategoryOptions, searchPublicOffers } from '@/lib/queries';
import OffersHero from './organisms/offersHero';
import OffersFilters from './organisms/offersFilters';
import OffersGrid from './organisms/offersGrid';
import OffersPager from './organisms/offersPager';
import {
  OFFERS_PAGE_SIZE,
  parseOffersSearchParams,
  type OffersSearchParams,
} from './utils/searchParams';

/**
 * The public offers directory.
 *
 * FULLY SERVER-RENDERED, WHICH IS THE POINT OF THE PAGE
 * The vendors directory splits across the boundary — server-prefetched, then
 * client-owned — because browsing vendors is exploratory and every filter change
 * should be instant. This page is the opposite: it is arrived at from a search
 * result, scanned once against a deadline, and left for a vendor profile. So
 * every filter is a link and every state is its own URL, which means a crawler
 * can reach `/offers?category=photography` and a person can send it to whoever
 * they are planning with. The only client JavaScript on the page is the grid,
 * and only because `OfferGrid` takes render props.
 *
 * The category key stays in the URL and is resolved to an id here. `search_public_offers`
 * wants a uuid; a uuid in a shared link is a link nobody reads.
 *
 * An unknown category resolves to null rather than to an error — the page shows
 * everything and says so through the unselected chip row, which is a better
 * answer to a stale link than a 404 for a visitor who did nothing wrong.
 */
export default async function OffersContainer({
  searchParams,
}: {
  searchParams: OffersSearchParams;
}) {
  const query = parseOffersSearchParams(searchParams);

  const categories = await getServiceCategoryOptions();
  const categoryId = query.category
    ? (categories.find((entry) => entry.key === query.category)?.id ?? null)
    : null;

  const { offers, total } = await searchPublicOffers({
    q: query.q,
    categoryId,
    limit: OFFERS_PAGE_SIZE,
    offset: query.page * OFFERS_PAGE_SIZE,
  });

  const pageCount = Math.max(1, Math.ceil(total / OFFERS_PAGE_SIZE));

  return (
    <>
      <OffersHero total={total} />

      <Container sx={{ py: { xs: 5, md: 7 } }}>
        <OffersFilters categories={categories} query={query} />
        <OffersGrid offers={offers} isFiltered={Boolean(query.category || query.q)} />
        <OffersPager query={query} pageCount={pageCount} />
      </Container>

      <MarketplaceCta
        title="Found something? Sign in to claim it"
        subtitle="Offers are held for you the moment a vendor prices your quote — and released again if you decide not to go ahead. Create an account to request one, or list your own services and run a campaign of your own."
        primary={{ label: 'Sign in', href: '/sign-in' }}
        secondary={{ label: 'Become a vendor', href: '/apply' }}
      />
    </>
  );
}
