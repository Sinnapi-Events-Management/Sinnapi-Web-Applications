import { Stack, type QuotationAdvanceSplit, type QuotationPricing } from '@sinnapi/ui';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';
import QuotationQuoteCard from './QuotationQuoteCard';
import PackageOrderCard from './PackageOrderCard';
import QuotationAdvanceTermsCard from './QuotationAdvanceTermsCard';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  advance: QuotationAdvanceSplit;
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
export default function QuoteSection({ quotation, items, pricing, advance }: Props) {
  if (quotation.quote_origin === 'package' && quotation.status === 'requested') {
    return <PackageOrderCard quotation={quotation} items={items} pricing={pricing} />;
  }

  // What was priced, then how it gets paid — the old Payment tab, folded in
  // because both showed the same total.
  return (
    <Stack spacing={3}>
      <QuotationQuoteCard quotation={quotation} items={items} pricing={pricing} />
      {advance.hasTerms && (
        <QuotationAdvanceTermsCard
          pricing={pricing}
          advance={advance}
          daysBefore={quotation.advance_release_days_before}
        />
      )}
    </Stack>
  );
}
