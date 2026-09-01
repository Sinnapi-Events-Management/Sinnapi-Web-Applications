import type { QuotationPricing } from '@sinnapi/ui';
import type { QuotationDetailModel, QuotationItemModel, QuotationOfferModel } from '@/lib/types';
import QuotationItemsCard from './QuotationItemsCard';
import PackageOrderStatusCallout from '../molecules/PackageOrderStatusCallout';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  /** The promotion this quote was priced with, when there was one. */
  offer: QuotationOfferModel | null;
  vendorName: string | null;
};

/**
 * What the price actually buys, full width and alone.
 *
 * One card rather than a grid: the breakdown is a table of priced rows, and a
 * second card beside it would take exactly the width the descriptions need
 * before they start wrapping mid-phrase.
 *
 * The card names its own empty case — an unpriced quote gets a sentence saying
 * the vendor has not answered yet — so the section never needs to.
 *
 * A PACKAGE ORDER gets a callout above it, because the breakdown alone reads
 * ambiguously on that flow: the price is final and the status is `requested`,
 * and nothing about a table of priced rows says which of the two to believe.
 * The callout renders nothing on an ordinary quote.
 */
export default function QuoteSection({ quotation, items, pricing, offer, vendorName }: Props) {
  return (
    <>
      <PackageOrderStatusCallout quotation={quotation} vendorName={vendorName} />
      <QuotationItemsCard items={items} pricing={pricing} offer={offer} />
    </>
  );
}
