import { useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Pagination, QueryState, Stack } from '@sinnapi/ui';
import { OfferGrid } from '@sinnapi/ui/offers';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import type { PublicOfferModel } from '@/lib/types';
import OfferVendorLine from '../molecules/OfferVendorLine';
import OfferPackageLine from '../molecules/OfferPackageLine';

type Props = {
  offers: PublicOfferModel[];
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  pendingScroll: boolean;
  onScrolled: () => void;
  isLoading: boolean;
  isRefreshing: boolean;
  error: unknown;
  isFiltered: boolean;
};

/**
 * The grid, and how a client moves through it.
 *
 * The cards are the shared `OfferGrid` — the same one the marketing site
 * renders — with the vendor line and the package line supplied as slots. That
 * split is what lets the two apps show the same offer with different framing:
 * a signed-out visitor gets a sign-in route, a client gets a link into the
 * profile they can act on.
 *
 * PAGING SCROLLS BACK TO THE TOP, BUT ONLY WHEN THE CLIENT ASKED
 * A page change leaves the reader at the bottom of the previous page looking at
 * the last card of the new one, which reads as nothing having happened. The
 * scroll is driven by an explicit flag rather than by the page number so that
 * arriving on `?page=2` from a shared link does not yank the view — the client
 * did not press anything, and a page that scrolls itself on load is a page that
 * feels broken.
 */
export default function OffersResults({
  offers,
  page,
  pageCount,
  onPage,
  pendingScroll,
  onScrolled,
  isLoading,
  isRefreshing,
  error,
  isFiltered,
}: Props) {
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pendingScroll) return;
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onScrolled();
  }, [pendingScroll, onScrolled]);

  return (
    <Box ref={topRef}>
      <QueryState isLoading={isLoading} error={error}>
        <Box
          sx={{
            // Dimmed rather than replaced while a new page loads: the grid stays
            // in place, so paging reads as paging rather than as a fresh load.
            opacity: isRefreshing ? 0.55 : 1,
            transition: (t) => t.transitions.create('opacity'),
            pointerEvents: isRefreshing ? 'none' : 'auto',
          }}
        >
          <OfferGrid
            offers={offers}
            columns={3}
            emptyTitle={isFiltered ? 'No offers match those filters' : 'No offers running today'}
            emptyBody={
              isFiltered
                ? 'Try a different category, or clear the filters to see everything on offer.'
                : 'Nothing is on offer right now. Campaigns open and close through the season — check back, or browse vendors and ask for a quote.'
            }
            renderEyebrow={(offer) => <OfferVendorLine offer={offer} />}
            renderPrice={(offer) => <OfferPackageLine offer={offer} />}
            renderAction={(offer) => (
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                to={`/discover/vendors/${offer.vendor_slug}?tab=packages`}
                startIcon={<StorefrontOutlinedIcon />}
              >
                View packages
              </Button>
            )}
          />
        </Box>

        {pageCount > 1 && (
          <Stack alignItems="center" sx={{ mt: 4 }}>
            <Pagination
              // MUI pages from 1; the URL and the RPC offset page from 0.
              count={pageCount}
              page={page + 1}
              onChange={(_, next) => onPage(next - 1)}
              color="primary"
              shape="rounded"
              // Compact on a phone: the default sibling count renders nine
              // controls, which wrap into two rows at 360px.
              siblingCount={0}
            />
          </Stack>
        )}
      </QueryState>
    </Box>
  );
}
