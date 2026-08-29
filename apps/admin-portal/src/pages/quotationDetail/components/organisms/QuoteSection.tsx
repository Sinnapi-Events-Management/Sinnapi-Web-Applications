import type { QuotationPricing } from '@sinnapi/ui';
import type { QuotationItem } from '@/lib/types';
import QuotationItemsCard from './QuotationItemsCard';

type Props = {
  items: QuotationItem[];
  pricing: QuotationPricing;
};

/**
 * What the quote actually prices, full width and alone.
 *
 * One card rather than a grid: the breakdown is a table of priced rows, and a
 * second card beside it would take exactly the width the descriptions need
 * before they start wrapping mid-phrase — which is the wrong thing to do to the
 * document an operator is reading a figure off during a dispute.
 *
 * The card names its own empty case, so the section never needs to.
 */
export default function QuoteSection({ items, pricing }: Props) {
  return <QuotationItemsCard items={items} pricing={pricing} />;
}
