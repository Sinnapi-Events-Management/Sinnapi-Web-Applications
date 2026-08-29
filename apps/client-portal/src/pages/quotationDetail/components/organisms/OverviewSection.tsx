import { SectionGrid } from '@sinnapi/ui';
import type { EventRefModel, QuotationDetailModel, VendorRefModel } from '@/lib/types';
import QuotationFactsCard from './QuotationFactsCard';
import QuotationNextStepsCard from './QuotationNextStepsCard';

type Props = {
  quotation: QuotationDetailModel;
  vendor: VendorRefModel | null;
  event: EventRefModel | null;
  onMessageVendor: () => void;
  isMessaging: boolean;
};

/**
 * The default section: what this quote is, and where to go from here.
 *
 * The facts take the wider track — they are a list of labelled rows including
 * the client's own request, which is prose — and the links beside them are
 * three buttons that read fine narrow.
 *
 * "Next steps" is here rather than in the pinned bar above the tabs, and that
 * separation is the same one the old two-column page made: this card is
 * navigation and correspondence, nothing on it changes the quotation. The bar
 * holds the controls that do. Keeping them apart is what stops someone
 * reaching for "Message vendor" and hitting a decline.
 *
 * This is also where the hero's condensed mobile view sends its missing facts:
 * the valid-until date, the event and the sent stamp are all rows on the facts
 * card, so nothing dropped from the phone hero is actually lost.
 */
export default function OverviewSection({
  quotation,
  vendor,
  event,
  onMessageVendor,
  isMessaging,
}: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <QuotationFactsCard quotation={quotation} event={event} />
      <QuotationNextStepsCard
        vendorId={quotation.vendor_id}
        vendor={vendor}
        onMessageVendor={onMessageVendor}
        isMessaging={isMessaging}
      />
    </SectionGrid>
  );
}
