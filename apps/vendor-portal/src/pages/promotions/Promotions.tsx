import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import PromotionsWorkspace from './components/organisms/PromotionsWorkspace';

/**
 * A vendor's marketing campaigns.
 *
 * A PROMOTION is the offer clients see — a title, artwork, and the dates it
 * runs between. A DISCOUNT is the code that prices it. That split is the shape
 * of this screen: nothing here sets a percentage, and every redemption figure
 * is read from the discount codes attached to a campaign, through the same rows
 * the Discounts screen manages. The vendor sees one number for what a campaign
 * returned, wherever they look at it.
 *
 * The state a campaign is really in is derived rather than stored — `is_active`
 * alone would call a campaign that ended last February "Active" forever — so
 * Live, Scheduled, Paused and Ended are resolved from the flag and the window
 * together. See `schema/promotionStatus`.
 *
 * The page itself is a title and a gate. Everything below it lives in
 * `PromotionsWorkspace`, which is mounted only once a vendor id exists — so no
 * hook underneath has to defend against not having one.
 */
export default function Promotions() {
  return (
    <>
      <PageTitle
        title="Promotions"
        subtitle="Run dated campaigns on your profile, and see what each one brought back."
      />
      <VendorGate>{(vendorId) => <PromotionsWorkspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}
