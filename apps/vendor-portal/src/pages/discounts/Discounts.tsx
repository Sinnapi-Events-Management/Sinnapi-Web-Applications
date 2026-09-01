import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import DiscountsWorkspace from './components/organisms/DiscountsWorkspace';

/**
 * A vendor's discount codes.
 *
 * A DISCOUNT is the code that prices an offer. A PROMOTION is the campaign
 * clients see. That split is the shape of this screen: nothing here writes
 * artwork or a headline, and a code that belongs to a campaign says so and
 * rolls its redemptions up into it — through the same `promotion_id` the
 * Promotions screen reads back. The vendor sees one number for what an offer
 * returned, wherever they look at it.
 *
 * The state a code is really in is derived rather than stored. `is_active`
 * alone would call a code that expired last February "Active" forever, and
 * would say the same of one that hit the last of its fifty redemptions this
 * morning — so Live, Scheduled, Fully redeemed, Paused and Ended are resolved
 * from the flag, the window and the cap together. See `schema/discountStatus`.
 *
 * The page itself is a title and a gate. Everything below it lives in
 * `DiscountsWorkspace`, which is mounted only once a vendor id exists — so no
 * hook underneath has to defend against not having one.
 */
export default function Discounts() {
  return (
    <>
      <PageTitle
        title="Discounts"
        subtitle="Price your offers with codes clients redeem, and see how far each one went."
      />
      <VendorGate>{(vendorId) => <DiscountsWorkspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}
