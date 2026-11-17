import { QuotationLineItems, SectionCard, Typography, type QuotationPricing } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
};

/**
 * The quote as sent, read-only. Building and updating happen in the
 * step-by-step builder opened from the "What to do now" card.
 */
export default function QuotationQuoteCard({ quotation, items, pricing }: Props) {
  return (
    <SectionCard
      title={pricing.isPriced ? 'Your quote' : 'Not priced yet'}
      icon={<ReceiptLongIcon />}
      subtitle={
        pricing.isPriced ? `${items.length} item${items.length === 1 ? '' : 's'}` : undefined
      }
    >
      {pricing.isPriced ? (
        <QuotationLineItems items={items} pricing={pricing} totalLabel="The client pays" />
      ) : (
        <Typography variant="body2" color="text.secondary">
          {['requested', 'draft'].includes(quotation.status)
            ? 'You have not sent a price yet. Use "Price this request" at the top of the page.'
            : 'This request was closed before a quote was built for it.'}
        </Typography>
      )}
    </SectionCard>
  );
}
