import type { QuotationPricing } from '@sinnapi/ui';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';
import QuotationQuoteCard from './QuotationQuoteCard';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  isEditable: boolean;
};

/**
 * The quote itself, full width and alone.
 *
 * One card rather than a grid, and deliberately: while the quote is editable
 * this is the builder — a form of priced line rows that needs every pixel it
 * can get, and putting a second card beside it would squeeze the description
 * and unit-price fields into a column they do not fit. Once sent it is the
 * breakdown, which is a table with the same appetite for width.
 */
export default function QuoteSection({ quotation, items, pricing, isEditable }: Props) {
  return (
    <QuotationQuoteCard
      quotation={quotation}
      items={items}
      pricing={pricing}
      isEditable={isEditable}
    />
  );
}
