import { QuotationLineItems, SectionCard, Typography, type QuotationPricing } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import QuotationBuilder from '@/components/quotation/QuotationBuilder';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  isEditable: boolean;
};

/**
 * The quote itself — the builder while it is still the vendor's to change, the
 * breakdown once it has gone out.
 *
 * The two are the same card rather than two, because they are the same object
 * at two moments in its life. A vendor arriving here always looks in one place
 * for "what did I quote".
 *
 * A withdrawn quote keeps its breakdown. The record of what was offered is the
 * point of the page after the fact — it is what either side quotes back if the
 * withdrawal is ever questioned.
 */
export default function QuotationQuoteCard({ quotation, items, pricing, isEditable }: Props) {
  return (
    <SectionCard
      title={isEditable ? 'Build & send quote' : 'Quote sent'}
      icon={<ReceiptLongIcon />}
      subtitle={
        isEditable
          ? 'The client sees these numbers as soon as you send'
          : `${items.length} item${items.length === 1 ? '' : 's'}`
      }
    >
      {isEditable ? (
        <QuotationBuilder
          quotationId={quotation.id}
          currency={quotation.currency ?? undefined}
          vendorId={quotation.vendor_id}
          requestedPackageId={quotation.template_id}
          requestedTierId={quotation.template_tier_id}
        />
      ) : pricing.isPriced ? (
        <QuotationLineItems items={items} pricing={pricing} />
      ) : (
        <Typography variant="body2" color="text.secondary">
          This request was closed before a quote was built for it.
        </Typography>
      )}
    </SectionCard>
  );
}
