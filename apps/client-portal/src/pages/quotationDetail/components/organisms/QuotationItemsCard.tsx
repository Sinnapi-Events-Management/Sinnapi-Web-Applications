import { QuotationLineItems, SectionCard, Typography, type QuotationPricing } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { QuotationItemModel } from '@/lib/types';

type Props = {
  items: QuotationItemModel[];
  pricing: QuotationPricing;
};

/**
 * What the price actually buys, line by line, and how those lines add up.
 *
 * An unpriced quote gets a sentence instead of an empty table with a zero
 * under it. "The vendor has not built this yet" is a state worth naming — it
 * tells the client the ball is not in their court, which an empty grid does
 * not.
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
          The vendor has not priced this request yet. You will be notified when their quote arrives.
        </Typography>
      ) : (
        <QuotationLineItems items={items} pricing={pricing} />
      )}
    </SectionCard>
  );
}
