import { Alert, Box, Pagination, QueryState, Stack, StatusTabs } from '@sinnapi/ui';
import { OfferGrid } from '@sinnapi/ui/offers';
import OfferWithdrawDialog from '@/components/offers/organisms/OfferWithdrawDialog';
import { useVendorOffers } from '../../hooks/useVendorOffers';
import OfferCampaignLine from '../molecules/OfferCampaignLine';
import OfferPerformanceLine from '../molecules/OfferPerformanceLine';
import OfferRunWindow from '../molecules/OfferRunWindow';
import OfferStateHeader from '../molecules/OfferStateHeader';

/**
 * What this vendor is promising the market, and the console's reach over it.
 *
 * WHY THIS TAB EXISTS
 * An offer was the one thing a vendor publishes that could only be moderated
 * from a platform-wide table. An operator investigating a complaint had every
 * other surface in front of them — packages, bookings, payments, reviews — and
 * then had to leave for `/offers` and search by name to find the price claim
 * that was usually the substance of the complaint in the first place.
 *
 * CARDS RATHER THAN THE CONSOLE'S TABLE
 * The same argument that made the packages tab a `PackageShowcase` grid instead
 * of a table: an operator deciding whether a claim is misleading has to read it
 * the way the person complaining read it. `OfferCard` is the component the
 * client portal and the marketing site render, so what is judged here is
 * literally what was published — banner, badge, deadline and all — rather than
 * a normalised admin rendering of it.
 *
 * The columns the console's table has and a card does not are supplied as
 * slots: what it is filed under, how far it reaches, what it has given away,
 * and what state it is in. Nothing is dropped; it is re-laid out for a page
 * that is read across rather than scanned down.
 *
 * Layout only — `useVendorOffers` owns the read, the tab and the three writes.
 */
export default function OffersTab({ vendorId }: { vendorId: string }) {
  const state = useVendorOffers(vendorId);

  return (
    <>
      <StatusTabs
        options={state.tabs}
        value={state.tab}
        onChange={state.setTab}
        ariaLabel="Filter this vendor's offers by state"
      />

      {state.actionError && (
        <Alert severity="error" onClose={state.dismissActionError} sx={{ mb: 2 }}>
          {state.actionError}
        </Alert>
      )}

      <QueryState isLoading={state.isLoading} error={state.error}>
        <Box
          sx={{
            // Dimmed rather than replaced while a filter resolves: the cards
            // stay in place, so switching tabs reads as filtering rather than
            // as the tab reloading from nothing.
            opacity: state.isRefreshing ? 0.55 : 1,
            transition: (t) => t.transitions.create('opacity'),
            pointerEvents: state.isRefreshing ? 'none' : 'auto',
          }}
        >
          <OfferGrid
            offers={state.offers}
            emptyTitle="No offers"
            emptyBody={state.emptyMessage}
            renderEyebrow={(offer) => <OfferCampaignLine offer={offer} />}
            renderPrice={(offer) => (
              // The dates first, then what the offer did with them. The shared
              // deadline chip above goes silent once an offer has ended, and
              // this tab shows ended offers on purpose — see `OfferRunWindow`.
              <Stack spacing={1.25}>
                <OfferRunWindow offer={offer} />
                <OfferPerformanceLine offer={offer} />
              </Stack>
            )}
            renderHeaderAction={(offer) => (
              <OfferStateHeader
                offer={offer}
                busy={state.busyId === offer.discount_id}
                onSuspend={state.requestSuspend}
                onRestore={state.restore}
                onToggleFeatured={state.toggleFeatured}
              />
            )}
          />
        </Box>

        {state.pageCount > 1 && (
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Pagination
              // MUI pages from 1; the RPC offset pages from 0.
              count={state.pageCount}
              page={state.page + 1}
              onChange={(_, next) => state.setPage(next - 1)}
              color="primary"
              shape="rounded"
              siblingCount={0}
            />
          </Stack>
        )}
      </QueryState>

      <OfferWithdrawDialog
        pending={state.pending}
        reason={state.reason}
        onReasonChange={state.setReason}
        busy={state.isSuspending}
        error={state.actionError}
        onConfirm={state.confirmSuspend}
        onCancel={state.cancelSuspend}
      />
    </>
  );
}
