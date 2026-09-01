import {
  QuotationLineItems,
  SectionCard,
  Stack,
  Typography,
  formatAmount,
  type QuotationPricing,
} from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import type { QuotationItemModel, QuotationOfferModel } from '@/lib/types';

type Props = {
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  /** The promotion this quote was priced with, when there was one. */
  offer: QuotationOfferModel | null;
};

/**
 * What the price actually buys, line by line, and how those lines add up.
 *
 * An unpriced quote gets a sentence instead of an empty table with a zero
 * under it. "The vendor has not built this yet" is a state worth naming — it
 * tells the client the ball is not in their court, which an empty grid does
 * not.
 */
export default function QuotationItemsCard({ items, pricing, offer }: Props) {
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
        <Stack spacing={2.5}>
          {/* Above the table, not inside it. The saving is the reason this
              total is what it is, and a client who reads the figure first has
              already formed a view of the price before the line explaining it
              scrolls past. `status` decides the tense: the offer is only
              claimed once the client accepts. */}
          {offer && pricing.offerDiscount > 0 && (
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: (t) =>
                  alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.35 : 0.28),
                bgcolor: (t) =>
                  alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.13 : 0.06),
              }}
            >
              <LocalOfferRoundedIcon sx={{ color: 'success.main', fontSize: 20 }} />
              <Stack sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                  {offer.status === 'redeemed' ? 'You saved' : 'You will save'}{' '}
                  {formatAmount(pricing.offerDiscount, pricing.currency)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {offer.title}
                  {offer.code ? ` · code ${offer.code}` : ''}
                  {offer.status === 'reserved' && ' — held for you until you answer this quote.'}
                </Typography>
                {offer.terms && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {offer.terms}
                  </Typography>
                )}
              </Stack>
            </Stack>
          )}

          <QuotationLineItems items={items} pricing={pricing} offerLabel={offer?.title} />
        </Stack>
      )}
    </SectionCard>
  );
}
