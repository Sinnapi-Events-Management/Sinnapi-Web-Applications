import { QuotationLineItems, SectionCard, Typography, type QuotationPricing } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { QuotationItem } from '@/lib/types';

type Props = {
  items: QuotationItem[];
  pricing: QuotationPricing;
};

/**
 * What the price actually buys, line by line, and how those lines add up.
 *
 * This is the card the console could not draw at all until
 * `get_quotation_admin` existed: `q_items_rw` admits the client and the vendor
 * owner and nobody else, so an operator adjudicating an argument about a figure
 * could see the total and none of the arithmetic behind it.
 *
 * The renderer is `@sinnapi/ui`'s, shared with both portals, and that is the
 * point — when a vendor calls to argue about a line, the operator should be
 * looking at the screen the vendor is describing, laid out the same way.
 *
 * An unpriced request gets a sentence instead of an empty table with a zero
 * under it. "Never quoted" is a state worth naming: it is the difference
 * between a vendor who offered nothing and one who offered free work.
 */
export default function QuotationItemsCard({ items, pricing }: Props) {
  return (
    <SectionCard
      title="What this covers"
      icon={<ReceiptLongIcon />}
      subtitle={
        pricing.isPriced ? `${items.length} item${items.length === 1 ? '' : 's'}` : undefined
      }
    >
      {!pricing.isPriced ? (
        <Typography variant="body2" color="text.secondary">
          This request was never priced — the vendor built no line items for it, so there is no
          breakdown behind its total.
        </Typography>
      ) : (
        <QuotationLineItems items={items} pricing={pricing} />
      )}
    </SectionCard>
  );
}
