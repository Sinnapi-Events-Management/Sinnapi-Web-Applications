import { Stack } from '@sinnapi/ui';
import type { QuotationPricing } from '@sinnapi/ui';
import type { EventRefModel, QuotationDetailModel, QuotationItemModel } from '@/lib/types';
import QuotationItemsCard from './QuotationItemsCard';
import QuotationFactsCard from './QuotationFactsCard';
import QuotationTimelineCard from './QuotationTimelineCard';

type Props = {
  quotationId: string;
  quotation: QuotationDetailModel;
  event: EventRefModel | null;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
};

/**
 * The wide column: "what am I being offered".
 *
 * The breakdown comes first because that is what the client opened the page to
 * read; the record and the trail sit under it for anyone checking a detail or
 * asking how the quote got here.
 *
 * Its own component rather than a block inside the page so that adding a
 * section to this side is a change to this file, and the page keeps saying only
 * how the two columns sit next to each other.
 */
export default function QuotationOfferColumn({
  quotationId,
  quotation,
  event,
  items,
  pricing,
}: Props) {
  return (
    <Stack spacing={3}>
      <QuotationItemsCard items={items} pricing={pricing} />
      <QuotationFactsCard quotation={quotation} event={event} />
      <QuotationTimelineCard quotationId={quotationId} status={quotation.status} />
    </Stack>
  );
}
