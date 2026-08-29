import type { QuotationPricing } from '@sinnapi/ui';
import type { QuotationItemModel } from '@/lib/types';
import QuotationItemsCard from './QuotationItemsCard';

type Props = {
  items: QuotationItemModel[];
  pricing: QuotationPricing;
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
 */
export default function QuoteSection({ items, pricing }: Props) {
  return <QuotationItemsCard items={items} pricing={pricing} />;
}
