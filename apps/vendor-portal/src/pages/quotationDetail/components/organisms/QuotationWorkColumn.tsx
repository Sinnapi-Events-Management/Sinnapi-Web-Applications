import { Stack } from '@sinnapi/ui';
import type { QuotationPricing } from '@sinnapi/ui';
import type {
  DirectoryProfile,
  EventRefModel,
  QuotationDetailModel,
  QuotationItemModel,
} from '@/lib/types';
import QuotationRequestCard from './QuotationRequestCard';
import QuotationQuoteCard from './QuotationQuoteCard';
import QuotationFactsCard from './QuotationFactsCard';

type Props = {
  quotation: QuotationDetailModel;
  client: DirectoryProfile | null;
  event: EventRefModel | null;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  isEditable: boolean;
};

/**
 * The wide column: the work. What the client asked for, what was quoted back,
 * and then the record.
 *
 * Its own component rather than a block inside the page so that adding a
 * section to this side is a change to this file, and the page keeps saying only
 * how the two columns sit next to each other.
 */
export default function QuotationWorkColumn({
  quotation,
  client,
  event,
  items,
  pricing,
  isEditable,
}: Props) {
  return (
    <Stack spacing={3}>
      {quotation.request_details && (
        <QuotationRequestCard requestDetails={quotation.request_details} />
      )}
      <QuotationQuoteCard
        quotation={quotation}
        items={items}
        pricing={pricing}
        isEditable={isEditable}
      />
      <QuotationFactsCard quotation={quotation} client={client} event={event} />
    </Stack>
  );
}
