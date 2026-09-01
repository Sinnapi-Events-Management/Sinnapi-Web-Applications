import { Button } from '@sinnapi/ui';
import { OfferStrip } from '@sinnapi/ui/offers';
import { useVendorOffers } from '../../hooks/useVendorOffers';

type Props = {
  vendorId: string;
  /** Opens the Offers section, where the terms and coverage are. */
  onSeeOffers: () => void;
};

/**
 * What this vendor is running, above the tab bar.
 *
 * ABOVE THE TABS, NOT ONLY IN ONE
 * An offer is not a section of a profile — it is a fact about every price on
 * it. The Offers tab carries the full terms, but a visitor who never opens it
 * would read the vendor's list prices as the prices, so the claim itself sits
 * where nobody can miss it. It sits under the identity block for the same
 * reason the engage panel does: both are things the page is asking the reader
 * to act on rather than things it is telling them.
 *
 * Renders nothing when the vendor has no offers. A profile is not incomplete
 * for having no sale on, and an empty "Current offers" heading implies one is
 * missing. It also renders nothing while the read is in flight or after it
 * fails: a skeleton here would reserve space above the fold for something that
 * usually does not exist, pushing the tab bar down on every profile, and a
 * failed offers read is a page with correct list prices rather than a broken
 * one.
 *
 * The action opens the Offers section rather than jumping to Packages. A strip
 * row can show the claim but not what it covers or what the booking has to be
 * worth, and sending a reader from a percentage straight to a price skips the
 * two facts most likely to make it not apply to them.
 */
export default function VendorOffersStrip({ vendorId, onSeeOffers }: Props) {
  const { offers, hasOffers } = useVendorOffers(vendorId);

  if (!hasOffers) return null;

  return (
    <OfferStrip
      offers={offers}
      renderAction={() => (
        <Button size="small" variant="outlined" color="success" onClick={onSeeOffers}>
          See terms
        </Button>
      )}
    />
  );
}
