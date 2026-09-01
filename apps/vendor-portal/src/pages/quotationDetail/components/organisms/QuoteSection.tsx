import type { QuotationPricing } from '@sinnapi/ui';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';
import QuotationQuoteCard from './QuotationQuoteCard';
import PackageOrderCard from './PackageOrderCard';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  isEditable: boolean;
};

/**
 * The quote itself, full width and alone.
 *
 * A package order is the exception and gets its own card — see the branch
 * below. Everything else is one card rather than a grid, and deliberately:
 * while the quote is editable
 * this is the builder — a form of priced line rows that needs every pixel it
 * can get, and putting a second card beside it would squeeze the description
 * and unit-price fields into a column they do not fit. Once sent it is the
 * breakdown, which is a table with the same appetite for width.
 */
export default function QuoteSection({ quotation, items, pricing, isEditable }: Props) {
  // A package order that is still unanswered is not a quote the vendor is
  // building — it is one the client has already priced and is waiting on. The
  // builder would offer controls the server refuses (see migration 0903b), so
  // the approval panel takes its place. Once answered, it is a record like any
  // other quote and the ordinary breakdown resumes.
  if (quotation.quote_origin === 'package' && quotation.status === 'requested') {
    return <PackageOrderCard quotation={quotation} items={items} pricing={pricing} />;
  }

  return (
    <QuotationQuoteCard
      quotation={quotation}
      items={items}
      pricing={pricing}
      isEditable={isEditable}
    />
  );
}
