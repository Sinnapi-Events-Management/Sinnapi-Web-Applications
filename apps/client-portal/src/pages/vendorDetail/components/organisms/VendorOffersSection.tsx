import { Button, QueryState } from '@sinnapi/ui';
import { OfferGrid } from '@sinnapi/ui/offers';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import VendorSectionHeading from '../atoms/VendorSectionHeading';
import OfferCoverageLine from '../molecules/OfferCoverageLine';
import OfferEventWindow from '../molecules/OfferEventWindow';
import { useVendorOffers } from '../../hooks/useVendorOffers';

type Props = {
  vendorId: string;
  vendorName: string;
  /** Switches the profile to the Packages tab, where the saving is priced. */
  onSeePackages: () => void;
};

/**
 * Every saving this vendor is running, in full.
 *
 * WHY A SECTION AS WELL AS THE STRIP
 * They are the same offers at two depths, and the depth is the point. The strip
 * above the tabs exists so nobody reads the list prices as the prices; it fits
 * one line per offer and can only carry the claim, the deadline and the code.
 * Everything that turns a saving into a decision — what it covers, what the
 * booking has to be worth, what the vendor's own terms say, which event dates
 * qualify — does not fit on that line, and a client who acts without it is the
 * client who arrives at checkout having chosen a tier the offer never touched.
 *
 * Directly after Packages in the tab order for the same reason it is not merged
 * into that tab: an offer is a fact ABOUT a price, so it belongs next to the
 * prices, but a package card and an offer card answer different questions and a
 * tab that interleaved them would answer neither cleanly.
 *
 * The action sends the reader to Packages rather than opening a request. This
 * section says a saving exists and on what terms; the package card is where it
 * is priced against a specific tier, and asking a client to commit before they
 * have seen the number is asking them to trust a percentage.
 *
 * Layout only — `useVendorOffers` owns the read.
 */
export default function VendorOffersSection({ vendorId, vendorName, onSeePackages }: Props) {
  const state = useVendorOffers(vendorId);

  return (
    <section>
      <VendorSectionHeading
        eyebrow="Offers"
        title="Current offers"
        subtitle={`Savings ${vendorName} is running right now. Every one ends on a date — and the terms below are theirs, not ours.`}
      />

      <QueryState isLoading={state.isLoading} error={state.error}>
        <OfferGrid
          offers={state.offers}
          emptyTitle={`${vendorName} has no offers running`}
          emptyBody="Nothing is discounted at the moment, so the prices on their packages are the prices. Campaigns open and close through the season — it is worth checking back before you book."
          renderEyebrow={(offer) => <OfferCoverageLine offer={offer} />}
          renderPrice={(offer) => <OfferEventWindow offer={offer} />}
          renderAction={() => (
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<LocalOfferOutlinedIcon />}
              onClick={onSeePackages}
            >
              See it priced on their packages
            </Button>
          )}
        />
      </QueryState>
    </section>
  );
}
